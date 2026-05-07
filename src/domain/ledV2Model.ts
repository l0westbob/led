import {
  estimateLedOutput,
  getPreferredReference,
} from "@/domain/led/ledOutputModel";
import { LED_CURVES } from "@/domain/led/ledCurves";
import { LED_LIBRARY_V2 } from "@/domain/led/ledDefinitions";
import { estimateBasePpfFromCalibrationLookup } from "@/domain/spectral/basePpfCalibration";
import type {
  LedDefinition,
  LedReference,
  NumericCurvePoint,
} from "@/domain/contracts";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Linear interpolation over a piecewise line defined by `points`.
 * Points are `[x, y]` pairs with monotonically increasing x.
 *
 * @param {Array<[number, number]>} points
 * @param {number} x
 * @returns {number}
 */
export function interpolatePiecewiseLinear(
  points: NumericCurvePoint[],
  x: number,
) {
  if (!points || points.length === 0) return 0;
  if (points.length === 1) return points[0][1];

  if (x <= points[0][0]) return points[0][1];
  const last = points.length - 1;
  if (x >= points[last][0]) return points[last][1];

  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return lerp(y0, y1, t);
    }
  }

  return points[last][1];
}

/**
 * Calculates an estimated photon flux (PPF) for a single LED package in umol/s.
 *
 * Notes:
 * - Uses `reference.ppfUmolS` when available and scales it by relative curves
 *   for current and solder-point temperature.
 * - If reference PPF is not available, returns 0 and marks it as estimated.
 *   (We can add a lumen->PPF estimate later, but that needs a clear policy.)
 *
 * @param {string} ledId
 * @param {{ currentMA: number, solderPointTempC: number }} params
 * @returns {{ ppfUmolS: number, isEstimated: boolean, note?: string }}
 */
export function estimateLedPpfUmolS(
  ledId: string,
  params: { currentMA: number; solderPointTempC: number },
) {
  const led = LED_LIBRARY_V2[ledId];
  if (!led) {
    return { ppfUmolS: 0, isEstimated: true, note: "Unknown LED id." };
  }

  const reference: Partial<LedReference> = led.reference ?? {};
  const basePpf = Number(reference.ppfUmolS);
  const basePpfFallback = estimateBasePpfFromCalibrationLookup(led);
  const basePpfEffective =
    Number.isFinite(basePpf) && basePpf > 0 ? basePpf : basePpfFallback;
  if (!Number.isFinite(basePpfEffective) || basePpfEffective <= 0) {
    return {
      ppfUmolS: 0,
      isEstimated: true,
      note:
        reference.note ??
        "No PPF reference in V2 library and no spectrum calibration available.",
    };
  }

  const curveSet = LED_CURVES[led.curveSetId];
  const currentMA = clamp(params.currentMA, 0, 1000);
  const solderPointTempC = clamp(params.solderPointTempC, -40, 200);

  let currentRel = 1;
  const byCurrent = curveSet?.relativePpfByCurrentMA;
  if (byCurrent?.points?.length) {
    const pct = interpolatePiecewiseLinear(byCurrent.points, currentMA);
    currentRel = pct / (byCurrent.normalizedAt?.y ?? 100);
  }

  let tempRel = 1;
  const byTemp = curveSet?.relativePpfBySolderPointTempC;
  if (byTemp?.points?.length) {
    const pct = interpolatePiecewiseLinear(byTemp.points, solderPointTempC);
    tempRel = pct / (byTemp.normalizedAt?.y ?? 100);
  }

  const efficiency = Number.isFinite(led.systemEfficiency)
    ? led.systemEfficiency
    : 1;

  return {
    ppfUmolS: basePpfEffective * currentRel * tempRel * efficiency,
    isEstimated:
      Number.isFinite(basePpf) && basePpf > 0
        ? reference.source !== "datasheet" &&
          reference.source !== "datasheetBinMidpoint"
        : true,
    note: reference.note ?? "Estimated from digitized spectrum calibration.",
  };
}

/**
 * Estimates total board photon flux (PPF) in umol/s from V2 metadata.
 *
 * Rationale:
 * - We generally know board input power (V * A), but we do NOT know per-diode
 *   current without the series/parallel wiring model.
 * - When available, PPE (umol/J) is the most robust way to estimate total PPF:
 *   `PPF_total = inputPowerW * PPE`.
 *
 * @param {string} ledId
 * @param {{ inputPowerW: number, solderPointTempC: number, currentMA?: number }} params
 * @returns {{ ppfUmolS: number, isEstimated: boolean, note?: string }}
 */
export function estimateBoardPpfUmolS(
  ledId: string,
  params: {
    inputPowerW: number;
    solderPointTempC: number;
    currentMA?: number;
  },
) {
  const led = LED_LIBRARY_V2[ledId];
  if (!led) {
    return { ppfUmolS: 0, isEstimated: true, note: "Unknown LED id." };
  }

  const reference: Partial<LedReference> = led.reference ?? {};
  const inputPowerW = Number(params.inputPowerW);
  if (!Number.isFinite(inputPowerW) || inputPowerW <= 0) {
    return { ppfUmolS: 0, isEstimated: true, note: "Invalid input power." };
  }

  const curveSet = LED_CURVES[led.curveSetId];
  const solderPointTempC = clamp(params.solderPointTempC, -40, 200);

  let tempRel = 1;
  const byTemp = curveSet?.relativePpfBySolderPointTempC;
  if (byTemp?.points?.length) {
    const pct = interpolatePiecewiseLinear(byTemp.points, solderPointTempC);
    tempRel = pct / (byTemp.normalizedAt?.y ?? 100);
  }

  const efficiency = Number.isFinite(led.systemEfficiency)
    ? led.systemEfficiency
    : 1;

  const ppeUmolJ = Number(reference.ppeUmolJ);
  if (Number.isFinite(ppeUmolJ) && ppeUmolJ > 0) {
    return {
      ppfUmolS: inputPowerW * ppeUmolJ * tempRel * efficiency,
      isEstimated:
        reference.source !== "datasheet" &&
        reference.source !== "datasheetBinMidpoint",
      note: reference.note,
    };
  }

  // Spectrum-based fallback (calibrate at 65 mA, then infer PPE at that point).
  const basePpf = estimateBasePpfFromCalibrationLookup(led);
  if (Number.isFinite(basePpf) && basePpf > 0) {
    const calCurrentMA = Number(led.spectrumCalibration?.currentMA ?? 65);
    const perLedV = Number(
      getPreferredReference(led, { preferHomepageTypical: true })
        ?.forwardVoltageV,
    );
    const calPowerW =
      ((Number.isFinite(calCurrentMA) ? calCurrentMA : 65) / 1000) *
      (Number.isFinite(perLedV) ? perLedV : 2.7);
    const ppeEstimated = calPowerW > 0 ? basePpf / calPowerW : 0;
    if (ppeEstimated > 0) {
      return {
        ppfUmolS: inputPowerW * ppeEstimated * tempRel * efficiency,
        isEstimated: true,
        note: "Estimated via digitized spectrum calibration (lumens/PPF anchor) -> inferred PPE.",
      };
    }
  }

  // Fallback: per-LED PPF curve scaled by a supplied currentMA, then multiplied
  // by estimated LED count handled by the caller. This keeps old behavior
  // available, but should not be the primary path.
  const currentMA = Number(params.currentMA);
  if (Number.isFinite(currentMA) && currentMA > 0) {
    return estimateLedPpfUmolS(ledId, {
      currentMA,
      solderPointTempC,
    });
  }

  return {
    ppfUmolS: 0,
    isEstimated: true,
    note: reference.note ?? "No PPE reference in V2 library.",
  };
}

function estimateSeriesCount(led: LedDefinition, boardVoltageV: number) {
  const reference = getPreferredReference(led, { preferHomepageTypical: true });
  const perLedV = Number(reference?.forwardVoltageV);
  if (!Number.isFinite(perLedV) || perLedV <= 0) return 1;
  const raw = boardVoltageV / perLedV;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.max(1, Math.round(raw));
}

function estimateWiringFromPair(
  led: LedDefinition,
  ledCount: number,
  boardVoltageV: number,
  boardCurrentA: number,
  solderPointTempC: number,
) {
  const reference = getPreferredReference(led, { preferHomepageTypical: true });
  const perLedVRef = Number(reference?.forwardVoltageV);
  if (!Number.isFinite(perLedVRef) || perLedVRef <= 0) {
    return { seriesCount: 1, parallelCount: 1 };
  }

  const baseSeries = Math.max(1, Math.round(boardVoltageV / perLedVRef));
  const minSeries = Math.max(1, baseSeries - 8);
  const maxSeries = Math.min(ledCount, baseSeries + 8);

  let bestSeries = baseSeries;
  let bestParallel = Math.max(1, Math.round(ledCount / baseSeries));
  let bestError = Number.POSITIVE_INFINITY;

  for (
    let seriesCount = minSeries;
    seriesCount <= maxSeries;
    seriesCount += 1
  ) {
    const parallelCount = Math.max(1, Math.round(ledCount / seriesCount));
    const perStringA = boardCurrentA / parallelCount;
    const perStringMA = perStringA * 1000;
    if (!Number.isFinite(perStringMA) || perStringMA <= 0) continue;

    const perLed = estimateLedOutput(led, {
      currentMA: perStringMA,
      solderPointTempC,
    });

    const predictedBoardV = perLed.forwardVoltageV * seriesCount;
    const error = Math.abs(predictedBoardV - boardVoltageV);

    if (error < bestError) {
      bestError = error;
      bestSeries = seriesCount;
      bestParallel = parallelCount;
    }
  }

  return { seriesCount: bestSeries, parallelCount: bestParallel };
}

/**
 * Estimates the companion electrical variable for a board when driven as:
 * - constant current: user edits boardCurrentA -> derive boardVoltageV
 * - constant voltage: user edits boardVoltageV -> derive boardCurrentA
 *
 * Important:
 * - Without a wiring model, we assume a series/parallel split derived from
 *   the current board voltage and the LED's typical Vf at the reference point.
 * - This is primarily to keep the UI consistent and physically plausible.
 *
 * @param {string} ledId
 * @param {{
 *   mode: "constantCurrent" | "constantVoltage",
 *   boardVoltageV: number,
 *   boardCurrentA: number,
 *   ledCount: number,
 *   seriesCount?: number,
 *   parallelCount?: number,
 *   solderPointTempC: number
 * }} params
 * @returns {{ boardVoltageV: number, boardCurrentA: number, seriesCount: number, parallelCount: number }}
 */
export function syncBoardElectrical(
  ledId: string,
  params: {
    mode: "constantCurrent" | "constantVoltage";
    boardVoltageV: number;
    boardCurrentA: number;
    ledCount: number;
    seriesCount?: number;
    parallelCount?: number;
    solderPointTempC: number;
  },
) {
  const led = LED_LIBRARY_V2[ledId];
  const ledCount = Math.max(1, Math.floor(params.ledCount || 1));
  const solderPointTempC = params.solderPointTempC ?? 25;

  if (!led) {
    return {
      boardVoltageV: params.boardVoltageV,
      boardCurrentA: params.boardCurrentA,
      seriesCount: 1,
      parallelCount: 1,
    };
  }

  const boardVoltageV = Math.max(0, Number(params.boardVoltageV) || 0);
  const boardCurrentA = Math.max(0, Number(params.boardCurrentA) || 0);

  const hintedSeries = Math.max(0, Math.floor(params.seriesCount || 0));
  const hintedParallel = Math.max(0, Math.floor(params.parallelCount || 0));

  let seriesCount = hintedSeries;
  let parallelCount = hintedParallel;

  if (seriesCount <= 0 || parallelCount <= 0) {
    if (boardVoltageV > 0 && boardCurrentA > 0) {
      const estimated = estimateWiringFromPair(
        led,
        ledCount,
        boardVoltageV,
        boardCurrentA,
        solderPointTempC,
      );
      seriesCount = estimated.seriesCount;
      parallelCount = estimated.parallelCount;
    } else {
      seriesCount = estimateSeriesCount(led, boardVoltageV || 48);
      parallelCount = Math.max(1, Math.round(ledCount / seriesCount));
    }
  }

  if (params.mode === "constantVoltage") {
    const perLedV = boardVoltageV / seriesCount;
    const perString = estimateLedOutput(led, {
      forwardVoltageV: perLedV,
      solderPointTempC,
    });
    const boardA = (perString.currentMA / 1000) * parallelCount;
    return {
      boardVoltageV,
      boardCurrentA: boardA,
      seriesCount,
      parallelCount,
    };
  }

  const perStringA = boardCurrentA / parallelCount;
  const perStringMA = perStringA * 1000;
  const perLed = estimateLedOutput(led, {
    currentMA: perStringMA,
    solderPointTempC,
  });
  const boardV = perLed.forwardVoltageV * seriesCount;

  return {
    boardVoltageV: boardV,
    boardCurrentA,
    seriesCount,
    parallelCount,
  };
}
