import { estimateBoardPpfUmolS, estimateLedPpfUmolS } from "@/domain/ledV2Model";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { resolveElectricalOperatingPoint } from "@/application/electrical/resolveElectricalOperatingPoint";
import { resolveLedContext } from "@/application/shared/resolveLedContext";

function calibrationSourceForLed(led) {
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
export function estimateBoardPhotonOutput(input) {
  const ledContext = resolveLedContext({ ledId: input.ledId, stepNm: 5 });
  const led = ledContext.led;
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
      note: ledContext.errors[0]?.message ?? "Unknown LED definition.",
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
export function estimateLedPhotonOutput(input) {
  const ledContext = resolveLedContext({ ledId: input.ledId, stepNm: 5 });
  const led = ledContext.led;
  if (!led) {
    return {
      perEmitterPpfUmolS: 0,
      boardPpfUmolS: 0,
      isEstimated: true,
      calibrationSource: "unknown",
      note: ledContext.errors[0]?.message ?? "Unknown LED definition.",
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
