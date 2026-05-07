import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { resolveSpectralDatasetForLed } from "@/catalog/spectralCatalog";
import { normalizeToMax, computeSpectralWeighting } from "@/domain/spectral/math";
import { resolveElectricalOperatingPoint } from "@/application/electrical/resolveElectricalOperatingPoint";
import { estimateLedPhotonOutput } from "@/application/photons/estimatePhotonOutput";
import { normalizeBoardPlannerEmitters } from "@/application/planner/boardPlannerEmitters";
import { photonSpdFromPpf } from "@/domain/spectral/radiantCalibration";
import { estimateBoardCctFromEmitters } from "@/application/planner/estimateBoardCct";

const NM_MIN = 280;
const NM_MAX = 840;

function createEmptySpectrum() {
  const wavelengthNm = [];
  const values = [];
  for (let wavelength = NM_MIN; wavelength <= NM_MAX; wavelength += 1) {
    wavelengthNm.push(wavelength);
    values.push(0);
  }
  return { wavelengthNm, values };
}

function groupEmittersByGrid(emitters) {
  const uniqueX = [...new Set(emitters.map((emitter) => Number(emitter.xMm) || 0))].sort(
    (left, right) => left - right,
  );
  const uniqueY = [...new Set(emitters.map((emitter) => Number(emitter.yMm) || 0))].sort(
    (left, right) => left - right,
  );
  const byPosition = new Map();
  for (const emitter of emitters) {
    byPosition.set(`${Number(emitter.xMm) || 0}:${Number(emitter.yMm) || 0}`, emitter);
  }
  return { uniqueX, uniqueY, byPosition };
}

/**
 * Build Board Planner preview output for enriched emitter-level editing and
 * mixed spectrum analysis.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   selectedEmitterId?: string
 * }} input
 */
export function buildBoardPlannerPreviewSnapshot(input) {
  const board = normalizeBoardDefinition(input.board);
  const emitters = normalizeBoardPlannerEmitters(board);
  const photonSpectrum = createEmptySpectrum();
  const warnings = [];
  const errors = [];
  let totalPhotonFlux = 0;
  const resolvedEmitterElectrical = [];
  const emitterFluxRows = [];

  for (const emitter of emitters) {
    const emitterElectrical = resolveElectricalOperatingPoint({
      ledId: emitter.ledType,
      board: {
        ...board,
        voltageV: Number(emitter.drive.voltageV) || 0,
        currentA: Number(emitter.drive.currentA) || 0,
        temperatureC: Number(emitter.drive.temperatureC) || 25,
        seriesCount: 1,
        parallelCount: 1,
        ledCount: 1,
      },
      mode:
        emitter.drive.driveMode === "constantCurrent"
          ? "constantCurrent"
          : "constantVoltage",
    });

    const emitterPhoton = estimateLedPhotonOutput({
      ledId: emitter.ledType,
      currentMA: emitterElectrical.perEmitterCurrentMA,
      solderPointTempC: Number(emitter.drive.temperatureC) || 25,
    });
    resolvedEmitterElectrical.push({
      ledForwardVoltageV: Number(emitterElectrical.perEmitterForwardVoltageV) || 0,
      ledCurrentA: (Number(emitterElectrical.perEmitterCurrentMA) || 0) / 1000,
    });

    const spectralDataset = resolveSpectralDatasetForLed(emitter.ledType, { stepNm: 1 });
    if (!spectralDataset) {
      warnings.push({
        code: "SPECTRAL_DATASET_NOT_FOUND",
        message: `No spectral dataset found for emitter LED ${emitter.ledType}.`,
        severity: "warning",
        field: "emitters",
      });
      continue;
    }

    try {
      const emitterSpectrum = photonSpdFromPpf(
        {
          wavelengthNm: spectralDataset.wavelengthNm,
          intensityRel: spectralDataset.intensityRel,
        },
        Math.max(0, emitterPhoton.perEmitterPpfUmolS),
      );
      for (let index = 0; index < photonSpectrum.wavelengthNm.length; index += 1) {
        const wavelength = photonSpectrum.wavelengthNm[index];
        const localIndex = emitterSpectrum.wavelengthNm.indexOf(wavelength);
        if (localIndex >= 0) {
          photonSpectrum.values[index] +=
            Number(emitterSpectrum.intensityUmolSPerNm[localIndex]) || 0;
        }
      }
      totalPhotonFlux += Math.max(0, emitterPhoton.perEmitterPpfUmolS);
      emitterFluxRows.push({
        ledType: emitter.ledType,
        photonFluxUmolS: Math.max(0, emitterPhoton.perEmitterPpfUmolS),
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

  const relativeSpectrumValues = normalizeToMax(photonSpectrum.values);
  const spectralStats = computeSpectralWeighting({
    wavelengthNm: photonSpectrum.wavelengthNm,
    values: photonSpectrum.values,
  });

  const cctEstimate = estimateBoardCctFromEmitters(emitterFluxRows);
  if (cctEstimate.warningCode) {
    warnings.push({
      code: cctEstimate.warningCode,
      message: "CCT cannot be estimated while photon flux is zero.",
      severity: "warning",
      field: "emitters",
    });
  }

  const explicitSeriesCount = Math.floor(Number(input.board?.seriesCount) || 0);
  const explicitParallelCount = Math.floor(Number(input.board?.parallelCount) || 0);
  const boardSeriesCount = Math.max(1, explicitSeriesCount || Math.floor(Number(board.seriesCount) || 0) || 1);
  const boardParallelCount = Math.max(
    1,
    explicitParallelCount || Math.floor(Number(board.parallelCount) || 0) || 1,
  );

  let estimatedBoardVoltageV;
  let estimatedBoardCurrentA;
  const electricalByEmitterId = new Map();
  for (let index = 0; index < emitters.length; index += 1) {
    electricalByEmitterId.set(emitters[index].id, resolvedEmitterElectrical[index]);
  }

  const { uniqueX, uniqueY, byPosition } = groupEmittersByGrid(emitters);
  const hasEmitters = emitters.length > 0;
  const gridMatchesBoardWiring =
    uniqueX.length === boardParallelCount && uniqueY.length === boardSeriesCount;

  if (!hasEmitters) {
    estimatedBoardVoltageV = 0;
    estimatedBoardCurrentA = 0;
  } else if (gridMatchesBoardWiring) {
    let summedStringVoltages = 0;
    let summedStringCurrents = 0;
    for (const columnX of uniqueX) {
      let stringVoltageV = 0;
      let stringCurrentA = 0;
      let stringLedCount = 0;
      for (const rowY of uniqueY) {
        const emitter = byPosition.get(`${columnX}:${rowY}`);
        if (!emitter) continue;
        const electrical = electricalByEmitterId.get(emitter.id);
        stringVoltageV += electrical?.ledForwardVoltageV || 0;
        stringCurrentA += electrical?.ledCurrentA || 0;
        stringLedCount += 1;
      }
      if (stringLedCount > 0) {
        summedStringVoltages += stringVoltageV;
        summedStringCurrents += stringCurrentA / stringLedCount;
      }
    }
    estimatedBoardVoltageV =
      boardParallelCount > 0 ? summedStringVoltages / boardParallelCount : 0;
    estimatedBoardCurrentA = summedStringCurrents;
  } else {
    warnings.push({
      code: "WIRING_GRID_MISMATCH",
      message:
        "Emitter grid does not match configured series/parallel counts. Board V/I estimate uses explicit board values.",
      severity: "warning",
      field: "emitters",
    });
    estimatedBoardVoltageV = Number(input.board?.voltageV) || Number(board.voltageV) || 0;
    estimatedBoardCurrentA = Number(input.board?.currentA) || Number(board.currentA) || 0;
  }

  const estimatedBoardVoltageResolvedV = Number(estimatedBoardVoltageV) || 0;
  const estimatedBoardCurrentResolvedA = Number(estimatedBoardCurrentA) || 0;
  const estimatedBoardPowerW = estimatedBoardVoltageResolvedV * estimatedBoardCurrentResolvedA;

  return {
    emitters,
    selectedEmitter: emitters.find((emitter) => emitter.id === input.selectedEmitterId) ?? null,
    aggregatePhotonSpectrum: photonSpectrum,
    aggregateRelativeSpectrum: {
      wavelengthNm: photonSpectrum.wavelengthNm,
      values: relativeSpectrumValues,
    },
    totalPhotonFlux,
    spectralStats,
    cct: {
      valueK: cctEstimate.cctK,
      method: "photon-flux-weighted-led-cct",
      confidence: "low",
      warningCode: cctEstimate.warningCode,
    },
    cctK: cctEstimate.cctK,
    boardElectricalEstimate: {
      boardVoltageV: estimatedBoardVoltageResolvedV,
      boardCurrentA: estimatedBoardCurrentResolvedA,
      inputPowerW: estimatedBoardPowerW,
      seriesCount: boardSeriesCount,
      parallelCount: boardParallelCount,
    },
    warnings,
    errors,
    board: {
      widthMm: board.widthMm,
      depthMm: board.depthMm,
    },
  };
}
