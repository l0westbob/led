import { resolveLedContext } from "@/application/shared/resolveLedContext";
import {
  createFailureResult,
  createSuccessResult,
  type OperationResultV11,
} from "@/contracts/versioned/results";
import {
  photonSpdFromPpf,
  photonSpdFromRadiant,
  radiantSpdFromLumens,
} from "@/domain/spectral/radiantCalibration";
import { normalizeToMax } from "@/domain/spectral/math";
import type { SpectrumCalibration } from "@/domain/contracts";

type SpectrumGrid = { wavelengthNm: number[]; values: number[] };
type SpectrumValueKey = "intensityRel" | "intensityUmolSPerNm";
type ProjectableSpectrum = {
  wavelengthNm: number[];
  intensityRel?: number[];
  intensityUmolSPerNm?: number[];
};

const ledSpectrumCache = new Map<string, SpectrumGrid>();
const photonKernelCache = new Map<string, SpectrumGrid>();

function projectSpectrumToGrid(
  spectrum: ProjectableSpectrum,
  nmMin: number,
  nmMax: number,
  valueKey: SpectrumValueKey,
): SpectrumGrid {
  const valuesByWavelength = new Map<number, number>();
  const sourceValues = spectrum[valueKey] ?? [];
  if (spectrum) {
    for (
      let sampleIndex = 0;
      sampleIndex < spectrum.wavelengthNm.length;
      sampleIndex += 1
    ) {
      valuesByWavelength.set(
        Number(spectrum.wavelengthNm[sampleIndex]),
        Number(sourceValues[sampleIndex] ?? 0),
      );
    }
  }
  const wavelengthNm: number[] = [];
  const values: number[] = [];
  for (let wavelength = nmMin; wavelength <= nmMax; wavelength += 1) {
    wavelengthNm.push(wavelength);
    values.push(valuesByWavelength.get(wavelength) ?? 0);
  }
  return { wavelengthNm, values };
}

/**
 * Resolve the display spectrum for one LED in relative or photon mode.
 *
 * @param {{
 *   ledId: string,
 *   mode: "relative"|"photon",
 *   stepNm?: 1|5,
 *   nmMin?: number,
 *   nmMax?: number
 * }} input
 * @returns {ReturnType<typeof createSuccessResult> | ReturnType<typeof createFailureResult>}
 */
export function resolveLedDisplaySpectrum(input: {
  ledId: string;
  mode: "relative" | "photon";
  stepNm?: 1 | 5;
  nmMin?: number;
  nmMax?: number;
}): OperationResultV11<SpectrumGrid> {
  const stepNm = input.stepNm ?? 1;
  const nmMin = Number(input.nmMin ?? 280);
  const nmMax = Number(input.nmMax ?? 840);
  const mode = input.mode === "photon" ? "photon" : "relative";
  const cacheKey = `${input.ledId}|${mode}|${stepNm}|${nmMin}|${nmMax}`;
  if (ledSpectrumCache.has(cacheKey)) {
    return createSuccessResult({
      data: ledSpectrumCache.get(cacheKey),
    });
  }

  const ledContext = resolveLedContext({ ledId: input.ledId, stepNm });
  if (!ledContext.ok || !ledContext.led || !ledContext.spectrum) {
    return createFailureResult({
      warnings: ledContext.warnings,
      errors: ledContext.errors,
    });
  }

  const led = ledContext.led;
  const spectrum = ledContext.spectrum;
  if (mode === "relative") {
    const projectedRelative = projectSpectrumToGrid(
      { ...spectrum, intensityRel: normalizeToMax(spectrum.intensityRel) },
      nmMin,
      nmMax,
      "intensityRel",
    );
    ledSpectrumCache.set(cacheKey, projectedRelative);
    return createSuccessResult({
      data: projectedRelative,
      warnings: ledContext.warnings,
    });
  }

  const calibration: Partial<SpectrumCalibration> =
    led.spectrumCalibration ?? {};
  let photonSpectrum;
  const luminousFluxLm = Number(calibration.luminousFluxLm);
  const ppfUmolS = Number(calibration.ppfUmolS);
  if (Number.isFinite(luminousFluxLm)) {
    const radiantSpectrum = radiantSpdFromLumens(spectrum, luminousFluxLm);
    photonSpectrum = photonSpdFromRadiant(radiantSpectrum);
  } else if (Number.isFinite(ppfUmolS)) {
    photonSpectrum = photonSpdFromPpf(spectrum, ppfUmolS);
  } else {
    return createFailureResult({
      warnings: [
        ...ledContext.warnings,
        {
          code: "MISSING_CALIBRATION_ANCHOR",
          message: `LED ${led.id} has no lumen or ppf anchor for photon mode.`,
          severity: "warning",
          field: "ledType",
        },
      ],
      errors: [],
    });
  }

  const projectedPhoton = projectSpectrumToGrid(
    {
      wavelengthNm: photonSpectrum.wavelengthNm,
      intensityUmolSPerNm: photonSpectrum.intensityUmolSPerNm,
    },
    nmMin,
    nmMax,
    "intensityUmolSPerNm",
  );
  ledSpectrumCache.set(cacheKey, projectedPhoton);
  return createSuccessResult({
    data: projectedPhoton,
    warnings: ledContext.warnings,
  });
}

/**
 * Resolve a cached photon kernel (1 µmol/s normalized) for fast emitter-level
 * aggregation in the board preview.
 *
 * @param {{ ledId:string, nmMin?:number, nmMax?:number }} input
 * @returns {ReturnType<typeof createSuccessResult> | ReturnType<typeof createFailureResult>}
 */
export function resolvePhotonKernel(input: {
  ledId: string;
  nmMin?: number;
  nmMax?: number;
}): OperationResultV11<SpectrumGrid> {
  const nmMin = Number(input.nmMin ?? 280);
  const nmMax = Number(input.nmMax ?? 840);
  const cacheKey = `${input.ledId}|kernel|${nmMin}|${nmMax}`;
  if (photonKernelCache.has(cacheKey)) {
    return createSuccessResult({
      data: photonKernelCache.get(cacheKey),
    });
  }

  const ledContext = resolveLedContext({ ledId: input.ledId, stepNm: 1 });
  if (!ledContext.ok || !ledContext.spectrum) {
    return createFailureResult({
      warnings: ledContext.warnings,
      errors: ledContext.errors,
    });
  }
  const kernelSpectrum = photonSpdFromPpf(ledContext.spectrum, 1);
  const projectedKernel = projectSpectrumToGrid(
    {
      wavelengthNm: kernelSpectrum.wavelengthNm,
      intensityUmolSPerNm: kernelSpectrum.intensityUmolSPerNm,
    },
    nmMin,
    nmMax,
    "intensityUmolSPerNm",
  );
  photonKernelCache.set(cacheKey, projectedKernel);
  return createSuccessResult({
    data: projectedKernel,
    warnings: ledContext.warnings,
  });
}

/**
 * Clear all spectral caches (used by tests/debug tooling).
 */
export function clearSpectralCoreCaches() {
  ledSpectrumCache.clear();
  photonKernelCache.clear();
}
