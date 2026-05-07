import type { AppIssue, BoardEmitter } from "@/domain/contracts";

/**
 * Apply bulk emitter configuration to selected emitter IDs.
 *
 * @param {{
 *   emitters:Array<import("@/domain/contracts").BoardEmitter>,
 *   selectedEmitterIds:string[],
 *   apply:{ ledType:boolean, driveMode:boolean, voltageV:boolean, currentA:boolean, temperatureC:boolean },
 *   values:{ ledType:string, driveMode:"constantVoltage"|"constantCurrent", voltageV:number, currentA:number, temperatureC:number },
 *   roundToTwoDecimals:(value:number)=>number
 * }} input
 */
export function applyBulkEmitterConfiguration(input: {
  emitters: BoardEmitter[];
  selectedEmitterIds: string[];
  apply: {
    ledType: boolean;
    driveMode: boolean;
    voltageV: boolean;
    currentA: boolean;
    temperatureC: boolean;
  };
  values: {
    ledType: string;
    driveMode: "constantVoltage" | "constantCurrent";
    voltageV: number;
    currentA: number;
    temperatureC: number;
  };
  roundToTwoDecimals: (value: number) => number;
}): {
  ok: boolean;
  data?: { emitters: BoardEmitter[]; changedCount: number };
  errors?: AppIssue[];
} {
  const selectedEmitterIds = new Set(input.selectedEmitterIds ?? []);
  if (selectedEmitterIds.size === 0) {
    return {
      ok: false,
      errors: [
        {
          code: "NO_EMITTER_SELECTION",
          message: "Select at least one emitter for bulk configuration.",
        },
      ],
    };
  }

  let changedCount = 0;
  const nextEmitters = input.emitters.map((emitter) => {
    if (!selectedEmitterIds.has(emitter.id)) return emitter;
    changedCount += 1;
    return {
      ...emitter,
      ledType: input.apply.ledType ? input.values.ledType : emitter.ledType,
      drive: {
        ...emitter.drive,
        driveMode: input.apply.driveMode
          ? input.values.driveMode
          : emitter.drive.driveMode,
        voltageV: input.apply.voltageV
          ? input.roundToTwoDecimals(Number(input.values.voltageV) || 0)
          : emitter.drive.voltageV,
        currentA: input.apply.currentA
          ? input.roundToTwoDecimals(Number(input.values.currentA) || 0)
          : emitter.drive.currentA,
        temperatureC: input.apply.temperatureC
          ? Number(input.values.temperatureC) || 25
          : emitter.drive.temperatureC,
      },
    };
  });

  return {
    ok: true,
    data: { emitters: nextEmitters, changedCount },
  };
}
