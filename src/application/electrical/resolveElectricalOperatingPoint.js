import { estimateLedOutput } from "@/domain/LedLibraryV2";
import { syncBoardElectrical } from "@/domain/ledV2Model";
import { resolveLedDefinition } from "@/catalog/ledCatalog";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";

/**
 * Resolve a board's operating point under either constant voltage or constant current.
 *
 * This service is intentionally electrical-only. It does not know how spectral
 * calibration or PPFD estimation works.
 *
 * @param {{
 *   ledId: string,
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   mode: "constantVoltage" | "constantCurrent"
 * }} input
 * @returns {import("@/domain/contracts").ElectricalOperatingPoint}
 */
export function resolveElectricalOperatingPoint(input) {
  const led = resolveLedDefinition(input.ledId);
  const board = normalizeBoardDefinition(input.board);
  const mode =
    input.mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";

  if (!led) {
    return {
      boardVoltageV: board.voltageV,
      boardCurrentA: board.currentA,
      seriesCount: Math.max(1, board.seriesCount || 1),
      parallelCount: Math.max(1, board.parallelCount || 1),
      perStringCurrentA: 0,
      perEmitterCurrentMA: 0,
      perEmitterForwardVoltageV: 0,
      inputPowerW: board.voltageV * board.currentA,
      usedExplicitWiring: false,
      usedInferredWiring: false,
      fallbackReason: "Unknown LED definition.",
    };
  }

  const hadExplicitWiring = board.seriesCount > 0 && board.parallelCount > 0;
  const synced = syncBoardElectrical(led.id, {
    mode,
    boardVoltageV: board.voltageV,
    boardCurrentA: board.currentA,
    ledCount: board.ledCount,
    seriesCount: board.seriesCount,
    parallelCount: board.parallelCount,
    solderPointTempC: board.temperatureC,
  });

  const perStringCurrentA = synced.parallelCount > 0
    ? synced.boardCurrentA / synced.parallelCount
    : 0;
  const perEmitterCurrentMA = perStringCurrentA * 1000;
  const perLed = estimateLedOutput(led, {
    currentMA: perEmitterCurrentMA,
    solderPointTempC: board.temperatureC,
    forwardVoltageV:
      synced.seriesCount > 0 ? synced.boardVoltageV / synced.seriesCount : undefined,
  });

  return {
    boardVoltageV: synced.boardVoltageV,
    boardCurrentA: synced.boardCurrentA,
    seriesCount: synced.seriesCount,
    parallelCount: synced.parallelCount,
    perStringCurrentA,
    perEmitterCurrentMA,
    perEmitterForwardVoltageV: perLed.forwardVoltageV,
    inputPowerW: synced.boardVoltageV * synced.boardCurrentA,
    usedExplicitWiring: hadExplicitWiring,
    usedInferredWiring: !hadExplicitWiring,
    fallbackReason: null,
  };
}
