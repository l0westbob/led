import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { buildPlannerSnapshot } from "@/application/planner/buildPlannerSnapshot";

/**
 * Build deterministic benchmark rows for fixed board-count scenarios.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   boardInstances?: Array<Record<string, unknown>>,
 *   resolutionCm: number,
 *   driveMode: "constantVoltage" | "constantCurrent"
 * }} input
 * @returns {Array<{ boardCount:number, emitterCount:number, cellCount:number, averageMs:number }>}
 */
export function buildBenchmarkRows(input) {
  const scenarioBoardCounts = [1, 2, 4, 8];
  const roundsPerScenario = 3;
  const baseBoard = normalizeBoardDefinition(input.board);
  const baseInstances = Array.isArray(input.boardInstances)
    ? input.boardInstances
    : [];
  const rows = [];

  for (const boardCount of scenarioBoardCounts) {
    let totalMs = 0;
    let cells = 0;
    let emitters = 0;

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
              ledType: baseBoard.ledType,
              widthMm: baseBoard.widthMm,
              depthMm: baseBoard.depthMm,
              ledCount: baseBoard.ledCount,
              columns: baseBoard.columns,
              rows: baseBoard.rows,
              spacingXMm: baseBoard.spacingXMm,
              spacingYMm: baseBoard.spacingYMm,
              emitters: baseBoard.emitters,
              xCm: baseBoard.roomWidthCm * 0.5,
              yCm: baseBoard.roomDepthCm * 0.5,
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
      });
      totalMs += snapshot.summary.calculationMs;
      cells = snapshot.summary.cellCount;
      emitters = snapshot.emitters.length;
    }

    rows.push({
      boardCount,
      emitterCount: emitters,
      cellCount: cells,
      averageMs: totalMs / roundsPerScenario,
    });
  }

  return rows;
}
