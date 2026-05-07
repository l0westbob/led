import type { BoardPreviewEmitterElectricalRow } from "@/application/planner/boardPreviewElectrical";
import type {
  AppIssue,
  BoardDefinition,
  BoardEmitter,
} from "@/domain/contracts";

function groupEmittersByGrid(emitters: BoardEmitter[]) {
  const uniqueX = [
    ...new Set(emitters.map((emitter) => Number(emitter.xMm) || 0)),
  ].sort((left, right) => left - right);
  const uniqueY = [
    ...new Set(emitters.map((emitter) => Number(emitter.yMm) || 0)),
  ].sort((left, right) => left - right);
  const byPosition = new Map<string, BoardEmitter>();
  for (const emitter of emitters) {
    byPosition.set(
      `${Number(emitter.xMm) || 0}:${Number(emitter.yMm) || 0}`,
      emitter,
    );
  }
  return { uniqueX, uniqueY, byPosition };
}

/**
 * Estimate aggregate board electrical values from emitter rows when the
 * configured wiring matches the emitter grid.
 *
 * @param {{
 *   rawBoard?: Partial<import("@/domain/contracts").BoardDefinition>,
 *   board: import("@/domain/contracts").BoardDefinition,
 *   emitters: import("@/domain/contracts").BoardEmitter[],
 *   emitterElectricalRows: Array<{emitterId:string,ledForwardVoltageV:number,ledCurrentA:number}>
 * }} input
 */
export function estimateBoardPreviewWiring(input: {
  rawBoard?: Partial<BoardDefinition>;
  board: BoardDefinition;
  emitters: BoardEmitter[];
  emitterElectricalRows: BoardPreviewEmitterElectricalRow[];
}) {
  const explicitSeriesCount = Math.floor(
    Number(input.rawBoard?.seriesCount) || 0,
  );
  const explicitParallelCount = Math.floor(
    Number(input.rawBoard?.parallelCount) || 0,
  );
  const boardSeriesCount = Math.max(
    1,
    explicitSeriesCount ||
      Math.floor(Number(input.board.seriesCount) || 0) ||
      1,
  );
  const boardParallelCount = Math.max(
    1,
    explicitParallelCount ||
      Math.floor(Number(input.board.parallelCount) || 0) ||
      1,
  );
  const warnings: AppIssue[] = [];
  let estimatedBoardVoltageV;
  let estimatedBoardCurrentA;

  const electricalByEmitterId = new Map(
    input.emitterElectricalRows.map((row) => [row.emitterId, row]),
  );
  const { uniqueX, uniqueY, byPosition } = groupEmittersByGrid(input.emitters);
  const hasEmitters = input.emitters.length > 0;
  const gridMatchesBoardWiring =
    uniqueX.length === boardParallelCount &&
    uniqueY.length === boardSeriesCount;

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
    estimatedBoardVoltageV =
      Number(input.rawBoard?.voltageV) || Number(input.board.voltageV) || 0;
    estimatedBoardCurrentA =
      Number(input.rawBoard?.currentA) || Number(input.board.currentA) || 0;
  }

  const boardVoltageV = Number(estimatedBoardVoltageV) || 0;
  const boardCurrentA = Number(estimatedBoardCurrentA) || 0;

  return {
    boardElectricalEstimate: {
      boardVoltageV,
      boardCurrentA,
      inputPowerW: boardVoltageV * boardCurrentA,
      seriesCount: boardSeriesCount,
      parallelCount: boardParallelCount,
    },
    warnings,
  };
}
