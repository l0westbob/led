import { buildPlannerSnapshotPipeline } from "@/application/planner/pipeline/buildPlannerSnapshotPipeline";

import type { BoardDefinition, BoardInstance } from "@/domain/contracts";

type PlannerSnapshotInput = {
  board: Partial<BoardDefinition>;
  boardInstances?: BoardInstance[];
  resolutionCm: number;
  runReferenceComparison?: boolean;
  timer?: { nowMs: () => number };
};

function buildPlannerSnapshotPipelineEnvelope(input: PlannerSnapshotInput) {
  return buildPlannerSnapshotPipeline({
    ...input,
    runReferenceComparison: input.runReferenceComparison ?? false,
  });
}

/**
 * Build the planner's resolved snapshot through the staged planner pipeline.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   boardInstances?: Array<Record<string, unknown>>,
 *   resolutionCm: number,
 *   runReferenceComparison?: boolean,
 *   timer?: { nowMs: () => number }
 * }} input
 */
export function buildPlannerSnapshot(input: PlannerSnapshotInput) {
  return buildPlannerSnapshotPipelineEnvelope(input).data;
}

/**
 * Contract-standardized planner snapshot envelope.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   boardInstances?: Array<Record<string, unknown>>,
 *   resolutionCm: number,
 *   runReferenceComparison?: boolean,
 *   timer?: { nowMs: () => number }
 * }} input
 */
export function buildPlannerSnapshotEnvelope(input: PlannerSnapshotInput) {
  return buildPlannerSnapshotPipelineEnvelope(input);
}
