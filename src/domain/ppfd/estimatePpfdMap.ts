import { estimateWithFastPreviewEngine } from "@/domain/ppfd/fastPreviewEngine";
import { estimateWithReferenceEngine } from "@/domain/ppfd/referenceEngine";
import type {
  PpfdEngineName,
  PpfdEstimateInput,
  PpfdMapResult,
} from "@/domain/contracts";

/**
 * @param {{
 *   board: import("@/domain/BoardProfile").BoardProfile,
 *   emitters: Array<{xMm:number,yMm:number,type:string}>,
 *   resolutionCm: number,
 *   options?: {
 *     boardPhotonFlux: number,
 *     inputPowerW?: number,
 *     fixtureOffsetsMm?: Array<{xMm:number,yMm:number}>
 *   },
 *   engine?: PpfdEngineName
 * }} input
 * @returns {{
 *   map: import("@/domain/contracts").PpfdMapResult,
 *   engine: PpfdEngineName
 * }}
 */
export function estimatePpfdMap(input: PpfdEstimateInput): {
  map: PpfdMapResult;
  engine: PpfdEngineName;
} {
  const engine = input.engine === "reference" ? "reference" : "fast-preview";
  if (engine === "reference") {
    return {
      map: estimateWithReferenceEngine(input),
      engine,
    };
  }
  return {
    map: estimateWithFastPreviewEngine(input),
    engine,
  };
}

/**
 * Compare two PPFD maps and compute error metrics.
 *
 * @param {{
 *   baseline: import("@/domain/contracts").PpfdMapResult,
 *   candidate: import("@/domain/contracts").PpfdMapResult
 * }} input
 * @returns {{ mae:number, maxError:number, p95Error:number }}
 */
export function comparePpfdMaps(input: {
  baseline: PpfdMapResult;
  candidate: PpfdMapResult;
}) {
  const baselineUnits = input.baseline.valuesUnits;
  const candidateUnits = input.candidate.valuesUnits;
  const count = Math.min(baselineUnits.length, candidateUnits.length);
  if (count === 0) {
    return { mae: 0, maxError: 0, p95Error: 0 };
  }

  const absoluteErrors: number[] = [];
  let errorSum = 0;
  let maxError = 0;
  for (let cellIndex = 0; cellIndex < count; cellIndex += 1) {
    const baselineValue = baselineUnits[cellIndex] / input.baseline.valueScale;
    const candidateValue =
      candidateUnits[cellIndex] / input.candidate.valueScale;
    const errorMagnitude = Math.abs(candidateValue - baselineValue);
    absoluteErrors.push(errorMagnitude);
    errorSum += errorMagnitude;
    if (errorMagnitude > maxError) {
      maxError = errorMagnitude;
    }
  }
  absoluteErrors.sort((left, right) => left - right);
  const p95Index = Math.min(
    absoluteErrors.length - 1,
    Math.floor(absoluteErrors.length * 0.95),
  );
  return {
    mae: errorSum / absoluteErrors.length,
    maxError,
    p95Error: absoluteErrors[p95Index],
  };
}
