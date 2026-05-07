import { resolveElectricalOperatingPoint } from "@/application/electrical/resolveElectricalOperatingPoint";
import type { PlannerFormState } from "@/application/planner/useCases/contracts";
import type {
  BoardDefinition,
  ElectricalOperatingPoint,
} from "@/domain/contracts";

type SyncDriveStateInput = {
  ledId: string;
  board: Partial<BoardDefinition>;
  preserveField: "voltageV" | "currentA";
  driveWiring: { seriesCount: number; parallelCount: number };
};

type SyncDriveStateResult = {
  mode: "constantVoltage" | "constantCurrent";
  operation: ElectricalOperatingPoint;
  formPatch: Partial<Pick<PlannerFormState, "voltageV" | "currentA">>;
  wiringPatch: { seriesCount: number; parallelCount: number };
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Resolve drive/electrical state updates for planner form edits.
 *
 * This is intentionally app-layer orchestration:
 * - pick effective mode from the preserved field
 * - solve electrical operating point
 * - return a minimal patch for form/wiring updates
 *
 * @param {{
 *   ledId: string,
 *   board: Record<string, unknown>,
 *   preserveField: "voltageV" | "currentA",
 *   driveWiring: { seriesCount:number, parallelCount:number }
 * }} input
 */
export function syncDriveState(
  input: SyncDriveStateInput,
): SyncDriveStateResult {
  const mode =
    input.preserveField === "currentA" ? "constantCurrent" : "constantVoltage";

  const explicitSeries = Math.max(
    0,
    Math.floor(Number(input.board.seriesCount) || 0),
  );
  const explicitParallel = Math.max(
    0,
    Math.floor(Number(input.board.parallelCount) || 0),
  );

  const operation = resolveElectricalOperatingPoint({
    ledId: input.ledId,
    board: {
      ...input.board,
      seriesCount: explicitSeries || input.driveWiring.seriesCount,
      parallelCount: explicitParallel || input.driveWiring.parallelCount,
    },
    mode,
  });

  const formPatch: SyncDriveStateResult["formPatch"] = {};
  if (input.preserveField !== "voltageV") {
    formPatch.voltageV = round2(operation.boardVoltageV);
  }
  if (input.preserveField !== "currentA") {
    formPatch.currentA = round2(operation.boardCurrentA);
  }

  return {
    mode,
    operation,
    formPatch,
    wiringPatch: {
      seriesCount: operation.seriesCount,
      parallelCount: operation.parallelCount,
    },
  };
}
