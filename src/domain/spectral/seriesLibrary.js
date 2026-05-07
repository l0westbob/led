/**
 * Spectral series library (digitized from datasheets).
 *
 * Source: `all_series.json` contains 1 nm samples from 400–800 nm (inclusive)
 * normalized per-series. We keep 1 nm for plotting, but provide a canonical
 * 5 nm downsample for calculations (to match action curves).
 *
 * Notes:
 * - All series are treated as *relative spectral power distribution* (SPD).
 * - Normalization is preserved (relative), so any weighted integrals are also
 *   relative unless you later scale the SPD to absolute radiant flux.
 */

import ALL_SERIES from "./all_series.json";

/**
 * @typedef {{ nm:number, value:number }} SpectralSample
 * @typedef {{ wavelengthNm:number[], intensityRel:number[] }} Spectrum
 */

const NM_MIN = 400;
const NM_MAX = 800;
const NM_STEP_1 = 1;
const NM_STEP_5 = 5;

/**
 * Convert the JSON "sample objects" into dense arrays.
 * @param {SpectralSample[]} samples
 * @returns {Spectrum}
 */
function toDenseSpectrum(samples) {
  const valueByNm = new Map();
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const nm = Number(s.nm);
    valueByNm.set(nm, Number(s.value));
  }

  const wavelengthNm = [];
  const intensityRel = [];
  for (let nm = NM_MIN; nm <= NM_MAX; nm += NM_STEP_1) {
    wavelengthNm.push(nm);
    intensityRel.push(Number(valueByNm.get(nm) ?? 0));
  }
  return { wavelengthNm, intensityRel };
}

/**
 * Downsample 1 nm spectrum to 5 nm using an average over each 5 nm bin.
 * This is stable and noise-resistant for digitized curves.
 *
 * @param {Spectrum} spectrum1nm
 * @returns {Spectrum}
 */
export function downsampleTo5nm(spectrum1nm) {
  const { wavelengthNm, intensityRel } = spectrum1nm;
  if (wavelengthNm.length !== intensityRel.length) {
    throw new Error("Spectrum arrays length mismatch");
  }

  const outWl = [];
  const outVal = [];

  const start = NM_MIN;
  const end = NM_MAX;

  for (let nm = start; nm <= end; nm += NM_STEP_5) {
    let sum = 0;
    let count = 0;

    // Average across [nm, nm+4] (inclusive) to represent that 5 nm bucket.
    for (let k = 0; k < NM_STEP_5; k += 1) {
      const target = nm + k;
      if (target > end) break;
      const idx = (target - NM_MIN) / NM_STEP_1;
      const i = idx | 0;
      const v = intensityRel[i];
      if (Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }

    if (count > 0) {
      outWl.push(nm);
      outVal.push(sum / count);
    }
  }

  return { wavelengthNm: outWl, intensityRel: outVal };
}

/**
 * List available series ids (keys from `all_series.json`).
 * @returns {string[]}
 */
export function listSeriesIds() {
  return Object.keys(ALL_SERIES.series ?? {}).sort();
}

/**
 * Get a digitized spectrum by id.
 *
 * @param {string} seriesId
 * @param {{ stepNm?: 1 | 5 }} [opts]
 * @returns {Spectrum}
 */
export function getSeriesSpectrum(seriesId, opts = {}) {
  const stepNm = opts.stepNm ?? 1;
  const samples = ALL_SERIES.series?.[seriesId];
  if (!samples) {
    throw new Error(`Unknown spectrum series: ${seriesId}`);
  }
  const dense = toDenseSpectrum(samples);
  if (stepNm === 1) return dense;
  if (stepNm === 5) return downsampleTo5nm(dense);
  throw new Error(`Unsupported stepNm: ${stepNm}`);
}
