import { seriesIdForLed } from "@/domain/spectral/spectralSeriesId";
import type { LedDefinition } from "@/domain/contracts";

const ESTIMATED_BASE_PPF_BY_SERIES_AND_LUMENS: Record<string, number> = {
  "LM301H-70CRI-3000K|lm:40": 0.532890049936,
  "LM301H-70CRI-3500K|lm:40": 0.531507947627,
  "LM301H-70CRI-4000K|lm:42": 0.5545080969,
  "LM301H-70CRI-5000K|lm:42": 0.555787848094,
  "LM301H-70CRI-5700K|lm:42": 0.557971510316,
  "LM301H-80CRI-2200K|lm:34": 0.510854011776,
  "LM301H-80CRI-2700K|lm:38": 0.520344259051,
  "LM301H-80CRI-3000K|lm:40": 0.561570064896,
  "LM301H-80CRI-3500K|lm:40": 0.561463215156,
  "LM301H-80CRI-4000K|lm:40": 0.553979657973,
  "LM301H-80CRI-5000K|lm:42": 0.600453603006,
  "LM301H-80CRI-5700K|lm:40": 0.565906215084,
  "LM301H-80CRI-6500K|lm:40": 0.560188778346,
  "LM301H-90CRI-2700K|lm:32": 0.509684105084,
  "LM301H-90CRI-3000K|lm:32": 0.502110383328,
  "LM301H-90CRI-3500K|lm:34": 0.513353409934,
  "LM301H-90CRI-4000K|lm:34": 0.505369707975,
  "LM301H-90CRI-5000K|lm:36": 0.535377585463,
  "LM301H-90CRI-5700K|lm:36": 0.544240427661,
  "LM301H-90CRI-6500K|lm:36": 0.54948707212,
};

/**
 * Estimate base PPF without importing the full spectral dataset at app startup.
 *
 * The lookup values are generated from `ppfEstimation.js`, which remains the
 * authoritative dataset-backed calculator for tests and recalibration work.
 *
 * @param {object} led
 * @returns {number}
 */
export function estimateBasePpfFromCalibrationLookup(led: LedDefinition) {
  const cal = led?.spectrumCalibration;
  if (!cal) return 0;

  const calibrationPpf = Number(cal.ppfUmolS);
  if (Number.isFinite(calibrationPpf) && calibrationPpf > 0) {
    return calibrationPpf;
  }

  const lumens = Number(cal.luminousFluxLm);
  if (!Number.isFinite(lumens) || lumens <= 0) return 0;

  const seriesId = seriesIdForLed(led);
  if (!seriesId) return 0;

  return (
    ESTIMATED_BASE_PPF_BY_SERIES_AND_LUMENS[`${seriesId}|lm:${lumens}`] ?? 0
  );
}
