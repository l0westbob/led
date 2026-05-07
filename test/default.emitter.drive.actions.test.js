import test from "node:test";
import assert from "node:assert/strict";
import { resolveDraftPreserveField } from "../src/application/planner/boardConfigState";
import { resolveDefaultEmitterDriveDraft } from "../src/application/planner/boardPlannerEmitterState";
import { createDefaultEmitterDriveActions } from "../src/application/planner/useCases/defaultEmitterDriveActions";

function createState() {
  return {
    form: {
      ledType: "lm301h_cri80_5000k",
      voltageV: 2.75,
      currentA: 0.07,
      temperatureC: 25,
      ledCount: 1,
      seriesCount: 1,
      parallelCount: 1,
    },
    boardPlannerDefaultEmitterDrive: {
      driveMode: "constantVoltage",
      voltageV: 2.75,
      currentA: 0.07,
      temperatureC: 25,
    },
  };
}

function createActions(state) {
  return createDefaultEmitterDriveActions({
    state,
    roundToTwoDecimals: (value) => Math.round(value * 100) / 100,
    resolveDefaultEmitterDriveDraft,
    resolveDraftPreserveField,
  });
}

test("default emitter drive actions update numeric drive fields", () => {
  const state = createState();
  const actions = createActions(state);

  const result = actions.updateBoardPlannerDefaultEmitterDrive("voltageV", 3);

  assert.equal(result.ok, true);
  assert.equal(state.boardPlannerDefaultEmitterDrive.voltageV, 3);
});

test("default emitter drive actions reject unknown fields", () => {
  const state = createState();
  const actions = createActions(state);

  const result = actions.updateBoardPlannerDefaultEmitterDrive("watts", 3);

  assert.equal(result.ok, false);
  assert.equal(state.boardPlannerDefaultEmitterDrive.voltageV, 2.75);
});

test("default emitter drive actions switch mode with preserve policy", () => {
  const state = createState();
  const actions = createActions(state);

  const result =
    actions.setBoardPlannerDefaultEmitterDriveMode("constantCurrent");

  assert.equal(result.ok, true);
  assert.equal(
    state.boardPlannerDefaultEmitterDrive.driveMode,
    "constantCurrent",
  );
  assert.equal(state.boardPlannerDefaultEmitterDrive.currentA, 0.07);
});
