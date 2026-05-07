import { resolveFixtureOffsetsMm } from "@/domain/ppfd/fixtureLayout";
import type { PpfdEstimateInput, PpfdMapResult } from "@/domain/contracts";

const PPFD_SCALE = 185000;
const VALUE_SCALE = 100;

/**
 * Reference PPFD engine used for correctness comparison.
 *
 * This implementation intentionally favors readability over speed:
 * - no source binning
 * - no quantized stamp reuse
 * - direct per-emitter accumulation for each fixture
 *
 * @param {{
 *   board: import("@/domain/BoardProfile").BoardProfile,
 *   emitters: Array<{xMm:number,yMm:number,type:string}>,
 *   resolutionCm: number,
 *   options?: {
 *     boardPhotonFlux: number,
 *     inputPowerW?: number,
 *     fixtureOffsetsMm?: Array<{xMm:number,yMm:number}>
 *   }
 * }} input
 * @returns {import("@/domain/contracts").PpfdMapResult}
 */
export function estimateWithReferenceEngine(
  input: Omit<PpfdEstimateInput, "engine">,
): PpfdMapResult {
  const board = input.board;
  const emitters = Array.isArray(input.emitters) ? input.emitters : [];
  const emitterCount = emitters.length;
  const resolutionCm = Math.max(1, Number(input.resolutionCm) || 1);
  const options: NonNullable<PpfdEstimateInput["options"]> = input.options ?? {
    boardPhotonFlux: Number.NaN,
  };

  const inputPowerW = Number.isFinite(Number(options.inputPowerW))
    ? Number(options.inputPowerW)
    : (Number(board.voltageV) || 0) * (Number(board.currentA) || 0);

  const boardPhotonFluxInput = Number(options.boardPhotonFlux);
  if (!Number.isFinite(boardPhotonFluxInput)) {
    throw new Error(
      "Reference PPFD engine requires options.boardPhotonFlux; resolve photon output before calling the geometry engine.",
    );
  }
  const boardPhotonFlux = Math.max(0, boardPhotonFluxInput);

  const gridWidth = Math.max(
    1,
    Math.floor((Number(board.roomWidthCm) || 0) / resolutionCm),
  );
  const gridDepth = Math.max(
    1,
    Math.floor((Number(board.roomDepthCm) || 0) / resolutionCm),
  );
  const cellCount = gridWidth * gridDepth;

  const valuesUnits = new Uint32Array(cellCount);
  const values = new Float32Array(cellCount);
  const cellMm = resolutionCm * 10;
  const boardHalfWidthMm = (Number(board.widthMm) || 0) * 0.5;
  const boardHalfDepthMm = (Number(board.depthMm) || 0) * 0.5;
  const roomHalfWidthMm = (Number(board.roomWidthCm) || 0) * 5;
  const roomHalfDepthMm = (Number(board.roomDepthCm) || 0) * 5;
  const distanceMm = Math.max(10, (Number(board.distanceCm) || 0) * 10);
  const distanceSquaredMm = distanceMm * distanceMm;
  const perEmitterScale =
    emitterCount > 0 ? (boardPhotonFlux / emitterCount) * PPFD_SCALE : 0;
  const sourceContributionScale = perEmitterScale * VALUE_SCALE;
  const roomDiagonalMm = Math.hypot(
    (Number(board.roomWidthCm) || 0) * 10,
    (Number(board.roomDepthCm) || 0) * 10,
  );
  const maxRadiusCells = Math.ceil((roomDiagonalMm * 0.5) / cellMm);

  const fixtureOffsetsMm = resolveFixtureOffsetsMm({
    board,
    explicitOffsetsMm: options.fixtureOffsetsMm,
  });

  if (sourceContributionScale <= 0 || emitterCount === 0) {
    return {
      values,
      valuesUnits,
      valueScale: VALUE_SCALE,
      averageUnits: 0,
      minUnits: 0,
      maxUnits: 0,
      gridWidth,
      gridDepth,
      average: 0,
      min: 0,
      max: 0,
      inputPower: inputPowerW,
      boardPhotonFlux,
      fixtureCount: fixtureOffsetsMm.length,
      cellCount,
      sourceCount: emitterCount,
      sourceBinCells: 1,
    };
  }

  for (const fixtureOffset of fixtureOffsetsMm) {
    for (const emitter of emitters) {
      const emitterWorldXmm =
        roomHalfWidthMm +
        (Number(fixtureOffset.xMm) || 0) +
        (Number(emitter.xMm) || 0) -
        boardHalfWidthMm;
      const emitterWorldYmm =
        roomHalfDepthMm +
        (Number(fixtureOffset.yMm) || 0) +
        (Number(emitter.yMm) || 0) -
        boardHalfDepthMm;

      const emitterGridX = emitterWorldXmm / cellMm;
      const emitterGridY = emitterWorldYmm / cellMm;

      const minGridX = Math.max(0, Math.floor(emitterGridX - maxRadiusCells));
      const maxGridX = Math.min(
        gridWidth - 1,
        Math.ceil(emitterGridX + maxRadiusCells),
      );
      const minGridY = Math.max(0, Math.floor(emitterGridY - maxRadiusCells));
      const maxGridY = Math.min(
        gridDepth - 1,
        Math.ceil(emitterGridY + maxRadiusCells),
      );

      for (let gridY = minGridY; gridY <= maxGridY; gridY += 1) {
        const deltaYmm = (gridY + 0.5 - emitterGridY) * cellMm;
        const deltaYmmSquared = deltaYmm * deltaYmm;
        const rowOffset = gridY * gridWidth;
        for (let gridX = minGridX; gridX <= maxGridX; gridX += 1) {
          const deltaXmm = (gridX + 0.5 - emitterGridX) * cellMm;
          const squaredDistance =
            deltaXmm * deltaXmm + deltaYmmSquared + distanceSquaredMm;
          const contributionUnits = Math.round(
            sourceContributionScale / squaredDistance,
          );
          if (contributionUnits <= 0) continue;
          valuesUnits[rowOffset + gridX] += contributionUnits;
        }
      }
    }
  }

  let totalUnits = 0;
  let minUnits = cellCount > 0 ? 0xffffffff : 0;
  let maxUnits = 0;
  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const units = valuesUnits[cellIndex];
    totalUnits += units;
    if (units < minUnits) minUnits = units;
    if (units > maxUnits) maxUnits = units;
    values[cellIndex] = units / VALUE_SCALE;
  }

  const averageUnits = cellCount > 0 ? Math.round(totalUnits / cellCount) : 0;
  return {
    values,
    valuesUnits,
    valueScale: VALUE_SCALE,
    averageUnits,
    minUnits: minUnits === 0xffffffff ? 0 : minUnits,
    maxUnits,
    gridWidth,
    gridDepth,
    average: averageUnits / VALUE_SCALE,
    min: (minUnits === 0xffffffff ? 0 : minUnits) / VALUE_SCALE,
    max: maxUnits / VALUE_SCALE,
    inputPower: inputPowerW,
    boardPhotonFlux,
    fixtureCount: fixtureOffsetsMm.length,
    cellCount,
    sourceCount: emitterCount,
    sourceBinCells: 1,
  };
}
