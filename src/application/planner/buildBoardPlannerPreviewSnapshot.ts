import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { buildBoardPreviewCctSummary } from "@/application/planner/boardPreviewCct";
import { resolveBoardPreviewEmitterElectricalRows } from "@/application/planner/boardPreviewElectrical";
import { projectBoardPreviewEmitterSelection } from "@/application/planner/boardPreviewSelection";
import { buildBoardPreviewSpectrum } from "@/application/planner/boardPreviewSpectrum";
import { estimateBoardPreviewWiring } from "@/application/planner/boardPreviewWiring";
import { normalizeBoardPlannerEmitters } from "@/application/planner/boardPlannerEmitters";
import { createSnapshotEnvelope } from "@/contracts/versioned/results";
import type { BoardDefinition } from "@/domain/contracts";

type BoardPlannerPreviewSnapshotInput = {
  board: Partial<BoardDefinition>;
  selectedEmitterId?: string;
  selectedEmitterIds?: string[];
};

/**
 * Build Board Planner preview output for enriched emitter-level editing and
 * mixed spectrum analysis.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   selectedEmitterId?: string,
 *   selectedEmitterIds?: string[],
 * }} input
 */
export function buildBoardPlannerPreviewSnapshot(
  input: BoardPlannerPreviewSnapshotInput,
) {
  const board = normalizeBoardDefinition(input.board);
  const emitters = normalizeBoardPlannerEmitters(board);
  const resolvedEmitterElectrical = resolveBoardPreviewEmitterElectricalRows({
    board,
    emitters,
  });
  const spectrumSummary = buildBoardPreviewSpectrum({
    emitters,
    emitterElectricalRows: resolvedEmitterElectrical,
  });
  const warnings = [...spectrumSummary.warnings];
  const errors = [...spectrumSummary.errors];
  const cctSummary = buildBoardPreviewCctSummary(
    spectrumSummary.emitterFluxRows,
  );
  warnings.push(...cctSummary.warnings);
  const selection = projectBoardPreviewEmitterSelection({
    emitters,
    selectedEmitterId: input.selectedEmitterId,
    selectedEmitterIds: input.selectedEmitterIds,
  });
  const wiringSummary = estimateBoardPreviewWiring({
    rawBoard: input.board,
    board,
    emitters,
    emitterElectricalRows: resolvedEmitterElectrical,
  });
  warnings.push(...wiringSummary.warnings);

  return {
    emitters,
    selectedEmitter: selection.selectedEmitter,
    selectedEmitterIds: selection.selectedEmitterIds,
    selectedEmitterCount: selection.selectedEmitterCount,
    aggregatePhotonSpectrum: spectrumSummary.photonSpectrum,
    aggregateRelativeSpectrum: spectrumSummary.relativeSpectrum,
    totalPhotonFlux: spectrumSummary.totalPhotonFlux,
    spectralStats: spectrumSummary.spectralStats,
    cct: cctSummary.cct,
    cctK: cctSummary.cctK,
    boardElectricalEstimate: wiringSummary.boardElectricalEstimate,
    warnings,
    errors,
    board: {
      widthMm: board.widthMm,
      depthMm: board.depthMm,
    },
  };
}

export type BoardPlannerPreviewSnapshot = ReturnType<
  typeof buildBoardPlannerPreviewSnapshot
>;

/**
 * Contract-standardized board preview snapshot envelope.
 *
 * @param {{
 *   board: Partial<import("@/domain/contracts").BoardDefinition>,
 *   selectedEmitterId?: string,
 *   selectedEmitterIds?: string[],
 * }} input
 */
export function buildBoardPlannerPreviewSnapshotEnvelope(
  input: BoardPlannerPreviewSnapshotInput,
) {
  const snapshot = buildBoardPlannerPreviewSnapshot(input);
  return createSnapshotEnvelope({
    data: snapshot,
    warnings: snapshot.warnings,
    errors: snapshot.errors,
    timings: {},
  });
}
