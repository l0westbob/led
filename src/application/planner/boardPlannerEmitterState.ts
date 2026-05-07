import { resolveBoardConfigDraft } from "@/application/planner/boardConfigState";
import type { PlannerFormState } from "@/application/planner/useCases/contracts";
import type { BoardEmitter, BoardEmitterDrive } from "@/domain/contracts";

/**
 * Apply default LED drive values to emitters that match the board default LED.
 *
 * @param {{
 *   emitters:Array<import("@/domain/contracts").BoardEmitter>,
 *   boardDefaultLedType:string,
 *   defaultDrive:{driveMode:"constantVoltage"|"constantCurrent",voltageV:number,currentA:number,temperatureC:number},
 *   roundToTwoDecimals:(value:number)=>number
 * }} input
 */
export function applyDefaultDriveToMatchingEmitters(input: {
  emitters: BoardEmitter[];
  boardDefaultLedType: string;
  defaultDrive: BoardEmitterDrive;
  roundToTwoDecimals: (value: number) => number;
}): BoardEmitter[] {
  return input.emitters.map((emitter) => {
    if (emitter.ledType !== input.boardDefaultLedType) return emitter;
    return {
      ...emitter,
      drive: {
        ...emitter.drive,
        driveMode: input.defaultDrive.driveMode,
        voltageV: input.roundToTwoDecimals(
          Number(input.defaultDrive.voltageV) || 0,
        ),
        currentA: input.roundToTwoDecimals(
          Number(input.defaultDrive.currentA) || 0,
        ),
        temperatureC: Number(input.defaultDrive.temperatureC) || 25,
      },
    };
  });
}

/**
 * Resolve linked default emitter drive values for CV/CC interactions.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   draft: {driveMode:"constantVoltage"|"constantCurrent",voltageV:number,currentA:number,temperatureC:number},
 *   preserveField:"voltageV"|"currentA",
 *   roundToTwoDecimals:(value:number)=>number
 * }} input
 */
export function resolveDefaultEmitterDriveDraft(input: {
  board: PlannerFormState;
  draft: BoardEmitterDrive;
  preserveField: "voltageV" | "currentA";
  roundToTwoDecimals: (value: number) => number;
}): BoardEmitterDrive {
  const resolved = resolveBoardConfigDraft({
    boardInstance: {
      ...input.board,
      ledType: input.board.ledType,
      voltageV: Number(input.draft.voltageV) || 0,
      currentA: Number(input.draft.currentA) || 0,
      seriesCount: 1,
      parallelCount: 1,
      ledCount: 1,
      drive: {
        driveMode: input.draft.driveMode,
        voltageV: Number(input.draft.voltageV) || 0,
        currentA: Number(input.draft.currentA) || 0,
        temperatureC: Number(input.draft.temperatureC) || 25,
        seriesCount: 1,
        parallelCount: 1,
      },
    },
    draft: {
      ...input.draft,
      seriesCount: 1,
      parallelCount: 1,
    },
    preserveField: input.preserveField,
  });

  const nextDraft = {
    ...input.draft,
    ...resolved.draftPatch,
  };
  nextDraft.voltageV = input.roundToTwoDecimals(
    Number(nextDraft.voltageV) || 0,
  );
  nextDraft.currentA = input.roundToTwoDecimals(
    Number(nextDraft.currentA) || 0,
  );
  return nextDraft;
}
