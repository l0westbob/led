import {
  estimateBoardPpfUmolS,
  estimateLedPpfUmolS,
} from "@/domain/ledV2Model";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { resolveLedDefinition } from "@/catalog/ledCatalog";
import { resolveElectricalOperatingPoint } from "@/application/electrical/resolveElectricalOperatingPoint";
import type {
  BoardDefinition,
  ElectricalOperatingPoint,
  LedDefinition,
  PhotonOutputEstimate,
} from "@/domain/contracts";

function calibrationSourceForLed(led: LedDefinition) {
  const cal = led?.spectrumCalibration;
  if (cal?.ppfUmolS) return "ppf-anchor";
  if (cal?.luminousFluxLm) return "lumen-anchor";
  return "reference";
}

/**
 * @param {{
 *   ledId: string,
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   electrical?: import("@/domain/contracts").ElectricalOperatingPoint
 * }} input
 * @returns {import("@/domain/contracts").PhotonOutputEstimate}
 */
export function estimateBoardPhotonOutput(input: {
  ledId: string;
  board: Partial<BoardDefinition>;
  electrical?: ElectricalOperatingPoint;
}): PhotonOutputEstimate {
  const led = resolveLedDefinition(input.ledId);
  const board = normalizeBoardDefinition(input.board);
  const electrical =
    input.electrical ??
    resolveElectricalOperatingPoint({
      ledId: input.ledId,
      board,
      mode: "constantVoltage",
    });

  if (!led) {
    return {
      perEmitterPpfUmolS: 0,
      boardPpfUmolS: 0,
      isEstimated: true,
      calibrationSource: "unknown",
      note: `Unknown LED id: ${input.ledId}`,
    };
  }

  const boardEstimate = estimateBoardPpfUmolS(led.id, {
    inputPowerW: electrical.inputPowerW,
    currentMA: electrical.perEmitterCurrentMA,
    solderPointTempC: board.temperatureC,
  });
  const fixturePhotonFlux = Math.max(0, boardEstimate.ppfUmolS);
  const perEmitterPpfUmolS =
    board.ledCount > 0 ? fixturePhotonFlux / board.ledCount : 0;

  return {
    perEmitterPpfUmolS,
    boardPpfUmolS: fixturePhotonFlux,
    isEstimated: boardEstimate.isEstimated,
    calibrationSource: calibrationSourceForLed(led),
    note: boardEstimate.note ?? "",
  };
}

/**
 * @param {{
 *   ledId: string,
 *   currentMA: number,
 *   solderPointTempC: number
 * }} input
 * @returns {import("@/domain/contracts").PhotonOutputEstimate}
 */
export function estimateLedPhotonOutput(input: {
  ledId: string;
  currentMA: number;
  solderPointTempC: number;
}): PhotonOutputEstimate {
  const led = resolveLedDefinition(input.ledId);
  if (!led) {
    return {
      perEmitterPpfUmolS: 0,
      boardPpfUmolS: 0,
      isEstimated: true,
      calibrationSource: "unknown",
      note: `Unknown LED id: ${input.ledId}`,
    };
  }

  const estimate = estimateLedPpfUmolS(led.id, {
    currentMA: input.currentMA,
    solderPointTempC: input.solderPointTempC,
  });

  return {
    perEmitterPpfUmolS: Math.max(0, estimate.ppfUmolS),
    boardPpfUmolS: Math.max(0, estimate.ppfUmolS),
    isEstimated: estimate.isEstimated,
    calibrationSource: calibrationSourceForLed(led),
    note: estimate.note ?? "",
  };
}
