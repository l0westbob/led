import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBoardInstanceQuarterTurn,
  findInitialBoardInstancePosition,
  isBoardPlacementValid,
  resolveBoardInstanceFootprintCm,
} from "../src/application/planner/placementState.js";

test("resolveBoardInstanceFootprintCm rotates 90 degrees correctly", () => {
  const result = resolveBoardInstanceFootprintCm({
    widthMm: 440,
    depthMm: 285,
    rotationDeg: 90,
  });
  assert.deepEqual(result, { widthCm: 28.5, depthCm: 44 });
});

test("isBoardPlacementValid rejects overlap and out-of-bounds", () => {
  const boardInstances = [
    {
      id: "first",
      xCm: 40,
      yCm: 40,
      widthMm: 440,
      depthMm: 285,
      rotationDeg: 0,
    },
  ];

  const overlapPlacement = isBoardPlacementValid({
    boardInstance: {
      id: "second",
      xCm: 45,
      yCm: 45,
      widthMm: 440,
      depthMm: 285,
      rotationDeg: 0,
    },
    boardInstances,
    roomWidthCm: 120,
    roomDepthCm: 120,
  });
  assert.equal(overlapPlacement, false);

  const outOfBoundsPlacement = isBoardPlacementValid({
    boardInstance: {
      id: "second",
      xCm: 5,
      yCm: 5,
      widthMm: 440,
      depthMm: 285,
      rotationDeg: 0,
    },
    boardInstances: [],
    roomWidthCm: 120,
    roomDepthCm: 120,
  });
  assert.equal(outOfBoundsPlacement, false);
});

test("applyBoardInstanceQuarterTurn reverts invalid rotation", () => {
  const boardInstance = {
    id: "instance-1",
    xCm: 20,
    yCm: 20,
    widthMm: 440,
    depthMm: 285,
    rotationDeg: 0,
  };

  applyBoardInstanceQuarterTurn({
    boardInstance,
    boardInstances: [boardInstance],
    roomWidthCm: 50,
    roomDepthCm: 50,
    direction: "left",
  });

  assert.equal(boardInstance.rotationDeg, 0);
});

test("findInitialBoardInstancePosition returns in-bounds centerish candidate", () => {
  const position = findInitialBoardInstancePosition({
    widthCm: 44,
    depthCm: 28.5,
    roomWidthCm: 120,
    roomDepthCm: 120,
    boardInstances: [],
  });

  assert.ok(position.xCm >= 22 && position.xCm <= 98);
  assert.ok(position.yCm >= 14.25 && position.yCm <= 105.75);
});
