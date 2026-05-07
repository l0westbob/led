import {
  getRotatedBoardFootprintCm,
  normalizeQuarterTurnRotation,
} from "@/domain/boardGeometry";
import { createBoardInstanceIdGenerator } from "@/utils/runtime";
import type { BoardInstance } from "@/domain/contracts";

type PlacementBoard = Pick<
  BoardInstance,
  "widthMm" | "depthMm" | "xCm" | "yCm" | "rotationDeg"
> & {
  id?: string;
};

type InstanceRect = {
  xCm: number;
  yCm: number;
  widthCm: number;
  depthCm: number;
};

/**
 * Clamp a numeric value into an inclusive range.
 *
 * @param {number} value
 * @param {number} minValue
 * @param {number} maxValue
 * @returns {number}
 */
export function clampToRange(
  value: number,
  minValue: number,
  maxValue: number,
) {
  return Math.max(minValue, Math.min(maxValue, value));
}

/**
 * Build a deterministic board-instance identifier.
 *
 * @param {{
 *   clock?: { now: () => number },
 *   random?: { next: () => number }
 * }} [dependencies]
 * @returns {string}
 */
export function createBoardInstanceId(
  dependencies: {
    clock?: { now: () => number };
    random?: { next: () => number };
  } = {},
) {
  return createBoardInstanceIdGenerator(dependencies)();
}

/**
 * Resolve rotated footprint for one board instance in centimeters.
 *
 * @param {{ widthMm:number, depthMm:number, rotationDeg:number }} boardInstance
 * @returns {{ widthCm:number, depthCm:number }}
 */
export function resolveBoardInstanceFootprintCm(boardInstance: {
  widthMm: number;
  depthMm: number;
  rotationDeg: number;
}) {
  return getRotatedBoardFootprintCm({
    widthMm: Number(boardInstance.widthMm) || 0,
    depthMm: Number(boardInstance.depthMm) || 0,
    rotationDeg: boardInstance.rotationDeg,
  });
}

/**
 * Check whether two axis-aligned instance rectangles overlap.
 *
 * @param {{ xCm:number, yCm:number, widthCm:number, depthCm:number }} firstInstanceRect
 * @param {{ xCm:number, yCm:number, widthCm:number, depthCm:number }} secondInstanceRect
 * @returns {boolean}
 */
export function doInstanceRectsIntersect(
  firstInstanceRect: InstanceRect,
  secondInstanceRect: InstanceRect,
) {
  const firstHalfWidth = firstInstanceRect.widthCm * 0.5;
  const firstHalfDepth = firstInstanceRect.depthCm * 0.5;
  const secondHalfWidth = secondInstanceRect.widthCm * 0.5;
  const secondHalfDepth = secondInstanceRect.depthCm * 0.5;
  return (
    Math.abs(firstInstanceRect.xCm - secondInstanceRect.xCm) <
      firstHalfWidth + secondHalfWidth &&
    Math.abs(firstInstanceRect.yCm - secondInstanceRect.yCm) <
      firstHalfDepth + secondHalfDepth
  );
}

/**
 * Validate whether a board-instance placement is in room bounds and
 * non-overlapping against other instances.
 *
 * @param {{
 *   boardInstance: Record<string, unknown>,
 *   boardInstances: Array<Record<string, unknown>>,
 *   roomWidthCm: number,
 *   roomDepthCm: number,
 *   skipInstanceId?: string
 * }} input
 * @returns {boolean}
 */
export function isBoardPlacementValid(input: {
  boardInstance: PlacementBoard;
  boardInstances: PlacementBoard[];
  roomWidthCm: number;
  roomDepthCm: number;
  skipInstanceId?: string;
}) {
  const { widthCm, depthCm } = resolveBoardInstanceFootprintCm(
    input.boardInstance,
  );
  const halfWidth = widthCm * 0.5;
  const halfDepth = depthCm * 0.5;
  if (
    input.boardInstance.xCm - halfWidth < 0 ||
    input.boardInstance.xCm + halfWidth > input.roomWidthCm ||
    input.boardInstance.yCm - halfDepth < 0 ||
    input.boardInstance.yCm + halfDepth > input.roomDepthCm
  ) {
    return false;
  }

  for (const existingInstance of input.boardInstances) {
    if (existingInstance.id === input.skipInstanceId) {
      continue;
    }
    const existingFootprint = resolveBoardInstanceFootprintCm(existingInstance);
    if (
      doInstanceRectsIntersect(
        {
          ...input.boardInstance,
          widthCm,
          depthCm,
        },
        {
          ...existingInstance,
          ...existingFootprint,
        },
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Find a first valid center position for a newly added board instance.
 *
 * @param {{
 *   widthCm: number,
 *   depthCm: number,
 *   roomWidthCm: number,
 *   roomDepthCm: number,
 *   boardInstances: Array<Record<string, unknown>>
 * }} input
 * @returns {{ xCm:number, yCm:number }}
 */
export function findInitialBoardInstancePosition(input: {
  widthCm: number;
  depthCm: number;
  roomWidthCm: number;
  roomDepthCm: number;
  boardInstances: PlacementBoard[];
}) {
  const minimumX = input.widthCm * 0.5;
  const minimumY = input.depthCm * 0.5;
  const maximumX = input.roomWidthCm - minimumX;
  const maximumY = input.roomDepthCm - minimumY;

  const gridColumns = Math.max(
    1,
    Math.floor(input.roomWidthCm / Math.max(10, input.widthCm + 2)),
  );
  const gridRows = Math.max(
    1,
    Math.floor(input.roomDepthCm / Math.max(10, input.depthCm + 2)),
  );
  const stepX = gridColumns > 1 ? (maximumX - minimumX) / (gridColumns - 1) : 0;
  const stepY = gridRows > 1 ? (maximumY - minimumY) / (gridRows - 1) : 0;

  const centerX = input.roomWidthCm * 0.5;
  const centerY = input.roomDepthCm * 0.5;
  const candidates: Array<{ xCm: number; yCm: number; rank: number }> = [];
  for (let rowIndex = 0; rowIndex < gridRows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < gridColumns; columnIndex += 1) {
      const xCm = clampToRange(
        minimumX + columnIndex * stepX,
        minimumX,
        maximumX,
      );
      const yCm = clampToRange(minimumY + rowIndex * stepY, minimumY, maximumY);
      const deltaX = xCm - centerX;
      const deltaY = yCm - centerY;
      candidates.push({ xCm, yCm, rank: deltaX * deltaX + deltaY * deltaY });
    }
  }

  candidates.sort((left, right) => left.rank - right.rank);
  for (const candidate of candidates) {
    if (
      isBoardPlacementValid({
        boardInstance: {
          ...candidate,
          widthMm: input.widthCm * 10,
          depthMm: input.depthCm * 10,
          rotationDeg: 0,
        },
        boardInstances: input.boardInstances,
        roomWidthCm: input.roomWidthCm,
        roomDepthCm: input.roomDepthCm,
      })
    ) {
      return candidate;
    }
  }

  return {
    xCm: clampToRange(centerX, minimumX, maximumX),
    yCm: clampToRange(centerY, minimumY, maximumY),
  };
}

/**
 * Apply one quarter-turn rotation and keep the old rotation when the new one
 * would produce an invalid placement.
 *
 * @param {{
 *   boardInstance: Record<string, unknown>,
 *   boardInstances: Array<Record<string, unknown>>,
 *   roomWidthCm: number,
 *   roomDepthCm: number,
 *   direction: "left" | "right"
 * }} input
 */
export function applyBoardInstanceQuarterTurn(input: {
  boardInstance: BoardInstance;
  boardInstances: BoardInstance[];
  roomWidthCm: number;
  roomDepthCm: number;
  direction: "left" | "right";
}) {
  const deltaDegrees = input.direction === "left" ? -90 : 90;
  const previousRotation = normalizeQuarterTurnRotation(
    input.boardInstance.rotationDeg,
  );
  input.boardInstance.rotationDeg = normalizeQuarterTurnRotation(
    previousRotation + deltaDegrees,
  );
  if (
    !isBoardPlacementValid({
      boardInstance: input.boardInstance,
      boardInstances: input.boardInstances,
      roomWidthCm: input.roomWidthCm,
      roomDepthCm: input.roomDepthCm,
      skipInstanceId: input.boardInstance.id,
    })
  ) {
    input.boardInstance.rotationDeg = previousRotation;
  }
}
