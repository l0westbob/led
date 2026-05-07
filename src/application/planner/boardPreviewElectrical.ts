import { resolveElectricalOperatingPoint } from "@/application/electrical/resolveElectricalOperatingPoint";
import type { BoardDefinition, BoardEmitter } from "@/domain/contracts";

export type BoardPreviewEmitterElectricalRow = {
  emitterId: string;
  ledForwardVoltageV: number;
  ledCurrentA: number;
  perEmitterCurrentMA: number;
};

/**
 * Resolve per-emitter electrical rows used by board preview spectrum and wiring
 * estimates.
 *
 * @param {{
 *   board: import("@/domain/contracts").BoardDefinition,
 *   emitters: import("@/domain/contracts").BoardEmitter[]
 * }} input
 * @returns {Array<{
 *   emitterId:string,
 *   ledForwardVoltageV:number,
 *   ledCurrentA:number,
 *   perEmitterCurrentMA:number
 * }>}
 */
export function resolveBoardPreviewEmitterElectricalRows(input: {
  board: BoardDefinition;
  emitters: BoardEmitter[];
}): BoardPreviewEmitterElectricalRow[] {
  return input.emitters.map((emitter) => {
    const emitterElectrical = resolveElectricalOperatingPoint({
      ledId: emitter.ledType,
      board: {
        ...input.board,
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

    return {
      emitterId: emitter.id,
      ledForwardVoltageV:
        Number(emitterElectrical.perEmitterForwardVoltageV) || 0,
      ledCurrentA: (Number(emitterElectrical.perEmitterCurrentMA) || 0) / 1000,
      perEmitterCurrentMA: Number(emitterElectrical.perEmitterCurrentMA) || 0,
    };
  });
}
