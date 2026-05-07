import test from "node:test";
import assert from "node:assert/strict";
import { buildPlannerSnapshotEnvelope } from "../src/application/planner/buildPlannerSnapshot";

function createBoardFormState() {
  return {
    id: "test-board",
    name: "Test Board",
    ledType: "lm301h_cri80_5000k",
    emitters: [],
    widthMm: 440,
    depthMm: 285,
    ledCount: 308,
    columns: 22,
    rows: 14,
    spacingXMm: 20,
    spacingYMm: 18,
    voltageV: 38.6,
    currentA: 2,
    temperatureC: 50,
    seriesCount: 14,
    parallelCount: 22,
    distanceCm: 35,
    roomWidthCm: 120,
    roomDepthCm: 120,
    photoperiodHours: 12,
    boardCount: 1,
    boardSpacingCm: 20,
    fixtureColumns: 1,
    fixtureRows: 1,
    fixtureSpacingXCm: 20,
    fixtureSpacingYCm: 20,
  };
}

test("planner snapshot envelope returns standardized shape", () => {
  const envelope = buildPlannerSnapshotEnvelope({
    board: createBoardFormState(),
    boardInstances: [],
    resolutionCm: 5,
  });

  assert.equal(typeof envelope.contractVersion, "string");
  assert.ok(Object.hasOwn(envelope, "data"));
  assert.ok(Array.isArray(envelope.warnings));
  assert.ok(Array.isArray(envelope.errors));
  assert.equal(typeof envelope.timings, "object");
});
