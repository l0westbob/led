import { estimateLedPhotonOutput } from "@/application/photons/estimatePhotonOutput";
import { resolvePhotonKernel } from "@/application/spectral/spectralCore";
import {
  computeSpectralWeighting,
  normalizeToMax,
} from "@/domain/spectral/math";
import type { BoardPreviewEmitterElectricalRow } from "@/application/planner/boardPreviewElectrical";
import type { AppIssue, BoardEmitter } from "@/domain/contracts";

export const BOARD_PREVIEW_NM_MIN = 280;
export const BOARD_PREVIEW_NM_MAX = 840;

type BoardPreviewSpectrumSeries = {
  wavelengthNm: number[];
  values: number[];
};

function createEmptySpectrum(
  nmMin: number,
  nmMax: number,
): BoardPreviewSpectrumSeries {
  const wavelengthNm: number[] = [];
  const values: number[] = [];
  for (let wavelength = nmMin; wavelength <= nmMax; wavelength += 1) {
    wavelengthNm.push(wavelength);
    values.push(0);
  }
  return { wavelengthNm, values };
}

/**
 * @param {number[]} accumulatorValues
 * @param {number[]} kernelValues
 * @param {number} scale
 */
function accumulateScaledSpectrum(
  accumulatorValues: number[],
  kernelValues: number[],
  scale: number,
) {
  const safeScale = Number(scale) || 0;
  for (
    let wavelengthIndex = 0;
    wavelengthIndex < accumulatorValues.length;
    wavelengthIndex += 1
  ) {
    accumulatorValues[wavelengthIndex] +=
      (Number(kernelValues[wavelengthIndex]) || 0) * safeScale;
  }
}

/**
 * Build aggregate board-preview spectra from per-emitter photon output.
 *
 * @param {{
 *   emitters: import("@/domain/contracts").BoardEmitter[],
 *   emitterElectricalRows: Array<{emitterId:string,perEmitterCurrentMA:number}>,
 *   nmMin?: number,
 *   nmMax?: number
 * }} input
 */
export function buildBoardPreviewSpectrum(input: {
  emitters: BoardEmitter[];
  emitterElectricalRows: BoardPreviewEmitterElectricalRow[];
  nmMin?: number;
  nmMax?: number;
}) {
  const nmMin = Number(input.nmMin ?? BOARD_PREVIEW_NM_MIN);
  const nmMax = Number(input.nmMax ?? BOARD_PREVIEW_NM_MAX);
  const photonSpectrum = createEmptySpectrum(nmMin, nmMax);
  const warnings: AppIssue[] = [];
  const errors: AppIssue[] = [];
  const emitterFluxRows: Array<{ ledType: string; photonFluxUmolS: number }> =
    [];
  const electricalByEmitterId = new Map(
    input.emitterElectricalRows.map((row) => [row.emitterId, row]),
  );
  let totalPhotonFlux = 0;

  for (const emitter of input.emitters) {
    const emitterElectrical = electricalByEmitterId.get(emitter.id);
    const emitterPhoton = estimateLedPhotonOutput({
      ledId: emitter.ledType,
      currentMA: emitterElectrical?.perEmitterCurrentMA ?? 0,
      solderPointTempC: Number(emitter.drive.temperatureC) || 25,
    });

    const kernelResult = resolvePhotonKernel({
      ledId: emitter.ledType,
      nmMin,
      nmMax,
    });
    if (!kernelResult.ok || !kernelResult.data) {
      warnings.push({
        code: "SPECTRAL_DATASET_NOT_FOUND",
        message: `No spectral dataset found for emitter LED ${emitter.ledType}.`,
        severity: "warning",
        field: "emitters",
      });
      continue;
    }

    try {
      const emitterPhotonFlux = Math.max(0, emitterPhoton.perEmitterPpfUmolS);
      accumulateScaledSpectrum(
        photonSpectrum.values,
        kernelResult.data.values,
        emitterPhotonFlux,
      );
      totalPhotonFlux += emitterPhotonFlux;
      emitterFluxRows.push({
        ledType: emitter.ledType,
        photonFluxUmolS: emitterPhotonFlux,
      });
    } catch (error) {
      errors.push({
        code: "EMITTER_SPECTRUM_CALCULATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        severity: "error",
        field: "emitters",
      });
    }
  }

  return {
    photonSpectrum,
    relativeSpectrum: {
      wavelengthNm: photonSpectrum.wavelengthNm,
      values: normalizeToMax(photonSpectrum.values),
    },
    totalPhotonFlux,
    spectralStats: computeSpectralWeighting({
      wavelengthNm: photonSpectrum.wavelengthNm,
      values: photonSpectrum.values,
    }),
    emitterFluxRows,
    warnings,
    errors,
  };
}
