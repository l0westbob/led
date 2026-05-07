import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBoardDefinition } from "../src/catalog/boardCatalog";
import { buildBoardPreviewCctSummary } from "../src/application/planner/boardPreviewCct";
import { resolveBoardPreviewEmitterElectricalRows } from "../src/application/planner/boardPreviewElectrical";
import { projectBoardPreviewEmitterSelection } from "../src/application/planner/boardPreviewSelection";
import { buildBoardPreviewSpectrum } from "../src/application/planner/boardPreviewSpectrum";
import { estimateBoardPreviewWiring } from "../src/application/planner/boardPreviewWiring";

function createBoard() {
  return normalizeBoardDefinition({
    id: "preview-service-board",
    name: "Preview Service Board",
    ledType: "lm301h_cri80_5000k",
    emitters: [],
    widthMm: 100,
    depthMm: 100,
    ledCount: 1,
    columns: 1,
    rows: 1,
    spacingXMm: 20,
    spacingYMm: 20,
    voltageV: 2.75,
    currentA: 0.07,
    temperatureC: 25,
    seriesCount: 1,
    parallelCount: 1,
  });
}

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

test("resolveBoardPreviewEmitterElectricalRows returns per-emitter rows", () => {
  const rows = resolveBoardPreviewEmitterElectricalRows({
    board: createBoard(),
    emitters: [createEmitter()],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].emitterId, "emitter-1");
  assert.ok(rows[0].ledForwardVoltageV > 0);
  assert.ok(rows[0].ledCurrentA > 0);
  assert.ok(rows[0].perEmitterCurrentMA > 0);
});

test("buildBoardPreviewSpectrum aggregates valid emitter spectra", () => {
  const spectrum = buildBoardPreviewSpectrum({
    emitters: [createEmitter()],
    emitterElectricalRows: [
      {
        emitterId: "emitter-1",
        perEmitterCurrentMA: 70,
      },
    ],
  });

  assert.equal(spectrum.warnings.length, 0);
  assert.equal(spectrum.errors.length, 0);
  assert.ok(spectrum.totalPhotonFlux > 0);
  assert.equal(spectrum.emitterFluxRows.length, 1);
  assert.equal(spectrum.photonSpectrum.wavelengthNm.length, 561);
  assert.equal(spectrum.relativeSpectrum.values.length, 561);
});

test("buildBoardPreviewSpectrum warns when an emitter spectrum is missing", () => {
  const spectrum = buildBoardPreviewSpectrum({
    emitters: [createEmitter({ ledType: "unknown-led" })],
    emitterElectricalRows: [
      {
        emitterId: "emitter-1",
        perEmitterCurrentMA: 70,
      },
    ],
  });

  assert.equal(spectrum.totalPhotonFlux, 0);
  assert.equal(spectrum.warnings[0]?.code, "SPECTRAL_DATASET_NOT_FOUND");
});

test("projectBoardPreviewEmitterSelection filters unavailable selected ids", () => {
  const selection = projectBoardPreviewEmitterSelection({
    emitters: [createEmitter(), createEmitter({ id: "emitter-2" })],
    selectedEmitterId: "emitter-2",
    selectedEmitterIds: ["missing", "emitter-1", "emitter-1", "emitter-2"],
  });

  assert.equal(selection.selectedEmitter.id, "emitter-2");
  assert.deepEqual(selection.selectedEmitterIds, ["emitter-1", "emitter-2"]);
  assert.equal(selection.selectedEmitterCount, 2);
});

test("buildBoardPreviewCctSummary returns low confidence CCT projection", () => {
  const summary = buildBoardPreviewCctSummary([
    { ledType: "lm301h_cri80_5000k", photonFluxUmolS: 1 },
  ]);

  assert.equal(summary.cct.method, "photon-flux-weighted-led-cct");
  assert.equal(summary.cct.confidence, "low");
  assert.equal(summary.warnings.length, 0);
  assert.ok(summary.cctK > 0);
});

test("estimateBoardPreviewWiring computes matched grid estimates", () => {
  const board = createBoard();
  const emitters = [createEmitter()];
  const wiring = estimateBoardPreviewWiring({
    rawBoard: board,
    board,
    emitters,
    emitterElectricalRows: [
      {
        emitterId: "emitter-1",
        ledForwardVoltageV: 2.75,
        ledCurrentA: 0.07,
      },
    ],
  });

  assert.deepEqual(wiring.warnings, []);
  assert.equal(wiring.boardElectricalEstimate.boardVoltageV, 2.75);
  assert.equal(wiring.boardElectricalEstimate.boardCurrentA, 0.07);
  assert.equal(wiring.boardElectricalEstimate.inputPowerW, 2.75 * 0.07);
});

test("estimateBoardPreviewWiring warns when grid does not match wiring", () => {
  const board = createBoard();
  const wiring = estimateBoardPreviewWiring({
    rawBoard: { ...board, seriesCount: 2, parallelCount: 2 },
    board: { ...board, seriesCount: 2, parallelCount: 2 },
    emitters: [createEmitter()],
    emitterElectricalRows: [
      {
        emitterId: "emitter-1",
        ledForwardVoltageV: 2.75,
        ledCurrentA: 0.07,
      },
    ],
  });

  assert.equal(wiring.warnings[0]?.code, "WIRING_GRID_MISMATCH");
  assert.equal(wiring.boardElectricalEstimate.boardVoltageV, board.voltageV);
  assert.equal(wiring.boardElectricalEstimate.boardCurrentA, board.currentA);
});
