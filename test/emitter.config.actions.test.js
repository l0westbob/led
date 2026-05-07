import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveBoardConfigDraft,
  resolveDraftPreserveField,
} from "../src/application/planner/boardConfigState";
import { createEmitterConfigActions } from "../src/application/planner/useCases/emitterConfigActions";

function createEmitter(overrides = {}) {
  return {
    id: "emitter-1",
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
        createEmitter(),
        createEmitter({
          id: "emitter-2",
          ledType: "lm301h_cri80_3500k",
        }),
      ],
    },
    selectedBoardPlannerEmitterId: "",
    emitterConfigModal: { isOpen: false, draft: null },
  };
}

function createActions(state) {
  return createEmitterConfigActions({
    state,
    roundToTwoDecimals: (value) => Math.round(value * 100) / 100,
    resolveBoardConfigDraft,
    resolveDraftPreserveField,
  });
}

test("emitter config actions open a draft from the selected emitter", () => {
  const state = createState();
  const actions = createActions(state);

  const result = actions.openEmitterConfig("emitter-1");

  assert.equal(result.ok, true);
  assert.equal(state.selectedBoardPlannerEmitterId, "emitter-1");
  assert.equal(state.emitterConfigModal.isOpen, true);
  assert.deepEqual(
    {
      emitterId: state.emitterConfigModal.draft.emitterId,
      ledType: state.emitterConfigModal.draft.ledType,
      voltageV: state.emitterConfigModal.draft.voltageV,
      currentA: state.emitterConfigModal.draft.currentA,
      seriesCount: state.emitterConfigModal.draft.seriesCount,
      parallelCount: state.emitterConfigModal.draft.parallelCount,
    },
    {
      emitterId: "emitter-1",
      ledType: "lm301h_cri80_5000k",
      voltageV: 2.75,
      currentA: 0.07,
      seriesCount: 1,
      parallelCount: 1,
    },
  );
});

test("emitter config actions return a structured error for missing emitters", () => {
  const state = createState();
  const actions = createActions(state);

  const result = actions.openEmitterConfig("missing");

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "EMITTER_NOT_FOUND");
  assert.equal(state.emitterConfigModal.isOpen, false);
});

test("emitter config actions update mode and save the emitter draft", () => {
  const state = createState();
  const actions = createActions(state);

  actions.openEmitterConfig("emitter-1");
  actions.setEmitterConfigMode("constantCurrent");
  actions.updateEmitterConfigDraft("currentA", 0.11);
  actions.updateEmitterConfigDraft("temperatureC", 31);
  const result = actions.saveEmitterConfig();

  assert.equal(result.ok, true);
  assert.equal(state.form.emitters[0].drive.driveMode, "constantCurrent");
  assert.equal(state.form.emitters[0].drive.currentA, 0.11);
  assert.equal(state.form.emitters[0].drive.temperatureC, 31);
  assert.equal(state.emitterConfigModal.isOpen, false);
  assert.equal(state.emitterConfigModal.draft, null);
});

test("emitter config actions reject saving without a draft", () => {
  const state = createState();
  const actions = createActions(state);

  const result = actions.saveEmitterConfig();

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "DRAFT_NOT_FOUND");
});
