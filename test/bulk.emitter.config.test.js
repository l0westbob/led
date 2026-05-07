import test from "node:test";
import assert from "node:assert/strict";
import { applyBulkEmitterConfiguration } from "../src/application/planner/applyBulkEmitterConfiguration";

const baseEmitter = {
  ledType: "lm301h_cri80_5000k",
  drive: {
    driveMode: "constantVoltage",
    voltageV: 2.7,
    currentA: 0.065,
    temperatureC: 25,
    seriesCount: 1,
    parallelCount: 1,
  },
};

test("applyBulkEmitterConfiguration updates only selected emitters", () => {
  const result = applyBulkEmitterConfiguration({
    emitters: [
      { id: "a", ...baseEmitter },
      { id: "b", ...baseEmitter },
    ],
    selectedEmitterIds: ["b"],
    apply: {
      ledType: true,
      driveMode: true,
      voltageV: true,
      currentA: false,
      temperatureC: true,
    },
    values: {
      ledType: "lm301h_cri90_5000k",
      driveMode: "constantCurrent",
      voltageV: 3.11,
      currentA: 0.091,
      temperatureC: 32,
    },
    roundToTwoDecimals: (value) => Math.round(value * 100) / 100,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.changedCount, 1);
  assert.equal(result.data.emitters[0].ledType, "lm301h_cri80_5000k");
  assert.equal(result.data.emitters[1].ledType, "lm301h_cri90_5000k");
  assert.equal(result.data.emitters[1].drive.driveMode, "constantCurrent");
  assert.equal(result.data.emitters[1].drive.voltageV, 3.11);
  assert.equal(result.data.emitters[1].drive.currentA, 0.065);
});

test("applyBulkEmitterConfiguration returns structured error for empty selection", () => {
  const result = applyBulkEmitterConfiguration({
    emitters: [{ id: "a", ...baseEmitter }],
    selectedEmitterIds: [],
    apply: {
      ledType: true,
      driveMode: true,
      voltageV: true,
      currentA: true,
      temperatureC: true,
    },
    values: {
      ledType: "lm301h_cri80_5000k",
      driveMode: "constantVoltage",
      voltageV: 2.7,
      currentA: 0.065,
      temperatureC: 25,
    },
    roundToTwoDecimals: (value) => value,
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors?.[0]?.code, "NO_EMITTER_SELECTION");
});
