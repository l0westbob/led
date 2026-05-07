import test from "node:test";
import assert from "node:assert/strict";
import {
  getRotatedBoardFootprintCm,
  getRotatedBoardFootprintMm,
  normalizeQuarterTurnRotation,
  rotateEmittersWithBoard,
} from "../src/domain/boardGeometry";

test("normalizeQuarterTurnRotation normalizes arbitrary degrees", () => {
  assert.equal(normalizeQuarterTurnRotation(0), 0);
  assert.equal(normalizeQuarterTurnRotation(90), 90);
  assert.equal(normalizeQuarterTurnRotation(450), 90);
  assert.equal(normalizeQuarterTurnRotation(-90), 270);
});

test("getRotatedBoardFootprint swaps axes for 90/270°", () => {
  assert.deepEqual(
    getRotatedBoardFootprintMm({ widthMm: 440, depthMm: 285, rotationDeg: 90 }),
    { widthMm: 285, depthMm: 440 },
  );
  assert.deepEqual(
    getRotatedBoardFootprintCm({
      widthMm: 440,
      depthMm: 285,
      rotationDeg: 270,
    }),
    { widthCm: 28.5, depthCm: 44 },
  );
});

test("rotateEmittersWithBoard preserves emitter count and returns rotated footprint", () => {
  const emitters = [
    { xMm: 20, yMm: 20, type: "led" },
    { xMm: 120, yMm: 20, type: "led" },
  ];
  const rotated = rotateEmittersWithBoard(emitters, {
    widthMm: 200,
    depthMm: 100,
    rotationDeg: 90,
  });
  assert.equal(rotated.emitters.length, 2);
  assert.equal(rotated.widthMm, 100);
  assert.equal(rotated.depthMm, 200);
});
