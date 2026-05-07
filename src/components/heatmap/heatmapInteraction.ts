import {
  resolveHeatmapBoardSizeMm,
  type HeatmapBoard,
  type HeatmapBoardInstance,
} from "@/components/ppfdHeatmapCanvas";

export type CanvasPoint = { x: number; y: number };
export type BoardRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type BoardDragState = {
  instanceId: string;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  previewX: number;
  previewY: number;
  valid: boolean;
};

/**
 * Convert a pointer event into backing-canvas coordinates.
 *
 * @param {{
 *   event:{clientX:number,clientY:number},
 *   canvas:{getBoundingClientRect:()=>{left:number,top:number,width:number,height:number}},
 *   canvasWidth:number,
 *   canvasHeight:number
 * }} input
 * @returns {{x:number,y:number}}
 */
export function canvasPointFromPointerEvent(input: {
  event: { clientX: number; clientY: number };
  canvas: {
    getBoundingClientRect: () => {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  };
  canvasWidth: number;
  canvasHeight: number;
}): CanvasPoint {
  const rect = input.canvas.getBoundingClientRect();
  const scaleX = input.canvasWidth / Math.max(1, rect.width);
  const scaleY = input.canvasHeight / Math.max(1, rect.height);
  return {
    x: (input.event.clientX - rect.left) * scaleX,
    y: (input.event.clientY - rect.top) * scaleY,
  };
}

/**
 * Return the topmost board rect at a canvas point.
 *
 * @param {{
 *   point:{x:number,y:number},
 *   boardRects:Array<{id:string,x:number,y:number,width:number,height:number}>
 * }} input
 */
export function findBoardRectAtPoint(input: {
  point: CanvasPoint;
  boardRects: BoardRect[];
}): BoardRect | null {
  for (let index = input.boardRects.length - 1; index >= 0; index -= 1) {
    const rect = input.boardRects[index];
    if (
      input.point.x >= rect.x &&
      input.point.x <= rect.x + rect.width &&
      input.point.y >= rect.y &&
      input.point.y <= rect.y + rect.height
    ) {
      return rect;
    }
  }
  return null;
}

/**
 * Build drag state from a pointer hit, preserving the grabbed offset.
 *
 * @param {{
 *   hitRect:{id:string,x:number,y:number,width:number,height:number},
 *   point:{x:number,y:number},
 *   board:{roomWidthCm:number,roomDepthCm:number},
 *   canvasWidth:number,
 *   canvasHeight:number
 * }} input
 */
export function createBoardDragState(input: {
  hitRect: BoardRect;
  point: CanvasPoint;
  board: Pick<HeatmapBoard, "roomWidthCm" | "roomDepthCm">;
  canvasWidth: number;
  canvasHeight: number;
}): BoardDragState {
  const centerX = input.hitRect.x + input.hitRect.width * 0.5;
  const centerY = input.hitRect.y + input.hitRect.height * 0.5;
  return {
    instanceId: input.hitRect.id,
    offsetX: input.point.x - centerX,
    offsetY: input.point.y - centerY,
    scaleX: input.canvasWidth / (input.board.roomWidthCm * 10),
    scaleY: input.canvasHeight / (input.board.roomDepthCm * 10),
    previewX: centerX,
    previewY: centerY,
    valid: true,
  };
}

/**
 * Resolve dragged board center coordinates in room centimeters.
 *
 * @param {{
 *   point:{x:number,y:number},
 *   dragState:{offsetX:number,offsetY:number,scaleX:number,scaleY:number}
 * }} input
 */
export function resolveDraggedBoardCenterCm(input: {
  point: CanvasPoint;
  dragState: BoardDragState;
}): { xCm: number; yCm: number } {
  return {
    xCm:
      (input.point.x - input.dragState.offsetX) / input.dragState.scaleX / 10,
    yCm:
      (input.point.y - input.dragState.offsetY) / input.dragState.scaleY / 10,
  };
}

/**
 * Validate a heatmap board-drag preview against room bounds and other boards.
 *
 * @param {{
 *   board:Record<string, unknown>,
 *   boardInstances:Array<Record<string, unknown>>,
 *   instanceId:string,
 *   xCm:number,
 *   yCm:number
 * }} input
 */
export function isBoardMovePreviewValid(input: {
  board: HeatmapBoard;
  boardInstances: HeatmapBoardInstance[];
  instanceId: string;
  xCm: number;
  yCm: number;
}): boolean {
  const current = input.boardInstances.find(
    (item) => item.id === input.instanceId,
  );
  if (!current) return false;

  const currentSize = resolveHeatmapBoardSizeMm({
    boardInstance: current,
    fallbackBoard: input.board,
  });
  const halfW = (currentSize.widthMm / 10) * 0.5;
  const halfH = (currentSize.depthMm / 10) * 0.5;

  if (
    input.xCm - halfW < 0 ||
    input.xCm + halfW > input.board.roomWidthCm ||
    input.yCm - halfH < 0 ||
    input.yCm + halfH > input.board.roomDepthCm
  ) {
    return false;
  }

  for (const other of input.boardInstances) {
    if (other.id === input.instanceId) continue;
    const otherSize = resolveHeatmapBoardSizeMm({
      boardInstance: other,
      fallbackBoard: input.board,
    });
    const otherHalfW = (otherSize.widthMm / 10) * 0.5;
    const otherHalfH = (otherSize.depthMm / 10) * 0.5;
    if (
      Math.abs(input.xCm - Number(other.xCm || 0)) < halfW + otherHalfW &&
      Math.abs(input.yCm - Number(other.yCm || 0)) < halfH + otherHalfH
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Update drag preview coordinates and validity from a pointer point.
 *
 * @param {{
 *   point:{x:number,y:number},
 *   dragState:{instanceId:string,offsetX:number,offsetY:number,scaleX:number,scaleY:number},
 *   board:Record<string, unknown>,
 *   boardInstances:Array<Record<string, unknown>>
 * }} input
 */
export function resolveBoardDragPreview(input: {
  point: CanvasPoint;
  dragState: BoardDragState;
  board: HeatmapBoard;
  boardInstances: HeatmapBoardInstance[];
}): {
  xCm: number;
  yCm: number;
  previewX: number;
  previewY: number;
  valid: boolean;
} {
  const previewX = input.point.x - input.dragState.offsetX;
  const previewY = input.point.y - input.dragState.offsetY;
  const center = resolveDraggedBoardCenterCm({
    point: input.point,
    dragState: input.dragState,
  });
  return {
    ...center,
    previewX,
    previewY,
    valid: isBoardMovePreviewValid({
      board: input.board,
      boardInstances: input.boardInstances,
      instanceId: input.dragState.instanceId,
      xCm: center.xCm,
      yCm: center.yCm,
    }),
  };
}
