import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BoardProfile } from "../src/domain/BoardProfile";
import { buildPlannerSnapshot } from "../src/application/planner/buildPlannerSnapshot";
import { buildBoardPlannerPreviewSnapshot } from "../src/application/planner/buildBoardPlannerPreviewSnapshot";
import { buildLedLabSnapshot } from "../src/application/ledLab/buildLedLabSnapshot";

const BASELINE_PATH = path.resolve("./test/fixtures/baseline/v1-baseline.json");
const BASELINE = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));

function assertWithinTolerance(actual, expected, tolerance, label) {
  const delta = Math.abs(actual - expected);
  assert.ok(
    delta <= tolerance,
    `${label} expected ${expected} ±${tolerance} but got ${actual} (delta=${delta})`,
  );
}

function createPlannerBoardFormState() {
  return {
    id: "baseline-board",
    name: "Baseline Board",
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

function createPlannerBoardInstance() {
  return {
    id: "instance-1",
    name: "Baseline Instance",
    presetBoardId: "baseline-board",
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

test("planner baseline snapshot stays within accepted tolerance", () => {
  const snapshot = buildPlannerSnapshot({
    board: createPlannerBoardFormState(),
    boardInstances: [createPlannerBoardInstance()],
    resolutionCm: 2,
  });

  const expected = BASELINE.planner.summary;
  assertWithinTolerance(
    snapshot.summary.average,
    expected.average,
    0.05,
    "planner.average",
  );
  assertWithinTolerance(
    snapshot.summary.min,
    expected.min,
    0.05,
    "planner.min",
  );
  assertWithinTolerance(
    snapshot.summary.max,
    expected.max,
    0.05,
    "planner.max",
  );
  assertWithinTolerance(
    snapshot.summary.inputPower,
    expected.inputPower,
    0.05,
    "planner.inputPower",
  );
  assertWithinTolerance(
    snapshot.summary.boardPhotonFlux,
    expected.boardPhotonFlux,
    0.05,
    "planner.boardPhotonFlux",
  );
  assert.equal(snapshot.summary.gridWidth, expected.gridWidth);
  assert.equal(snapshot.summary.gridDepth, expected.gridDepth);
  assert.equal(snapshot.summary.sourceCount, expected.sourceCount);
  assert.equal(snapshot.summary.fixtureCount, expected.fixtureCount);
});

test("board preview baseline snapshot stays within accepted tolerance", () => {
  const baseBoard = {
    id: "preview-board",
    name: "Preview Board",
    ledType: "lm301h_cri80_5000k",
    emitters: [],
    widthMm: 100,
    depthMm: 100,
    ledCount: 4,
    columns: 2,
    rows: 2,
    spacingXMm: 20,
    spacingYMm: 20,
    voltageV: 38.6,
    currentA: 2,
    temperatureC: 50,
    seriesCount: 2,
    parallelCount: 2,
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

  const emitters = new BoardProfile(baseBoard)
    .generateEmitters()
    .map((emitter, index) => ({
      id: `emitter-${index + 1}`,
      xMm: emitter.xMm,
      yMm: emitter.yMm,
      ledType: "lm301h_cri80_5000k",
      drive: {
        driveMode: "constantVoltage",
        voltageV: 2.75,
        currentA: 0.07,
        temperatureC: 25,
        seriesCount: 1,
        parallelCount: 1,
      },
    }));

  const snapshot = buildBoardPlannerPreviewSnapshot({
    board: {
      ...baseBoard,
      emitters,
    },
  });
  const expected = BASELINE.boardPreview.summary;
  assert.equal(snapshot.emitters.length, expected.emitters);
  assertWithinTolerance(
    snapshot.totalPhotonFlux,
    expected.totalPhotonFlux,
    0.005,
    "boardPreview.totalPhotonFlux",
  );
  assertWithinTolerance(
    snapshot.boardElectricalEstimate.boardVoltageV,
    expected.boardVoltageV,
    0.01,
    "boardPreview.boardVoltageV",
  );
  assertWithinTolerance(
    snapshot.boardElectricalEstimate.boardCurrentA,
    expected.boardCurrentA,
    0.01,
    "boardPreview.boardCurrentA",
  );
  assertWithinTolerance(
    snapshot.boardElectricalEstimate.inputPowerW,
    expected.inputPowerW,
    0.02,
    "boardPreview.inputPowerW",
  );
  assert.equal(snapshot.cctK, expected.cctK);
});

test("led lab baseline snapshot stays within accepted tolerance", () => {
  const snapshot = buildLedLabSnapshot({
    selectedLedId: "lm301h_cri80_5000k",
    mode: "relative",
  });
  const expected = BASELINE.ledLab.summary;

  assert.equal(snapshot.led.id, expected.led);
  assert.equal(snapshot.selectedDatasetId, expected.dataset);
  assert.equal(snapshot.points1nm, expected.points1nm);
  assert.equal(snapshot.points5nm, expected.points5nm);
  assertWithinTolerance(
    snapshot.spectralStats.mccreeRatio,
    expected.mccreeRatio,
    0.0005,
    "ledLab.mccreeRatio",
  );
  assertWithinTolerance(
    snapshot.spectralStats.dinRatio,
    expected.dinRatio,
    0.0005,
    "ledLab.dinRatio",
  );
  assertWithinTolerance(
    snapshot.spectralStats.parRatio,
    expected.parRatio,
    0.0005,
    "ledLab.parRatio",
  );
  assertWithinTolerance(
    snapshot.spectralStats.pbarRatio,
    expected.pbarRatio,
    0.0005,
    "ledLab.pbarRatio",
  );
});
