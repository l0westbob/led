import { BoardProfile } from "@/domain/BoardProfile";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { validateBoardInput } from "@/application/planner/validation";
import {
  estimatePpfdMap,
  comparePpfdMaps,
} from "@/domain/ppfd/estimatePpfdMap";
import {
  finalizeAggregateSummary,
  mergePpfdSummaries,
} from "@/application/planner/pipeline/aggregatePpfdSummaries";
import { resolveBoardInstanceSimulation } from "@/application/planner/pipeline/resolveBoardInstanceSimulation";
import { createSnapshotEnvelope } from "@/contracts/versioned/results";
import { systemTimer } from "@/utils/runtime";
import type {
  BoardDefinition,
  BoardInstance,
  PpfdEmitter,
  PpfdMapResult,
} from "@/domain/contracts";

type PlannerSnapshotPipelineInput = {
  board: Partial<BoardDefinition>;
  boardInstances?: BoardInstance[];
  resolutionCm: number;
  runReferenceComparison?: boolean;
  timer?: { nowMs: () => number };
};

type PpfdComparison = { mae: number; maxError: number; p95Error: number };

/**
 * Build planner snapshot using the staged v2 pipeline.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   boardInstances?: Array<Record<string, unknown>>,
 *   resolutionCm: number,
 *   runReferenceComparison?: boolean,
 *   timer?: { nowMs: () => number }
 * }} input
 */
export function buildPlannerSnapshotPipeline(
  input: PlannerSnapshotPipelineInput,
) {
  const timer = input.timer ?? systemTimer;
  const startedAt = timer.nowMs();
  const normalizedBoard = normalizeBoardDefinition(input.board);
  const validationIssues = validateBoardInput(normalizedBoard);
  const boardProfile = new BoardProfile(normalizedBoard);

  const boardInstances = Array.isArray(input.boardInstances)
    ? input.boardInstances
    : [];
  let aggregateSummary: PpfdMapResult | null = null;
  const allEmitters: PpfdEmitter[] = [];
  let totalInputPowerW = 0;
  let totalBoardPhotonFlux = 0;
  let totalEmitterCount = 0;
  let electricalStageMs = 0;
  let photonStageMs = 0;
  let ppfdStageMs = 0;
  let referenceComparison: PpfdComparison | null = null;
  const referenceComparisonSamples: PpfdComparison[] = [];

  for (const boardInstance of boardInstances) {
    const resolvedInstanceSimulation = resolveBoardInstanceSimulation({
      globalBoard: normalizedBoard,
      boardInstance,
      resolutionCm: input.resolutionCm,
      ppfdEngine: "fast-preview",
      timer,
    });
    electricalStageMs += resolvedInstanceSimulation.stageTimingMs.electrical;
    photonStageMs += resolvedInstanceSimulation.stageTimingMs.photon;

    const summary = resolvedInstanceSimulation.ppfdSummary;
    ppfdStageMs += resolvedInstanceSimulation.stageTimingMs.ppfd;
    aggregateSummary = mergePpfdSummaries(aggregateSummary, summary);
    allEmitters.push(...resolvedInstanceSimulation.emitters);
    totalInputPowerW += resolvedInstanceSimulation.electricalOutput.inputPowerW;
    totalBoardPhotonFlux +=
      resolvedInstanceSimulation.photonOutput.boardPpfUmolS;
    totalEmitterCount += resolvedInstanceSimulation.emitters.length;

    if (input.runReferenceComparison) {
      const referenceResult = resolveBoardInstanceSimulation({
        globalBoard: normalizedBoard,
        boardInstance,
        resolutionCm: input.resolutionCm,
        ppfdEngine: "reference",
        timer,
      });
      referenceComparison = comparePpfdMaps({
        baseline: referenceResult.ppfdSummary,
        candidate: summary,
      });
      referenceComparisonSamples.push(referenceComparison);
    }
  }

  if (!aggregateSummary) {
    const emptyMap = estimatePpfdMap({
      board: boardProfile,
      emitters: [],
      resolutionCm: input.resolutionCm,
      options: {
        boardPhotonFlux: 0,
        inputPowerW: 0,
      },
      engine: "fast-preview",
    }).map;
    aggregateSummary = emptyMap;
  }

  const finalizedSummary = finalizeAggregateSummary(aggregateSummary);
  finalizedSummary.fixtureCount = boardInstances.length;
  finalizedSummary.inputPower = totalInputPowerW;
  finalizedSummary.boardPhotonFlux = totalBoardPhotonFlux;
  finalizedSummary.sourceCount = totalEmitterCount;

  if (referenceComparisonSamples.length > 0) {
    const totalMae = referenceComparisonSamples.reduce(
      (sum, sample) => sum + sample.mae,
      0,
    );
    const totalP95 = referenceComparisonSamples.reduce(
      (sum, sample) => sum + sample.p95Error,
      0,
    );
    const maxError = referenceComparisonSamples.reduce(
      (maxValue, sample) => Math.max(maxValue, sample.maxError),
      0,
    );
    referenceComparison = {
      mae: totalMae / referenceComparisonSamples.length,
      p95Error: totalP95 / referenceComparisonSamples.length,
      maxError,
    };
  }

  const calculationMs = timer.nowMs() - startedAt;
  const summary = {
    ...finalizedSummary,
    calculationMs,
    electrical: {
      inputPowerW: totalInputPowerW,
    },
    photon: {
      boardPpfUmolS: totalBoardPhotonFlux,
    },
    stageTimingMs: {
      electrical: electricalStageMs,
      photon: photonStageMs,
      ppfd: ppfdStageMs,
    },
    engineComparison: referenceComparison,
  };

  return createSnapshotEnvelope({
    data: {
      board: boardProfile,
      emitters: allEmitters,
      boardInstances,
      issues: validationIssues,
      summary,
    },
    warnings: validationIssues.filter((issue) => issue.severity === "warning"),
    errors: validationIssues.filter((issue) => issue.severity === "error"),
    timings: {
      total: calculationMs,
      electrical: electricalStageMs,
      photon: photonStageMs,
      ppfd: ppfdStageMs,
    },
  });
}
