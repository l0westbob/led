import { BoardProfile } from "@/domain/BoardProfile";
import { PpfdEstimator } from "@/domain/PpfdEstimator";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { resolveElectricalOperatingPoint } from "@/application/electrical/resolveElectricalOperatingPoint";
import { estimateBoardPhotonOutput } from "@/application/photons/estimatePhotonOutput";
import { validateBoardInput } from "@/application/planner/validation";
import { rotateEmittersWithBoard } from "@/domain/boardGeometry";

/**
 * Build one resolved instance simulation input.
 *
 * @param {{
 *   globalBoard: import("@/domain/contracts").BoardDefinition,
 *   boardInstance: Record<string, unknown>
 * }} input
 */
function resolveBoardInstanceContext(input) {
  const normalizedInstanceBoard = normalizeBoardDefinition({
    ...input.globalBoard,
    ledType: input.boardInstance.ledType ?? input.globalBoard.ledType,
    widthMm: input.boardInstance.widthMm ?? input.globalBoard.widthMm,
    depthMm: input.boardInstance.depthMm ?? input.globalBoard.depthMm,
    ledCount: input.boardInstance.ledCount ?? input.globalBoard.ledCount,
    columns: input.boardInstance.columns ?? input.globalBoard.columns,
    rows: input.boardInstance.rows ?? input.globalBoard.rows,
    spacingXMm: input.boardInstance.spacingXMm ?? input.globalBoard.spacingXMm,
    spacingYMm: input.boardInstance.spacingYMm ?? input.globalBoard.spacingYMm,
    emitters: input.boardInstance.emitters ?? input.globalBoard.emitters,
    voltageV: input.boardInstance.drive?.voltageV ?? input.globalBoard.voltageV,
    currentA: input.boardInstance.drive?.currentA ?? input.globalBoard.currentA,
    temperatureC:
      input.boardInstance.drive?.temperatureC ?? input.globalBoard.temperatureC,
    seriesCount:
      input.boardInstance.drive?.seriesCount ?? input.globalBoard.seriesCount,
    parallelCount:
      input.boardInstance.drive?.parallelCount ?? input.globalBoard.parallelCount,
  });

  const instanceBoardProfile = new BoardProfile(normalizedInstanceBoard);
  const generatedEmitters = instanceBoardProfile.generateEmitters();
  const rotatedEmitterLayout = rotateEmittersWithBoard(generatedEmitters, {
    widthMm: normalizedInstanceBoard.widthMm,
    depthMm: normalizedInstanceBoard.depthMm,
    rotationDeg: input.boardInstance.rotationDeg,
  });

  const resolvedElectricalPoint = resolveElectricalOperatingPoint({
    ledId: normalizedInstanceBoard.ledType,
    board: normalizedInstanceBoard,
    mode:
      input.boardInstance.drive?.driveMode === "constantCurrent"
        ? "constantCurrent"
        : "constantVoltage",
  });

  const resolvedPhotonOutput = estimateBoardPhotonOutput({
    ledId: normalizedInstanceBoard.ledType,
    board: normalizedInstanceBoard,
    electrical: resolvedElectricalPoint,
  });

  return {
    normalizedInstanceBoard,
    rotatedEmitterLayout,
    resolvedElectricalPoint,
    resolvedPhotonOutput,
  };
}

/**
 * Aggregate multiple estimator maps into one combined summary map.
 *
 * @param {import("@/domain/contracts").PpfdMapResult | null} baseSummary
 * @param {import("@/domain/contracts").PpfdMapResult} nextSummary
 * @returns {import("@/domain/contracts").PpfdMapResult}
 */
function mergeSummaryValues(baseSummary, nextSummary) {
  if (!baseSummary) {
    return {
      ...nextSummary,
      valuesUnits: new Uint32Array(nextSummary.valuesUnits),
      values: new Float32Array(nextSummary.values),
    };
  }
  for (let cellIndex = 0; cellIndex < baseSummary.valuesUnits.length; cellIndex += 1) {
    baseSummary.valuesUnits[cellIndex] += nextSummary.valuesUnits[cellIndex];
  }
  return baseSummary;
}

/**
 * Build the planner's resolved snapshot from a board-like form state.
 *
 * This is the application's main planner use-case and the primary boundary
 * consumed by the Vue store.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   resolutionCm: number,
 *   driveMode?: "constantVoltage" | "constantCurrent"
 * }} input
 * @returns {{
 *   board: import("@/domain/BoardProfile").BoardProfile,
 *   emitters: Array<{xMm:number,yMm:number,type:string}>,
 *   summary: import("@/domain/contracts").PpfdMapResult
 * }}
 */
export function buildPlannerSnapshot(input) {
  const normalizedBoard = normalizeBoardDefinition(input.board);
  const validationIssues = validateBoardInput(normalizedBoard);
  const board = new BoardProfile(normalizedBoard);

  const boardInstances = Array.isArray(input.boardInstances)
    ? input.boardInstances
    : [];
  const activeInstances = boardInstances;

  const startedAt = performance.now();
  let electricalStageMs = 0;
  let photonStageMs = 0;
  let ppfdStageMs = 0;
  /** @type {import("@/domain/contracts").PpfdMapResult | null} */
  let aggregateSummary = null;
  let totalInputPowerW = 0;
  let totalBoardPpf = 0;
  let totalEmitterCount = 0;
  const allEmitters = [];

  for (const boardInstance of activeInstances) {
    const electricalStageStart = performance.now();
    const instanceContext = resolveBoardInstanceContext({
      globalBoard: normalizedBoard,
      boardInstance,
    });
    const electricalStageEnd = performance.now();
    electricalStageMs += electricalStageEnd - electricalStageStart;
    const emitters = instanceContext.rotatedEmitterLayout.emitters;

    const roomCenterX = normalizedBoard.roomWidthCm * 5;
    const roomCenterY = normalizedBoard.roomDepthCm * 5;
    const fixtureOffsetXMm = (Number(boardInstance.xCm) || 0) * 10 - roomCenterX;
    const fixtureOffsetYMm = (Number(boardInstance.yCm) || 0) * 10 - roomCenterY;

    const photonStageStart = performance.now();
    const instancePhotonFlux = instanceContext.resolvedPhotonOutput.boardPpfUmolS;
    photonStageMs += performance.now() - photonStageStart;

    const ppfdStageStart = performance.now();
    const estimator = new PpfdEstimator(
      new BoardProfile({
        ...instanceContext.normalizedInstanceBoard,
        widthMm: instanceContext.rotatedEmitterLayout.widthMm,
        depthMm: instanceContext.rotatedEmitterLayout.depthMm,
        roomWidthCm: normalizedBoard.roomWidthCm,
        roomDepthCm: normalizedBoard.roomDepthCm,
        distanceCm: normalizedBoard.distanceCm,
        photoperiodHours: normalizedBoard.photoperiodHours,
        boardCount: 1,
      }),
      emitters,
      input.resolutionCm,
      {
        boardPhotonFlux: instancePhotonFlux,
        inputPowerW: instanceContext.resolvedElectricalPoint.inputPowerW,
        fixtureOffsetsMm: [{ xMm: fixtureOffsetXMm, yMm: fixtureOffsetYMm }],
      },
    );

    const summary = estimator.estimate();
    ppfdStageMs += performance.now() - ppfdStageStart;
    totalInputPowerW += instanceContext.resolvedElectricalPoint.inputPowerW;
    totalBoardPpf += instancePhotonFlux;
    totalEmitterCount += emitters.length;
    aggregateSummary = mergeSummaryValues(aggregateSummary, summary);
    allEmitters.push(...emitters);
  }

  if (!aggregateSummary) {
    const emptyEstimator = new PpfdEstimator(
      board,
      [],
      input.resolutionCm,
      {
        boardPhotonFlux: 0,
        inputPowerW: 0,
      },
    );
    aggregateSummary = emptyEstimator.estimate();
  }

  let totalUnits = 0;
  let minUnits = aggregateSummary.valuesUnits.length > 0 ? 0xffffffff : 0;
  let maxUnits = 0;
  for (let index = 0; index < aggregateSummary.valuesUnits.length; index += 1) {
    const units = aggregateSummary.valuesUnits[index];
    totalUnits += units;
    if (units < minUnits) minUnits = units;
    if (units > maxUnits) maxUnits = units;
    aggregateSummary.values[index] = units / aggregateSummary.valueScale;
  }
  const averageUnits =
    aggregateSummary.valuesUnits.length > 0
      ? Math.round(totalUnits / aggregateSummary.valuesUnits.length)
      : 0;
  aggregateSummary.minUnits = minUnits === 0xffffffff ? 0 : minUnits;
  aggregateSummary.maxUnits = maxUnits;
  aggregateSummary.averageUnits = averageUnits;
  aggregateSummary.min = aggregateSummary.minUnits / aggregateSummary.valueScale;
  aggregateSummary.max = aggregateSummary.maxUnits / aggregateSummary.valueScale;
  aggregateSummary.average = aggregateSummary.averageUnits / aggregateSummary.valueScale;

  aggregateSummary.fixtureCount = activeInstances.length;
  aggregateSummary.inputPower = totalInputPowerW;
  aggregateSummary.boardPhotonFlux = totalBoardPpf;
  aggregateSummary.sourceCount = totalEmitterCount;

  const calculationMs = performance.now() - startedAt;
  return {
    board,
    emitters: allEmitters,
    boardInstances: activeInstances,
    issues: validationIssues,
    summary: {
      ...aggregateSummary,
      calculationMs,
      electrical: {
        inputPowerW: totalInputPowerW,
      },
      photon: {
        boardPpfUmolS: totalBoardPpf,
      },
      stageTimingMs: {
        electrical: electricalStageMs,
        photon: photonStageMs,
        ppfd: ppfdStageMs,
      },
    },
  };
}
