import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { buildPlannerSnapshot } from "@/application/planner/buildPlannerSnapshot";
import type { BoardDefinition, BoardInstance } from "@/domain/contracts";

export type BenchmarkRow = {
  boardCount: number;
  emitterCount: number;
  cellCount: number;
  averageMs: number;
  mae: number | null;
  maxError: number | null;
  p95Error: number | null;
};

/**
 * Build deterministic benchmark rows for fixed board-count scenarios.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   boardInstances?: Array<Record<string, unknown>>,
 *   resolutionCm: number,
 *   driveMode: "constantVoltage" | "constantCurrent"
 * }} input
 * @returns {Array<{ boardCount:number, emitterCount:number, cellCount:number, averageMs:number, mae:number|null, maxError:number|null, p95Error:number|null }>}
 */
export function buildBenchmarkRows(input: {
  board: Partial<BoardDefinition>;
  boardInstances?: BoardInstance[];
  resolutionCm: number;
  driveMode: "constantVoltage" | "constantCurrent";
}): BenchmarkRow[] {
  const scenarioBoardCounts = [1, 2, 4, 8];
  const roundsPerScenario = 3;
  const baseBoard = normalizeBoardDefinition(input.board);
  const baseInstances = Array.isArray(input.boardInstances)
    ? input.boardInstances
    : [];
  const rows: BenchmarkRow[] = [];

  for (const boardCount of scenarioBoardCounts) {
    let totalMs = 0;
    let cells = 0;
    let emitters = 0;
    let totalMae = 0;
    let totalP95Error = 0;
    let maxObservedError = 0;
    let comparisonSamples = 0;

    for (let round = 0; round < roundsPerScenario; round += 1) {
      const scenarioBoard = {
        ...baseBoard,
        boardCount,
      };
      const scenarioInstances =
        baseInstances.length > 0
          ? Array.from({ length: boardCount }, (_, index) => {
              const seed = baseInstances[index % baseInstances.length];
              return {
                ...seed,
                id: `bench-${index + 1}`,
              };
            })
          : Array.from({ length: boardCount }, (_, index) => ({
              id: `bench-${index + 1}`,
              name: baseBoard.name,
              presetBoardId: baseBoard.id,
              ledType: baseBoard.ledType,
              widthMm: baseBoard.widthMm,
              depthMm: baseBoard.depthMm,
              ledCount: baseBoard.ledCount,
              columns: baseBoard.columns,
              rows: baseBoard.rows,
              spacingXMm: baseBoard.spacingXMm,
              spacingYMm: baseBoard.spacingYMm,
              emitters: [],
              xCm: baseBoard.roomWidthCm * 0.5,
              yCm: baseBoard.roomDepthCm * 0.5,
              rotationDeg: 0,
              drive: {
                driveMode: input.driveMode,
                voltageV: baseBoard.voltageV,
                currentA: baseBoard.currentA,
                temperatureC: baseBoard.temperatureC,
                seriesCount: baseBoard.seriesCount,
                parallelCount: baseBoard.parallelCount,
              },
            }));
      const snapshot = buildPlannerSnapshot({
        board: scenarioBoard,
        boardInstances: scenarioInstances,
        resolutionCm: input.resolutionCm,
        runReferenceComparison: true,
      });
      totalMs += snapshot.summary.calculationMs;
      cells = snapshot.summary.cellCount;
      emitters = snapshot.emitters.length;
      if (snapshot.summary.engineComparison) {
        totalMae += snapshot.summary.engineComparison.mae;
        totalP95Error += snapshot.summary.engineComparison.p95Error;
        maxObservedError = Math.max(
          maxObservedError,
          snapshot.summary.engineComparison.maxError,
        );
        comparisonSamples += 1;
      }
    }

    rows.push({
      boardCount,
      emitterCount: emitters,
      cellCount: cells,
      averageMs: totalMs / roundsPerScenario,
      mae: comparisonSamples > 0 ? totalMae / comparisonSamples : null,
      maxError: comparisonSamples > 0 ? maxObservedError : null,
      p95Error:
        comparisonSamples > 0 ? totalP95Error / comparisonSamples : null,
    });
  }

  return rows;
}
