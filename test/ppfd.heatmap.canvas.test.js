import test from "node:test";
import assert from "node:assert/strict";
import {
  renderPpfdHeatmapCanvas,
  resolveHeatmapAspectRatio,
  resolveHeatmapBoardRects,
  resolveHeatmapGridOverlay,
} from "../src/components/ppfdHeatmapCanvas";

function createBoard() {
  return {
    roomWidthCm: 100,
    roomDepthCm: 50,
    widthMm: 200,
    depthMm: 100,
  };
}

function createSummary() {
  return {
    gridWidth: 20,
    gridDepth: 10,
    min: 0,
    max: 100,
    values: Array.from({ length: 200 }, (_value, index) => index),
  };
}

function createMockContext() {
  const calls = [];
  return {
    calls,
    beginPath() {
      calls.push(["beginPath"]);
    },
    clearRect(...args) {
      calls.push(["clearRect", ...args]);
    },
    fillRect(...args) {
      calls.push(["fillRect", ...args]);
    },
    fillText(...args) {
      calls.push(["fillText", ...args]);
    },
    lineTo(...args) {
      calls.push(["lineTo", ...args]);
    },
    moveTo(...args) {
      calls.push(["moveTo", ...args]);
    },
    restore() {
      calls.push(["restore"]);
    },
    save() {
      calls.push(["save"]);
    },
    setLineDash(value) {
      calls.push(["setLineDash", value]);
    },
    stroke() {
      calls.push(["stroke"]);
    },
    strokeRect(...args) {
      calls.push(["strokeRect", ...args]);
    },
    set fillStyle(value) {
      calls.push(["fillStyle", value]);
    },
    set font(value) {
      calls.push(["font", value]);
    },
    set lineWidth(value) {
      calls.push(["lineWidth", value]);
    },
    set shadowBlur(value) {
      calls.push(["shadowBlur", value]);
    },
    set shadowColor(value) {
      calls.push(["shadowColor", value]);
    },
    set strokeStyle(value) {
      calls.push(["strokeStyle", value]);
    },
    set textAlign(value) {
      calls.push(["textAlign", value]);
    },
    set textBaseline(value) {
      calls.push(["textBaseline", value]);
    },
  };
}

test("resolveHeatmapAspectRatio clamps invalid room dimensions", () => {
  assert.equal(
    resolveHeatmapAspectRatio({ roomWidthCm: 120, roomDepthCm: 60 }),
    2,
  );
  assert.equal(
    resolveHeatmapAspectRatio({ roomWidthCm: 0, roomDepthCm: 0 }),
    1,
  );
});

test("resolveHeatmapBoardRects maps board instances into canvas coordinates", () => {
  const rects = resolveHeatmapBoardRects({
    board: createBoard(),
    boardInstances: [
      {
        id: "board-1",
        xCm: 50,
        yCm: 25,
        widthMm: 200,
        depthMm: 100,
      },
      {
        id: "board-2",
        xCm: 20,
        yCm: 20,
        widthMm: 200,
        depthMm: 100,
        rotationDeg: 90,
      },
    ],
    canvasWidth: 1000,
    canvasHeight: 500,
  });

  assert.deepEqual(rects[0], {
    id: "board-1",
    x: 400,
    y: 200,
    width: 200,
    height: 100,
  });
  assert.deepEqual(rects[1], {
    id: "board-2",
    x: 150,
    y: 100,
    width: 100,
    height: 200,
  });
});

test("resolveHeatmapGridOverlay derives 10 cm grid bins", () => {
  const grid = resolveHeatmapGridOverlay({
    board: createBoard(),
    summary: createSummary(),
    canvasWidth: 1000,
    canvasHeight: 500,
  });

  assert.equal(grid.cellWidth, 50);
  assert.equal(grid.cellHeight, 50);
  assert.equal(grid.binCellsX, 2);
  assert.equal(grid.binCellsY, 2);
  assert.equal(grid.binCountX, 10);
  assert.equal(grid.binCountY, 5);
});

test("renderPpfdHeatmapCanvas paints cells, labels, and board overlays", () => {
  const ctx = createMockContext();

  renderPpfdHeatmapCanvas({
    ctx,
    canvasWidth: 100,
    canvasHeight: 100,
    board: { ...createBoard(), roomWidthCm: 20, roomDepthCm: 20 },
    summary: {
      gridWidth: 2,
      gridDepth: 2,
      min: 0,
      max: 4,
      values: [1, 2, 3, 4],
    },
    boardRects: [{ id: "board-1", x: 10, y: 20, width: 30, height: 40 }],
    selectedBoardInstanceId: "board-1",
  });

  assert.equal(ctx.calls.filter((call) => call[0] === "fillRect").length, 4);
  assert.equal(ctx.calls.filter((call) => call[0] === "fillText").length, 4);
  assert.deepEqual(
    ctx.calls.find((call) => call[0] === "strokeRect"),
    ["strokeRect", 10, 20, 30, 40],
  );
  assert.deepEqual(ctx.calls[0], ["clearRect", 0, 0, 100, 100]);
});
