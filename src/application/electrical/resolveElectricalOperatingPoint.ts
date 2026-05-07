import { estimateLedOutput } from "@/domain/led/ledOutputModel";
import { syncBoardElectrical } from "@/domain/ledV2Model";
import { resolveLedDefinition } from "@/catalog/ledCatalog";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import type {
  AppIssue,
  BoardDefinition,
  ElectricalOperatingPoint,
} from "@/domain/contracts";

/**
 * @param {{
 *   boardVoltageV:number,
 *   boardCurrentA:number,
 *   perEmitterCurrentMA:number,
 *   perEmitterForwardVoltageV:number
 * }} input
 */
function resolveElectricalViolations(input: {
  boardVoltageV: number;
  boardCurrentA: number;
  perEmitterCurrentMA: number;
  perEmitterForwardVoltageV: number;
}): AppIssue[] {
  const violations: AppIssue[] = [];
  if (!Number.isFinite(input.boardVoltageV) || input.boardVoltageV < 0) {
    violations.push({
      code: "INVALID_BOARD_VOLTAGE",
      message: "Resolved board voltage is invalid.",
      severity: "error",
      field: "voltageV",
    });
  }
  if (!Number.isFinite(input.boardCurrentA) || input.boardCurrentA < 0) {
    violations.push({
      code: "INVALID_BOARD_CURRENT",
      message: "Resolved board current is invalid.",
      severity: "error",
      field: "currentA",
    });
  }
  if (
    !Number.isFinite(input.perEmitterCurrentMA) ||
    input.perEmitterCurrentMA < 0
  ) {
    violations.push({
      code: "INVALID_EMITTER_CURRENT",
      message: "Resolved emitter current is invalid.",
      severity: "warning",
      field: "currentA",
    });
  }
  if (
    !Number.isFinite(input.perEmitterForwardVoltageV) ||
    input.perEmitterForwardVoltageV < 0
  ) {
    violations.push({
      code: "INVALID_EMITTER_VOLTAGE",
      message: "Resolved emitter forward voltage is invalid.",
      severity: "warning",
      field: "voltageV",
    });
  }
  return violations;
}

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
export function resolveElectricalOperatingPoint(input: {
  ledId: string;
  board: Partial<BoardDefinition>;
  mode: "constantVoltage" | "constantCurrent";
}): ElectricalOperatingPoint {
  const led = resolveLedDefinition(input.ledId);
  const board = normalizeBoardDefinition(input.board);
  const mode =
    input.mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";

  if (!led) {
    const fallbackOutput: ElectricalOperatingPoint = {
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
      provenance: {
        mode,
        source: "fallback",
      },
      violations: [],
    };
    fallbackOutput.violations = resolveElectricalViolations(fallbackOutput);
    return fallbackOutput;
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

  const perStringCurrentA =
    synced.parallelCount > 0 ? synced.boardCurrentA / synced.parallelCount : 0;
  const perEmitterCurrentMA = perStringCurrentA * 1000;
  const perLed = estimateLedOutput(led, {
    currentMA: perEmitterCurrentMA,
    solderPointTempC: board.temperatureC,
    forwardVoltageV:
      synced.seriesCount > 0
        ? synced.boardVoltageV / synced.seriesCount
        : undefined,
  });

  const resolvedOutput: ElectricalOperatingPoint = {
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
    provenance: {
      mode,
      source: "syncBoardElectrical",
      wiringPolicy: hadExplicitWiring ? "explicit" : "inferred",
    },
    violations: [],
  };
  resolvedOutput.violations = resolveElectricalViolations(resolvedOutput);
  return resolvedOutput;
}
