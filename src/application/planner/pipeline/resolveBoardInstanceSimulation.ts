import { BoardProfile } from "@/domain/BoardProfile";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { resolveElectricalOperatingPoint } from "@/application/electrical/resolveElectricalOperatingPoint";
import { estimateBoardPhotonOutput } from "@/application/photons/estimatePhotonOutput";
import { rotateEmittersWithBoard } from "@/domain/boardGeometry";
import { estimatePpfdMap } from "@/domain/ppfd/estimatePpfdMap";
import { systemTimer } from "@/utils/runtime";
import type {
  BoardDefinition,
  BoardInstance,
  PpfdEngineName,
} from "@/domain/contracts";

/**
 * Resolve one board instance simulation context and PPFD map.
 *
 * @param {{
 *   globalBoard: import("@/domain/contracts").BoardDefinition,
 *   boardInstance: Record<string, unknown>,
 *   resolutionCm: number,
 *   ppfdEngine: "fast-preview"|"reference",
 *   timer?: { nowMs: () => number }
 * }} input
 */
export function resolveBoardInstanceSimulation(input: {
  globalBoard: BoardDefinition;
  boardInstance: BoardInstance;
  resolutionCm: number;
  ppfdEngine: PpfdEngineName;
  timer?: { nowMs: () => number };
}) {
  const timer = input.timer ?? systemTimer;
  const electricalStageStart = timer.nowMs();
  const instanceBoard = normalizeBoardDefinition({
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
      input.boardInstance.drive?.parallelCount ??
      input.globalBoard.parallelCount,
  });

  const boardProfile = new BoardProfile(instanceBoard);
  const generatedEmitters = boardProfile.generateEmitters();
  const rotatedEmitterLayout = rotateEmittersWithBoard(generatedEmitters, {
    widthMm: instanceBoard.widthMm,
    depthMm: instanceBoard.depthMm,
    rotationDeg: input.boardInstance.rotationDeg,
  });

  const electricalOutput = resolveElectricalOperatingPoint({
    ledId: instanceBoard.ledType,
    board: instanceBoard,
    mode:
      input.boardInstance.drive?.driveMode === "constantCurrent"
        ? "constantCurrent"
        : "constantVoltage",
  });
  const electricalStageDurationMs = timer.nowMs() - electricalStageStart;

  const photonStageStart = timer.nowMs();
  const photonOutput = estimateBoardPhotonOutput({
    ledId: instanceBoard.ledType,
    board: instanceBoard,
    electrical: electricalOutput,
  });
  const photonStageDurationMs = timer.nowMs() - photonStageStart;

  const roomCenterX = input.globalBoard.roomWidthCm * 5;
  const roomCenterY = input.globalBoard.roomDepthCm * 5;
  const fixtureOffsetXMm =
    (Number(input.boardInstance.xCm) || 0) * 10 - roomCenterX;
  const fixtureOffsetYMm =
    (Number(input.boardInstance.yCm) || 0) * 10 - roomCenterY;

  const ppfdInputBoard = new BoardProfile({
    ...instanceBoard,
    widthMm: rotatedEmitterLayout.widthMm,
    depthMm: rotatedEmitterLayout.depthMm,
    roomWidthCm: input.globalBoard.roomWidthCm,
    roomDepthCm: input.globalBoard.roomDepthCm,
    distanceCm: input.globalBoard.distanceCm,
    photoperiodHours: input.globalBoard.photoperiodHours,
    boardCount: 1,
  });

  const ppfdStageStart = timer.nowMs();
  const ppfdResult = estimatePpfdMap({
    board: ppfdInputBoard,
    emitters: rotatedEmitterLayout.emitters,
    resolutionCm: input.resolutionCm,
    options: {
      boardPhotonFlux: photonOutput.boardPpfUmolS,
      inputPowerW: electricalOutput.inputPowerW,
      fixtureOffsetsMm: [{ xMm: fixtureOffsetXMm, yMm: fixtureOffsetYMm }],
    },
    engine: input.ppfdEngine,
  });
  const ppfdStageDurationMs = timer.nowMs() - ppfdStageStart;

  return {
    instanceBoard,
    emitters: rotatedEmitterLayout.emitters,
    electricalOutput,
    photonOutput,
    ppfdSummary: ppfdResult.map,
    ppfdEngine: ppfdResult.engine,
    stageTimingMs: {
      electrical: electricalStageDurationMs,
      photon: photonStageDurationMs,
      ppfd: ppfdStageDurationMs,
    },
  };
}
