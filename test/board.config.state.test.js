import test from "node:test";
import assert from "node:assert/strict";
import {
  createBoardConfigDraft,
  resolveBoardConfigDraft,
  resolveDraftPreserveField,
} from "../src/application/planner/boardConfigState.js";

function createBoardInstance() {
  return {
    id: "instance-1",
    ledType: "lm301h_cri80_5000k",
    ledCount: 308,
    drive: {
      driveMode: "constantVoltage",
      voltageV: 38.6,
      currentA: 2,
      temperatureC: 50,
      seriesCount: 14,
      parallelCount: 22,
    },
  };
}

test("createBoardConfigDraft builds modal draft from instance drive", () => {
  const boardInstance = createBoardInstance();
  const draft = createBoardConfigDraft(boardInstance);
  assert.equal(draft.instanceId, boardInstance.id);
  assert.equal(draft.voltageV, boardInstance.drive.voltageV);
});

test("resolveDraftPreserveField uses changed field and mode policy", () => {
  const currentField = resolveDraftPreserveField({
    changedField: "currentA",
    draft: { driveMode: "constantVoltage" },
  });
  assert.equal(currentField, "currentA");

  const modeField = resolveDraftPreserveField({
    changedField: "temperatureC",
    draft: { driveMode: "constantCurrent" },
  });
  assert.equal(modeField, "currentA");
});

test("resolveBoardConfigDraft returns synchronized drive object", () => {
  const boardInstance = createBoardInstance();
  const draft = createBoardConfigDraft(boardInstance);
  draft.currentA = 1.9;
  draft.driveMode = "constantCurrent";

  const result = resolveBoardConfigDraft({
    boardInstance,
    draft,
    preserveField: "currentA",
  });

  assert.equal(result.resolvedDrive.driveMode, "constantCurrent");
  assert.equal(result.resolvedDrive.currentA, 1.9);
  assert.ok(Number.isFinite(result.resolvedDrive.voltageV));
});
