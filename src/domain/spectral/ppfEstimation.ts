/**
 * PPF estimation from digitized spectra + datasheet calibration anchors.
 *
 * Use case:
 * - Many LM301H variants provide a spectrum plot + a luminous-flux (lm) test point.
 * - EVO variants provide a spectrum plot + a PPF (µmol/s) test point.
 *
 * This module converts those anchors into a base PPF estimate for one LED package.
 * That base value can then be scaled by the V2 relative curves (current, temp).
 */

import { getSeriesSpectrum } from "./seriesLibrary";
import { seriesIdForLed } from "./spectralSeriesId";
import {
  photonSpdFromRadiant,
  radiantSpdFromLumens,
} from "./radiantCalibration";
import type { LedDefinition } from "@/domain/contracts";

export { seriesIdForLed };

type PhotonSpd = {
  wavelengthNm: number[];
  intensityUmolSPerNm: number[];
};

function integrateTrapezoid(x: number[], y: number[]) {
  let sum = 0;
  for (let i = 1; i < x.length; i += 1) {
    const dx = x[i] - x[i - 1];
    sum += ((y[i] ?? 0) + (y[i - 1] ?? 0)) * 0.5 * dx;
  }
  return sum;
}

/**
 * @param {{ wavelengthNm:number[], intensityUmolSPerNm:number[] }} photonSpd
 * @param {number} nmMin
 * @param {number} nmMax
 */
function integratePhotonRange(
  photonSpd: PhotonSpd,
  nmMin: number,
  nmMax: number,
) {
  const x = photonSpd.wavelengthNm;
  const y = photonSpd.intensityUmolSPerNm;
  const xx: number[] = [];
  const yy: number[] = [];
  for (let i = 0; i < x.length; i += 1) {
    const wl = x[i];
    if (wl >= nmMin && wl <= nmMax) {
      xx.push(wl);
      yy.push(y[i] ?? 0);
    }
  }
  if (xx.length < 2) return 0;
  return integrateTrapezoid(xx, yy);
}

/** @type {Map<string, number>} */
const cache = new Map<string, number>();

/**
 * Estimate base PPF (µmol/s) for a single LED package at the spectrum calibration point.
 *
 * Preference order:
 * 1) If calibration includes `ppfUmolS`, use it directly.
 * 2) Else if calibration includes `luminousFluxLm`, compute PPF by:
 *    relative spectrum -> calibrated radiant SPD -> photon SPD -> integrate 400..700 nm.
 *
 * @param {object} led
 * @returns {number} base PPF in µmol/s (0 when not possible)
 */
export function estimateBasePpfFromSpectrumCalibration(led: LedDefinition) {
  const cal = led?.spectrumCalibration;
  if (!cal) return 0;

  const calibrationPpf = Number(cal.ppfUmolS);
  if (Number.isFinite(calibrationPpf) && calibrationPpf > 0)
    return calibrationPpf;

  const lumens = Number(cal.luminousFluxLm);
  if (!Number.isFinite(lumens) || lumens <= 0) return 0;

  const seriesId = seriesIdForLed(led);
  if (!seriesId) return 0;

  const key = `${seriesId}|lm:${lumens}`;
  const hit = cache.get(key);
  if (hit != null) return hit;

  // Use 5 nm for performance and to match other calculations.
  const spectrumRel = getSeriesSpectrum(seriesId, { stepNm: 5 });
  const radiant = radiantSpdFromLumens(spectrumRel, lumens);
  const photon = photonSpdFromRadiant(radiant);

  // PPF is defined over PAR 400..700 nm.
  const ppf = integratePhotonRange(photon, 400, 700);
  cache.set(key, ppf);
  return ppf;
}
