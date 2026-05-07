import test from "node:test";
import assert from "node:assert/strict";
import { buildPlannerSnapshot } from "../src/application/planner/buildPlannerSnapshot";

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

function createBoardInstance() {
  return {
    id: "instance-1",
    name: "Test Board Instance",
    presetBoardId: "test-board",
    ledType: "lm301h_cri80_5000k",
    widthMm: 440,
    depthMm: 285,
    ledCount: 308,
    columns: 22,
    rows: 14,
    spacingXMm: 20,
    spacingYMm: 18,
    emitters: [],
    xCm: 60,
    yCm: 60,
    rotationDeg: 0,
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

function createSteppedTimer(stepMs) {
  let currentMs = 0;
  return {
    nowMs() {
      currentMs += stepMs;
      return currentMs;
    },
  };
}

test("buildPlannerSnapshot exposes deterministic stage timing payload", () => {
  const snapshot = buildPlannerSnapshot({
    board: createBoardFormState(),
    boardInstances: [createBoardInstance()],
    resolutionCm: 5,
  });

  assert.ok(snapshot.summary.stageTimingMs);
  assert.ok(Number.isFinite(snapshot.summary.stageTimingMs.electrical));
  assert.ok(Number.isFinite(snapshot.summary.stageTimingMs.photon));
  assert.ok(Number.isFinite(snapshot.summary.stageTimingMs.ppfd));
});

test("buildPlannerSnapshot accepts an injected timer for deterministic timing", () => {
  const snapshot = buildPlannerSnapshot({
    board: createBoardFormState(),
    boardInstances: [createBoardInstance()],
    resolutionCm: 5,
    timer: createSteppedTimer(5),
  });

  assert.deepEqual(snapshot.summary.stageTimingMs, {
    electrical: 5,
    photon: 5,
    ppfd: 5,
  });
  assert.equal(snapshot.summary.calculationMs, 35);
});
