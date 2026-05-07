import { PpfdEstimator } from "@/domain/PpfdEstimator";
import type { PpfdEstimateInput, PpfdMapResult } from "@/domain/contracts";

/**
 * Estimate a PPFD map with the optimized preview engine.
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
export function estimateWithFastPreviewEngine(
  input: Omit<PpfdEstimateInput, "engine">,
): PpfdMapResult {
  const estimator = new PpfdEstimator(
    input.board,
    input.emitters,
    input.resolutionCm,
    input.options ?? {},
  );
  return estimator.estimate();
}
