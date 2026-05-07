import { syncDriveState } from "@/application/planner/syncDriveState";
import type {
  BoardConfigDraft,
  BoardConfigResolution,
} from "@/application/planner/useCases/contracts";
import type { BoardDefinition, BoardInstance } from "@/domain/contracts";

/**
 * Build the draft object used by the board-config modal.
 *
 * @param {import("@/domain/contracts").BoardInstance} boardInstance
 * @returns {{
 *   instanceId:string,
 *   driveMode:"constantVoltage"|"constantCurrent",
 *   voltageV:number,
 *   currentA:number,
 *   temperatureC:number,
 *   seriesCount:number,
 *   parallelCount:number
 * }}
 */
export function createBoardConfigDraft(
  boardInstance: BoardInstance,
): BoardConfigDraft {
  return {
    instanceId: boardInstance.id,
    ...boardInstance.drive,
  };
}

/**
 * Resolve a board-config draft into synchronized drive values.
 *
 * @param {{
 *   boardInstance: import("@/domain/contracts").BoardInstance,
 *   draft: Record<string, unknown>,
 *   preserveField: "voltageV" | "currentA"
 * }} input
 * @returns {{
 *   draftPatch: Record<string, number>,
 *   resolvedDrive: import("@/domain/contracts").BoardInstance["drive"]
 * }}
 */
export function resolveBoardConfigDraft(input: {
  boardInstance: BoardInstance | BoardDefinition;
  draft: Partial<BoardConfigDraft>;
  preserveField: "voltageV" | "currentA";
}): BoardConfigResolution {
  const result = syncDriveState({
    ledId: input.boardInstance.ledType,
    board: {
      ...input.boardInstance,
      voltageV: Number(input.draft.voltageV) || 0,
      currentA: Number(input.draft.currentA) || 0,
      temperatureC: Number(input.draft.temperatureC) || 25,
      ledCount: input.boardInstance.ledCount,
      seriesCount: Number(input.draft.seriesCount) || 0,
      parallelCount: Number(input.draft.parallelCount) || 0,
    },
    preserveField: input.preserveField,
    driveWiring: {
      seriesCount: Number(input.draft.seriesCount) || 0,
      parallelCount: Number(input.draft.parallelCount) || 0,
    },
  });

  const draftPatch: BoardConfigResolution["draftPatch"] = {
    seriesCount: result.wiringPatch.seriesCount,
    parallelCount: result.wiringPatch.parallelCount,
  };
  if (input.preserveField !== "voltageV") {
    draftPatch.voltageV = Number(result.formPatch.voltageV) || 0;
  }
  if (input.preserveField !== "currentA") {
    draftPatch.currentA = Number(result.formPatch.currentA) || 0;
  }

  return {
    draftPatch,
    resolvedDrive: {
      driveMode:
        input.draft.driveMode === "constantCurrent"
          ? "constantCurrent"
          : "constantVoltage",
      voltageV:
        input.preserveField === "voltageV"
          ? Number(input.draft.voltageV) || 0
          : Number(result.formPatch.voltageV) || 0,
      currentA:
        input.preserveField === "currentA"
          ? Number(input.draft.currentA) || 0
          : Number(result.formPatch.currentA) || 0,
      temperatureC: Number(input.draft.temperatureC) || 25,
      seriesCount: result.wiringPatch.seriesCount,
      parallelCount: result.wiringPatch.parallelCount,
    },
  };
}

/**
 * Resolve which electrical field should be preserved for recalculation after a
 * draft field edit.
 *
 * @param {{
 *   changedField:string,
 *   draft: Record<string, unknown>
 * }} input
 * @returns {"voltageV"|"currentA"}
 */
export function resolveDraftPreserveField(input: {
  changedField: string;
  draft: Partial<BoardConfigDraft>;
}): "voltageV" | "currentA" {
  if (input.changedField === "currentA") {
    return "currentA";
  }
  if (input.changedField === "voltageV") {
    return "voltageV";
  }
  return input.draft.driveMode === "constantCurrent" ? "currentA" : "voltageV";
}
