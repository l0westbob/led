/**
 * Radiant calibration helpers.
 *
 * Many datasheets provide:
 * - A *relative* spectrum "relative intensity vs wavelength" (unitless).
 * - A photometric output (lumens) at a reference current/temperature.
 *
 * If the relative spectrum is a *relative radiant SPD* S(λ) (typical assumption),
 * then:
 *
 *   Φv [lm] = Km * ∫ Φe,λ(λ) [W/nm] * V(λ) dλ
 *
 * With Φe,λ(λ) = k * S(λ), we can solve for k and reconstruct an absolute
 * radiant spectrum (W/nm) up to the validity of the assumptions.
 *
 * This module does NOT apply plant action curves (McCree, DIN, etc.). It only
 * converts between relative SPD shapes and a photometrically anchored radiant SPD.
 */

import {
  LUMINOSITY_V_1NM,
  LUMINOSITY_V_1NM_START_NM,
  SPECTRAL_WAVELENGTH_NM,
} from "./actionCurves";

const KM_PHOTOPIC_LM_PER_W = 683;
const PLANCK_H_J_S = 6.62607015e-34;
const SPEED_OF_LIGHT_M_S = 299_792_458;
const AVOGADRO_PER_MOL = 6.02214076e23;

// µmol per mol
const UMOL_PER_MOL = 1e6;

type RelativeSpectrum = {
  wavelengthNm: number[];
  intensityRel: number[];
};

type RadiantSpectrum = {
  wavelengthNm: number[];
  intensityWPerNm: number[];
};

type PhotonSpectrum = {
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
 * Align a 5 nm curve (defined on `SPECTRAL_WAVELENGTH_NM`) to a target wavelength grid.
 * Missing wavelengths return 0.
 */
export function weightsOnGrid(
  actionValues: ArrayLike<number>,
  targetWavelengthNm: number[],
) {
  // Special-case the 1 nm V(λ) table to avoid building a huge map each call.
  if (actionValues === LUMINOSITY_V_1NM) {
    return targetWavelengthNm.map((wl) => {
      const i = Math.round(wl - LUMINOSITY_V_1NM_START_NM);
      if (i < 0 || i >= LUMINOSITY_V_1NM.length) return 0;
      return Number(LUMINOSITY_V_1NM[i] ?? 0);
    });
  }

  const map = new Map<number, number>();
  for (let i = 0; i < SPECTRAL_WAVELENGTH_NM.length; i += 1) {
    map.set(SPECTRAL_WAVELENGTH_NM[i], Number(actionValues[i] ?? 0));
  }
  return targetWavelengthNm.map((wl) => map.get(wl) ?? 0);
}

/**
 * Given a relative SPD (unitless) and a lumen anchor (lm),
 * reconstruct a radiant SPD (W per wavelength step, consistent with your grid units).
 *
 * Important:
 * - If `wavelengthNm` is in nm and you treat the samples as per-nm bins, the output
 *   is effectively W/nm at those points (up to discretization).
 * - The result is only as good as the assumption that the datasheet SPD is a
 *   relative *radiant* SPD (not photopically weighted).
 *
 * @param {{ wavelengthNm:number[], intensityRel:number[] }} spectrum
 * @param {number} lumens
 * @returns {{ wavelengthNm:number[], intensityWPerNm:number[] }}
 */
export function radiantSpdFromLumens(
  spectrum: RelativeSpectrum,
  lumens: number,
): RadiantSpectrum {
  const x = spectrum.wavelengthNm;
  const s = spectrum.intensityRel;
  if (
    !Array.isArray(x) ||
    !Array.isArray(s) ||
    x.length !== s.length ||
    x.length < 2
  ) {
    throw new Error("Invalid spectrum for calibration");
  }
  if (!Number.isFinite(lumens) || lumens <= 0) {
    throw new Error("Lumens must be a positive number");
  }

  const v = weightsOnGrid(LUMINOSITY_V_1NM, x);
  const denom = integrateTrapezoid(
    x,
    s.map((vv, i) => (vv ?? 0) * (v[i] ?? 0)),
  );
  if (!Number.isFinite(denom) || denom <= 0) {
    throw new Error("Cannot calibrate: spectrum*V(λ) integral is zero");
  }

  const k = lumens / (KM_PHOTOPIC_LM_PER_W * denom);
  return {
    wavelengthNm: x.slice(),
    intensityWPerNm: s.map((vv) => Number(vv ?? 0) * k),
  };
}

/**
 * Convert a radiant SPD (W/nm) into a photon SPD (µmol/s/nm).
 *
 * photons/s/nm = (W/nm) / (h*c/λ) = (W/nm) * λ / (h*c)
 * µmol/s/nm = photons/s/nm / Na * 1e6
 *
 * @param {{ wavelengthNm:number[], intensityWPerNm:number[] }} radiant
 * @returns {{ wavelengthNm:number[], intensityUmolSPerNm:number[] }}
 */
export function photonSpdFromRadiant(radiant: RadiantSpectrum): PhotonSpectrum {
  const x = radiant.wavelengthNm;
  const p = radiant.intensityWPerNm;
  if (!Array.isArray(x) || !Array.isArray(p) || x.length !== p.length) {
    throw new Error("Invalid radiant SPD");
  }
  const denom = PLANCK_H_J_S * SPEED_OF_LIGHT_M_S;
  const scale = UMOL_PER_MOL / AVOGADRO_PER_MOL;

  const out = new Array<number>(p.length);
  for (let i = 0; i < p.length; i += 1) {
    const wlM = Number(x[i] ?? 0) * 1e-9 || 0;
    const wPerNm = Number(p[i] ?? 0) || 0;
    out[i] = wlM > 0 ? (wPerNm * wlM * scale) / denom : 0;
  }
  return { wavelengthNm: x.slice(), intensityUmolSPerNm: out };
}

/**
 * Calibrate a digitized relative spectrum to a total photon flux (PPF, µmol/s).
 *
 * Assumption: the digitized "relative intensity vs wavelength" represents a
 * relative *radiant* SPD shape S(λ). We convert it to a relative photon SPD by
 * multiplying by λ (since photons/J scales with λ), then scale to match PPF.
 *
 * @param {{ wavelengthNm:number[], intensityRel:number[] }} spectrumRel
 * @param {number} ppfUmolS total photon flux (µmol/s)
 * @returns {{ wavelengthNm:number[], intensityUmolSPerNm:number[] }}
 */
export function photonSpdFromPpf(
  spectrumRel: RelativeSpectrum,
  ppfUmolS: number,
): PhotonSpectrum {
  const x = spectrumRel.wavelengthNm;
  const s = spectrumRel.intensityRel;
  if (
    !Array.isArray(x) ||
    !Array.isArray(s) ||
    x.length !== s.length ||
    x.length < 2
  ) {
    throw new Error("Invalid spectrum for PPF calibration");
  }
  if (!Number.isFinite(ppfUmolS) || ppfUmolS <= 0) {
    throw new Error("PPF must be a positive number");
  }

  // Relative photon spectrum shape (unitless): S(λ) * λ
  const photonRel = s.map(
    (vv, i) => (Number(vv ?? 0) || 0) * (Number(x[i] ?? 0) || 0),
  );
  const integral = integrateTrapezoid(x, photonRel);
  if (!Number.isFinite(integral) || integral <= 0) {
    throw new Error("Cannot calibrate: photonRel integral is zero");
  }
  const k = ppfUmolS / integral;
  return {
    wavelengthNm: x.slice(),
    intensityUmolSPerNm: photonRel.map((v) => v * k),
  };
}
