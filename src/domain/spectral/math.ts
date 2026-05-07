import {
  ACTION_DIN_5031,
  ACTION_MCCREE,
  ACTION_PAR,
  ACTION_PBAR,
  SPECTRAL_WAVELENGTH_NM,
} from "./actionCurves";

export type SampledSpectrum = {
  wavelengthNm: number[];
  values: number[];
};

export function integrateTrapezoid(
  x: ReadonlyArray<number>,
  y: ReadonlyArray<number>,
): number {
  let sum = 0;
  for (let i = 1; i < x.length; i += 1) {
    const dx = x[i] - x[i - 1];
    sum += ((y[i] ?? 0) + (y[i - 1] ?? 0)) * 0.5 * dx;
  }
  return sum;
}

export function normalizeToMax(arr: ReadonlyArray<number>): number[] {
  let max = 0;
  for (let i = 0; i < arr.length; i += 1) {
    max = Math.max(max, Number(arr[i] ?? 0));
  }
  if (!Number.isFinite(max) || max <= 0) return arr.map(() => 0);
  return arr.map((v) => Number(v ?? 0) / max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function weightsOnGrid(
  actionValues: ReadonlyArray<number>,
  wavelengthNm: ReadonlyArray<number>,
): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < SPECTRAL_WAVELENGTH_NM.length; i += 1) {
    map.set(SPECTRAL_WAVELENGTH_NM[i], Number(actionValues[i] ?? 0));
  }
  return wavelengthNm.map((wl) => map.get(wl) ?? 0);
}

export function expandActionCurveTo1nm(
  actionValues: ReadonlyArray<number>,
  nmMin: number,
  nmMax: number,
): SampledSpectrum {
  const map = new Map<number, number>();
  for (let i = 0; i < SPECTRAL_WAVELENGTH_NM.length; i += 1) {
    map.set(SPECTRAL_WAVELENGTH_NM[i], Number(actionValues[i] ?? 0));
  }

  const wavelengthNm: number[] = [];
  const values: number[] = [];
  for (let nm = nmMin; nm <= nmMax; nm += 1) {
    const exact = map.get(nm);
    if (exact != null) {
      wavelengthNm.push(nm);
      values.push(exact);
      continue;
    }
    const lo = Math.floor(nm / 5) * 5;
    const hi = lo + 5;
    const t = (nm - lo) / 5;
    wavelengthNm.push(nm);
    values.push(lerp(map.get(lo) ?? 0, map.get(hi) ?? 0, t));
  }

  return { wavelengthNm, values };
}

export function computeSpectralWeighting(spectrum: SampledSpectrum) {
  const x = spectrum.wavelengthNm ?? [];
  const s = spectrum.values ?? [];
  const total = x.length > 0 ? integrateTrapezoid(x, s) : 0;
  const wMccree = weightsOnGrid(ACTION_MCCREE, x);
  const wDin = weightsOnGrid(ACTION_DIN_5031, x);
  const wPar = weightsOnGrid(ACTION_PAR, x);
  const wPbar = weightsOnGrid(ACTION_PBAR, x);

  const mccree = integrateTrapezoid(
    x,
    s.map((vv, i) => vv * (wMccree[i] ?? 0)),
  );
  const din = integrateTrapezoid(
    x,
    s.map((vv, i) => vv * (wDin[i] ?? 0)),
  );
  const par = integrateTrapezoid(
    x,
    s.map((vv, i) => vv * (wPar[i] ?? 0)),
  );
  const pbar = integrateTrapezoid(
    x,
    s.map((vv, i) => vv * (wPbar[i] ?? 0)),
  );

  return {
    total,
    mccree,
    din,
    par,
    pbar,
    mccreeRatio: total > 0 ? mccree / total : 0,
    dinRatio: total > 0 ? din / total : 0,
    parRatio: total > 0 ? par / total : 0,
    pbarRatio: total > 0 ? pbar / total : 0,
  };
}
