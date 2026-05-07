import test from "node:test";
import assert from "node:assert/strict";
import { BoardProfile } from "../src/domain/BoardProfile";
import {
  comparePpfdMaps,
  estimatePpfdMap,
} from "../src/domain/ppfd/estimatePpfdMap";

test("ppfd engine interface returns map for fast-preview and reference engines", () => {
  const board = new BoardProfile({
    widthMm: 100,
    depthMm: 100,
    roomWidthCm: 100,
    roomDepthCm: 100,
    distanceCm: 35,
    photoperiodHours: 12,
    ledCount: 1,
    columns: 1,
    rows: 1,
    spacingXMm: 20,
    spacingYMm: 20,
  });
  const emitters = [{ xMm: 50, yMm: 50, type: "lm301h_cri80_5000k" }];

  const fastPreview = estimatePpfdMap({
    board,
    emitters,
    resolutionCm: 5,
    options: {
      boardPhotonFlux: 1,
      inputPowerW: 1,
    },
    engine: "fast-preview",
  });
  const reference = estimatePpfdMap({
    board,
    emitters,
    resolutionCm: 5,
    options: {
      boardPhotonFlux: 1,
      inputPowerW: 1,
    },
    engine: "reference",
  });

  assert.equal(fastPreview.engine, "fast-preview");
  assert.equal(reference.engine, "reference");
  const comparison = comparePpfdMaps({
    baseline: reference.map,
    candidate: fastPreview.map,
  });
  assert.ok(Number.isFinite(comparison.mae));
  assert.ok(Number.isFinite(comparison.maxError));
  assert.ok(Number.isFinite(comparison.p95Error));
});
