import test from "node:test";
import assert from "node:assert/strict";
import { BoardProfile } from "../src/domain/BoardProfile";
import { PpfdEstimator } from "../src/domain/PpfdEstimator";
import {
  resolveFixtureGrid,
  resolveFixtureOffsetsMm,
} from "../src/domain/ppfd/fixtureLayout";
import { estimatePpfdMap } from "../src/domain/ppfd/estimatePpfdMap";

function createBoard(overrides = {}) {
  return new BoardProfile({
    widthMm: 100,
    depthMm: 100,
    roomWidthCm: 120,
    roomDepthCm: 120,
    distanceCm: 35,
    ledCount: 1,
    columns: 1,
    rows: 1,
    spacingXMm: 20,
    spacingYMm: 20,
    boardCount: 3,
    boardSpacingCm: 20,
    ...overrides,
  });
}

test("resolveFixtureGrid uses explicit grid when both axes are set", () => {
  assert.deepEqual(
    resolveFixtureGrid({
      fixtureCount: 3,
      fixtureColumns: 4,
      fixtureRows: 2,
    }),
    { columns: 4, rows: 2, fixtureCount: 3 },
  );
});

test("resolveFixtureOffsetsMm preserves the legacy auto grid layout", () => {
  const board = createBoard();

  assert.deepEqual(resolveFixtureOffsetsMm({ board }), [
    { xMm: -100, yMm: -100 },
    { xMm: 100, yMm: -100 },
    { xMm: -100, yMm: 100 },
  ]);
});

test("PpfdEstimator buildFixtureOffsets delegates to shared fixture layout", () => {
  const board = createBoard({
    fixtureColumns: 2,
    fixtureRows: 2,
    fixtureSpacingXCm: 10,
    fixtureSpacingYCm: 30,
  });
  const estimator = new PpfdEstimator(board, [], 5, { boardPhotonFlux: 0 });

  assert.deepEqual(estimator.buildFixtureOffsets(4), [
    { xMm: -50, yMm: -150 },
    { xMm: 50, yMm: -150 },
    { xMm: -50, yMm: 150 },
    { xMm: 50, yMm: 150 },
  ]);
});

test("fast and reference engines resolve matching explicit fixture counts", () => {
  const board = createBoard();
  const emitters = [{ xMm: 50, yMm: 50, type: "lm301h_cri80_5000k" }];
  const options = {
    boardPhotonFlux: 1,
    inputPowerW: 1,
    fixtureOffsetsMm: [
      { xMm: -100, yMm: 0 },
      { xMm: 100, yMm: 0 },
    ],
  };

  const fastPreview = estimatePpfdMap({
    board,
    emitters,
    resolutionCm: 5,
    options,
    engine: "fast-preview",
  });
  const reference = estimatePpfdMap({
    board,
    emitters,
    resolutionCm: 5,
    options,
    engine: "reference",
  });

  assert.equal(fastPreview.map.fixtureCount, 2);
  assert.equal(reference.map.fixtureCount, 2);
});
