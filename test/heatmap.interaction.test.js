import test from "node:test";
import assert from "node:assert/strict";
import {
  canvasPointFromPointerEvent,
  findBoardRectAtPoint,
  isBoardMovePreviewValid,
  resolveBoardDragPreview,
  resolveDraggedBoardCenterCm,
} from "../src/components/heatmap/heatmapInteraction";

function createBoard() {
  return {
    roomWidthCm: 100,
    roomDepthCm: 100,
    widthMm: 200,
    depthMm: 200,
  };
}

function createBoardInstances() {
  return [
    {
      id: "board-a",
      xCm: 20,
      yCm: 20,
      widthMm: 200,
      depthMm: 200,
      rotationDeg: 0,
    },
    {
      id: "board-b",
      xCm: 60,
      yCm: 50,
      widthMm: 200,
      depthMm: 200,
      rotationDeg: 0,
    },
  ];
}

test("canvasPointFromPointerEvent scales CSS pixels to backing canvas pixels", () => {
  const point = canvasPointFromPointerEvent({
    event: { clientX: 60, clientY: 45 },
    canvas: {
      getBoundingClientRect() {
        return { left: 10, top: 20, width: 100, height: 50 };
      },
    },
    canvasWidth: 200,
    canvasHeight: 100,
  });

  assert.deepEqual(point, { x: 100, y: 50 });
});

test("findBoardRectAtPoint returns the topmost matching board rect", () => {
  const hit = findBoardRectAtPoint({
    point: { x: 50, y: 50 },
    boardRects: [
      { id: "bottom", x: 0, y: 0, width: 100, height: 100 },
      { id: "top", x: 25, y: 25, width: 100, height: 100 },
    ],
  });

  assert.equal(hit?.id, "top");
});

test("isBoardMovePreviewValid rejects out-of-room positions", () => {
  assert.equal(
    isBoardMovePreviewValid({
      board: createBoard(),
      boardInstances: createBoardInstances(),
      instanceId: "board-a",
      xCm: 5,
      yCm: 20,
    }),
    false,
  );
});

test("isBoardMovePreviewValid rejects overlapping board positions", () => {
  assert.equal(
    isBoardMovePreviewValid({
      board: createBoard(),
      boardInstances: createBoardInstances(),
      instanceId: "board-a",
      xCm: 50,
      yCm: 50,
    }),
    false,
  );
});

test("resolveDraggedBoardCenterCm returns expected room center coordinates", () => {
  const center = resolveDraggedBoardCenterCm({
    point: { x: 220, y: 340 },
    dragState: {
      offsetX: 20,
      offsetY: 40,
      scaleX: 2,
      scaleY: 3,
    },
  });

  assert.deepEqual(center, { xCm: 10, yCm: 10 });
});

test("resolveBoardDragPreview reports valid preview coordinates", () => {
  const preview = resolveBoardDragPreview({
    point: { x: 400, y: 200 },
    dragState: {
      instanceId: "board-a",
      offsetX: 0,
      offsetY: 0,
      scaleX: 2,
      scaleY: 2,
    },
    board: createBoard(),
    boardInstances: createBoardInstances(),
  });

  assert.equal(preview.xCm, 20);
  assert.equal(preview.yCm, 10);
  assert.equal(preview.previewX, 400);
  assert.equal(preview.previewY, 200);
  assert.equal(preview.valid, true);
});
