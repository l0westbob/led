import { resolveHeatmapBoardFootprintMm } from "@/application/planner/boardPlacementViewModel";
import { createHeatmapColor } from "@/utils/colors";

export type HeatmapBoard = {
  roomWidthCm: number;
  roomDepthCm: number;
  widthMm: number;
  depthMm: number;
};

export type HeatmapBoardInstance = {
  id: string;
  xCm: number;
  yCm: number;
  widthMm: number;
  depthMm: number;
  rotationDeg: number;
};

export type HeatmapBoardRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HeatmapDragPreview = {
  instanceId: string;
  previewX: number;
  previewY: number;
  valid: boolean;
};

type HeatmapGridOverlay = {
  cellWidth: number;
  cellHeight: number;
  binCellsX: number;
  binCellsY: number;
  binCountX: number;
  binCountY: number;
  fontPx: number;
  valueRange: number;
};

export type HeatmapSummary = Pick<
  {
    values: ArrayLike<number>;
    gridWidth: number;
    gridDepth: number;
    min: number;
    max: number;
  },
  "values" | "gridWidth" | "gridDepth" | "min" | "max"
>;

type RenderPpfdHeatmapCanvasInput = {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  board: HeatmapBoard;
  summary: HeatmapSummary;
  boardRects: HeatmapBoardRect[];
  selectedBoardInstanceId: string;
  dragPreview?: HeatmapDragPreview | null;
};

export function resolveHeatmapAspectRatio(
  board: Pick<HeatmapBoard, "roomWidthCm" | "roomDepthCm">,
) {
  const widthCm = Math.max(1, Number(board.roomWidthCm) || 1);
  const depthCm = Math.max(1, Number(board.roomDepthCm) || 1);
  return widthCm / depthCm;
}

export function resolveHeatmapBoardSizeMm(input: {
  boardInstance: Pick<
    HeatmapBoardInstance,
    "widthMm" | "depthMm" | "rotationDeg"
  >;
  fallbackBoard: Pick<HeatmapBoard, "widthMm" | "depthMm">;
}) {
  return resolveHeatmapBoardFootprintMm({
    boardInstance: input.boardInstance,
    fallbackBoard: input.fallbackBoard,
  });
}

/**
 * Converts board millimeter dimensions into the heatmap canvas coordinate
 * space.
 *
 * @returns {Array<{id:string,x:number,y:number,width:number,height:number}>}
 */
export function resolveHeatmapBoardRects(input: {
  board: HeatmapBoard;
  boardInstances: HeatmapBoardInstance[];
  canvasWidth: number;
  canvasHeight: number;
}): HeatmapBoardRect[] {
  const scaleX = input.canvasWidth / (input.board.roomWidthCm * 10);
  const scaleY = input.canvasHeight / (input.board.roomDepthCm * 10);

  const rects: HeatmapBoardRect[] = [];
  for (const instance of input.boardInstances) {
    const { widthMm, depthMm } = resolveHeatmapBoardSizeMm({
      boardInstance: instance,
      fallbackBoard: input.board,
    });
    const xMm = Number(instance.xCm || 0) * 10 - widthMm * 0.5;
    const yMm = Number(instance.yCm || 0) * 10 - depthMm * 0.5;
    rects.push({
      id: instance.id,
      x: xMm * scaleX,
      y: yMm * scaleY,
      width: widthMm * scaleX,
      height: depthMm * scaleY,
    });
  }
  return rects;
}

export function resolveHeatmapGridOverlay(input: {
  board: Pick<HeatmapBoard, "roomWidthCm" | "roomDepthCm">;
  summary: HeatmapSummary;
  canvasWidth: number;
  canvasHeight: number;
}): HeatmapGridOverlay {
  const cellWidth = input.canvasWidth / input.summary.gridWidth;
  const cellHeight = input.canvasHeight / input.summary.gridDepth;
  const binCm = 10;
  const binCellsX = Math.max(
    1,
    Math.round(
      (binCm / Math.max(1, input.board.roomWidthCm)) * input.summary.gridWidth,
    ),
  );
  const binCellsY = Math.max(
    1,
    Math.round(
      (binCm / Math.max(1, input.board.roomDepthCm)) * input.summary.gridDepth,
    ),
  );
  const binCountX = Math.ceil(input.summary.gridWidth / binCellsX);
  const binCountY = Math.ceil(input.summary.gridDepth / binCellsY);
  const fontPx = Math.max(
    10,
    Math.min(
      26,
      Math.round(
        Math.min(binCellsX * cellWidth, binCellsY * cellHeight) * 0.22,
      ),
    ),
  );

  return {
    cellWidth,
    cellHeight,
    binCellsX,
    binCellsY,
    binCountX,
    binCountY,
    fontPx,
    valueRange: Math.max(1, input.summary.max - input.summary.min),
  };
}

function paintHeatmapCells(
  input: RenderPpfdHeatmapCanvasInput & { grid: HeatmapGridOverlay },
) {
  const { ctx, summary } = input;
  const { cellWidth, cellHeight } = input.grid;
  const range = Math.max(1, summary.max - summary.min);

  for (let y = 0; y < summary.gridDepth; y += 1) {
    for (let x = 0; x < summary.gridWidth; x += 1) {
      const value = summary.values[y * summary.gridWidth + x];
      const normalized = (value - summary.min) / range;
      ctx.fillStyle = createHeatmapColor(normalized);
      ctx.fillRect(
        x * cellWidth,
        y * cellHeight,
        cellWidth + 0.5,
        cellHeight + 0.5,
      );
    }
  }
}

function paintGridOverlay(
  input: RenderPpfdHeatmapCanvasInput & { grid: HeatmapGridOverlay },
) {
  const { ctx, canvasWidth, canvasHeight, grid } = input;

  ctx.save();
  ctx.strokeStyle = "rgba(186, 194, 210, 0.42)";
  ctx.lineWidth = 1.25;
  ctx.setLineDash([7, 7]);

  for (let bx = 0; bx <= grid.binCountX; bx += 1) {
    const x = bx * grid.binCellsX * grid.cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }

  for (let by = 0; by <= grid.binCountY; by += 1) {
    const y = by * grid.binCellsY * grid.cellHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function paintGridLabels(
  input: RenderPpfdHeatmapCanvasInput & { grid: HeatmapGridOverlay },
) {
  const { ctx, summary, grid } = input;

  ctx.font = `600 ${grid.fontPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let by = 0; by < grid.binCountY; by += 1) {
    const startY = by * grid.binCellsY;
    const endY = Math.min(summary.gridDepth, startY + grid.binCellsY);
    for (let bx = 0; bx < grid.binCountX; bx += 1) {
      const startX = bx * grid.binCellsX;
      const endX = Math.min(summary.gridWidth, startX + grid.binCellsX);

      let sum = 0;
      let count = 0;
      for (let y = startY; y < endY; y += 1) {
        const rowOffset = y * summary.gridWidth;
        for (let x = startX; x < endX; x += 1) {
          sum += summary.values[rowOffset + x];
          count += 1;
        }
      }

      if (count === 0) continue;
      const avg = sum / count;
      const normalized = (avg - summary.min) / grid.valueRange;

      // Low values map to blue-ish colors, so use white text there.
      const useWhite = normalized < 0.35;
      ctx.fillStyle = useWhite ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.82)";
      ctx.shadowColor = useWhite
        ? "rgba(0,0,0,0.55)"
        : "rgba(255,255,255,0.35)";
      ctx.shadowBlur = 6;

      const cx = (startX + (endX - startX) / 2) * grid.cellWidth;
      const cy = (startY + (endY - startY) / 2) * grid.cellHeight;
      ctx.fillText(String(Math.round(avg)), cx, cy);
    }
  }

  ctx.restore();
}

function paintBoardRects(input: RenderPpfdHeatmapCanvasInput) {
  const { ctx, boardRects, selectedBoardInstanceId, dragPreview } = input;

  ctx.setLineDash([10, 6]);
  for (const rect of boardRects) {
    const isDragged = dragPreview?.instanceId === rect.id;
    const drawX = isDragged ? dragPreview.previewX - rect.width * 0.5 : rect.x;
    const drawY = isDragged ? dragPreview.previewY - rect.height * 0.5 : rect.y;
    const selected = rect.id === selectedBoardInstanceId;
    ctx.strokeStyle = selected
      ? "rgba(44, 138, 255, 1)"
      : "rgba(24, 108, 230, 0.98)";
    ctx.lineWidth = selected ? 3.8 : 3;
    if (isDragged && !dragPreview.valid) {
      ctx.strokeStyle = "rgba(255, 98, 98, 0.95)";
    }
    ctx.strokeRect(drawX, drawY, rect.width, rect.height);
  }
  ctx.setLineDash([]);
}

/**
 * Paint a low-cost PPFD preview heatmap onto a canvas context.
 *
 * @param {{
 *   ctx:CanvasRenderingContext2D,
 *   canvasWidth:number,
 *   canvasHeight:number,
 *   board:Record<string, unknown>,
 *   summary:Record<string, unknown>,
 *   boardRects:Array<{id:string,x:number,y:number,width:number,height:number}>,
 *   selectedBoardInstanceId:string,
 *   dragPreview?:{instanceId:string,previewX:number,previewY:number,valid:boolean}|null
 * }} input
 */
export function renderPpfdHeatmapCanvas(input: RenderPpfdHeatmapCanvasInput) {
  input.ctx.clearRect(0, 0, input.canvasWidth, input.canvasHeight);

  const grid = resolveHeatmapGridOverlay({
    board: input.board,
    summary: input.summary,
    canvasWidth: input.canvasWidth,
    canvasHeight: input.canvasHeight,
  });

  paintHeatmapCells({ ...input, grid });
  paintGridOverlay({ ...input, grid });
  paintGridLabels({ ...input, grid });
  paintBoardRects(input);
}
