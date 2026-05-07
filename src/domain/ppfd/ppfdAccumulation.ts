import { resolveFixtureOffsetsMm } from "@/domain/ppfd/fixtureLayout";
import { addQuantizedStampToGrid } from "@/domain/ppfd/ppfdStampCache";
import type { PpfdBoard, SourceBins } from "@/domain/ppfd/ppfdEstimatorTypes";
import type { QuantizedStampEntry } from "@/domain/ppfd/ppfdStampCache";

type FixtureOffsetCell = {
  x: number;
  y: number;
};

export function resolveFixtureOffsetsCell(input: {
  board: PpfdBoard;
  invCellMm: number;
  roomWidthMm: number;
  roomDepthMm: number;
  explicitOffsetsMm?: Array<{ xMm: number; yMm: number }>;
}): FixtureOffsetCell[] {
  const boardCenterXCell = input.roomWidthMm * 0.5 * input.invCellMm;
  const boardCenterYCell = input.roomDepthMm * 0.5 * input.invCellMm;

  return resolveFixtureOffsetsMm({
    board: input.board,
    fixtureCount: input.board.boardCount,
    explicitOffsetsMm: input.explicitOffsetsMm,
  }).map((offset) => ({
    x: boardCenterXCell + (Number(offset.xMm) || 0) * input.invCellMm,
    y: boardCenterYCell + (Number(offset.yMm) || 0) * input.invCellMm,
  }));
}

export function accumulateQuantizedSources(input: {
  valuesUnits: Uint32Array;
  gridWidth: number;
  gridDepth: number;
  fixtureOffsetsCell: FixtureOffsetCell[];
  sources: SourceBins;
  sourceStamps: Array<QuantizedStampEntry | null>;
}): void {
  const {
    valuesUnits,
    gridWidth,
    gridDepth,
    fixtureOffsetsCell,
    sources,
    sourceStamps,
  } = input;

  for (const fixtureOffset of fixtureOffsetsCell) {
    const fixtureCellX = fixtureOffset.x;
    const fixtureCellY = fixtureOffset.y;
    for (let sourceIndex = 0; sourceIndex < sources.count; sourceIndex += 1) {
      const stampEntry = sourceStamps[sourceIndex];
      if (stampEntry === null) continue;

      // Math.floor() is used instead of `| 0` to correctly handle negative
      // fractional coordinates (truncation toward zero != floor for negatives).
      const centerX = Math.floor(fixtureCellX + sources.xCell[sourceIndex]);
      const centerY = Math.floor(fixtureCellY + sources.yCell[sourceIndex]);

      const radiusCells = stampEntry.radiusCells;

      if (
        centerX + radiusCells < 0 ||
        centerX - radiusCells >= gridWidth ||
        centerY + radiusCells < 0 ||
        centerY - radiusCells >= gridDepth
      ) {
        continue;
      }

      addQuantizedStampToGrid({
        valuesUnits,
        gridWidth,
        gridDepth,
        stampEntry,
        centerX,
        centerY,
      });
    }
  }
}
