import ALL_SERIES from "@/domain/spectral/all_series.json";
import { getSeriesSpectrum, listSeriesIds } from "@/domain/spectral/seriesLibrary";
import { resolveLedDefinition } from "@/catalog/ledCatalog";

const NORMALIZATION = ALL_SERIES.normalization ?? "unknown";
const SOURCE = "digitized datasheet spectral series";

/**
 * @param {string} spectralSeriesId
 * @param {{ stepNm?: 1|5 }} [options]
 * @returns {import("@/domain/contracts").SpectralSeries}
 */
export function resolveSpectralDataset(spectralSeriesId, options = {}) {
  const stepNm = options.stepNm ?? 5;
  const spectrum = getSeriesSpectrum(spectralSeriesId, { stepNm });
  return {
    id: spectralSeriesId,
    wavelengthNm: spectrum.wavelengthNm,
    intensityRel: spectrum.intensityRel,
    stepNm,
    normalization: NORMALIZATION,
    source: SOURCE,
  };
}

/**
 * @param {string} ledId
 * @param {{ stepNm?: 1|5 }} [options]
 * @returns {import("@/domain/contracts").SpectralSeries|null}
 */
export function resolveSpectralDatasetForLed(ledId, options = {}) {
  const led = resolveLedDefinition(ledId);
  if (!led?.spectralSeriesId) return null;
  return resolveSpectralDataset(led.spectralSeriesId, options);
}

/**
 * @returns {string[]}
 */
export function listSpectralDatasetIds() {
  return listSeriesIds();
}
