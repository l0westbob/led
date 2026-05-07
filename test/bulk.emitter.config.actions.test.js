import test from "node:test";
import assert from "node:assert/strict";
import { applyBulkEmitterConfiguration } from "../src/application/planner/applyBulkEmitterConfiguration";
import {
  resolveBoardConfigDraft,
  resolveDraftPreserveField,
} from "../src/application/planner/boardConfigState";
import { createBulkEmitterConfigActions } from "../src/application/planner/useCases/bulkEmitterConfigActions";

function createEmitter(id, overrides = {}) {
  return {
    id,
    xMm: 50,
    yMm: 50,
    ledType: "lm301h_cri80_5000k",
    drive: {
      driveMode: "constantVoltage",
      voltageV: 2.75,
      currentA: 0.07,
      temperatureC: 25,
    },
    ...overrides,
  };
}

function createState() {
  return {
    form: {
      ledType: "lm301h_cri80_5000k",
      voltageV: 5.5,
      currentA: 0.14,
      temperatureC: 25,
      seriesCount: 2,
      parallelCount: 2,
      ledCount: 4,
      emitters: [
        createEmitter("emitter-1"),
        createEmitter("emitter-2", {
          ledType: "lm301h_cri80_3500k",
          drive: {
            driveMode: "constantVoltage",
            voltageV: 2.85,
            currentA: 0.08,
            temperatureC: 26,
          },
        }),
        createEmitter("emitter-3"),
      ],
    },
    selectedBoardPlannerEmitterIds: [],
    bulkEmitterConfigModal: { isOpen: false, draft: null },
  };
}

function createActions(state) {
  return createBulkEmitterConfigActions({
    state,
    roundToTwoDecimals: (value) => Math.round(value * 100) / 100,
    resolveBoardConfigDraft,
    resolveDraftPreserveField,
    applyBulkEmitterConfiguration,
  });
}

test("bulk emitter config actions require a selected emitter", () => {
  const state = createState();
  const actions = createActions(state);

  const result = actions.openBulkEmitterConfig();

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "NO_EMITTER_SELECTION");
  assert.equal(state.bulkEmitterConfigModal.isOpen, false);
});

test("bulk emitter config actions open a draft from the primary selection", () => {
  const state = createState();
  state.selectedBoardPlannerEmitterIds = ["emitter-2", "emitter-3"];
  const actions = createActions(state);

  const result = actions.openBulkEmitterConfig();

  assert.equal(result.ok, true);
  assert.equal(state.bulkEmitterConfigModal.isOpen, true);
  assert.deepEqual(
    {
      ledType: state.bulkEmitterConfigModal.draft.ledType,
      driveMode: state.bulkEmitterConfigModal.draft.driveMode,
      voltageV: state.bulkEmitterConfigModal.draft.voltageV,
      currentA: state.bulkEmitterConfigModal.draft.currentA,
      applyLedType: state.bulkEmitterConfigModal.draft.applyLedType,
      applyCurrentA: state.bulkEmitterConfigModal.draft.applyCurrentA,
    },
    {
      ledType: "lm301h_cri80_3500k",
      driveMode: "constantVoltage",
      voltageV: 2.85,
      currentA: 0.08,
      applyLedType: true,
      applyCurrentA: true,
    },
  );
});

test("bulk emitter config actions apply the saved draft only to selected emitters", () => {
  const state = createState();
  state.selectedBoardPlannerEmitterIds = ["emitter-1", "emitter-3"];
  const actions = createActions(state);

  actions.openBulkEmitterConfig();
  actions.updateBulkEmitterConfigDraft("applyLedType", false);
  actions.setBulkEmitterConfigMode("constantCurrent");
  actions.updateBulkEmitterConfigDraft("currentA", 0.12);
  actions.updateBulkEmitterConfigDraft("temperatureC", 31);
  const result = actions.saveBulkEmitterConfig();

  assert.equal(result.ok, true);
  assert.equal(result.data.changedCount, 2);
  assert.equal(state.form.emitters[0].ledType, "lm301h_cri80_5000k");
  assert.equal(state.form.emitters[0].drive.driveMode, "constantCurrent");
  assert.equal(state.form.emitters[0].drive.currentA, 0.12);
  assert.equal(state.form.emitters[0].drive.temperatureC, 31);
  assert.equal(state.form.emitters[1].drive.currentA, 0.08);
  assert.equal(state.form.emitters[2].drive.driveMode, "constantCurrent");
  assert.equal(state.bulkEmitterConfigModal.isOpen, false);
  assert.equal(state.bulkEmitterConfigModal.draft, null);
});

test("bulk emitter config actions reject saving without a draft", () => {
  const state = createState();
  const actions = createActions(state);

  const result = actions.saveBulkEmitterConfig();

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "DRAFT_NOT_FOUND");
});
