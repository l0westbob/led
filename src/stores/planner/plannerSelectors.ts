import { computed } from "vue";
import { buildPlannerSnapshotEnvelope } from "@/application/planner/buildPlannerSnapshot";
import { buildIssueBucketsFromEnvelope } from "@/stores/planner/modules/issueBuckets";
import type { PlannerMutableState } from "@/application/planner/useCases/contracts";

export function createPlannerSelectors(state: PlannerMutableState) {
  const plannerSnapshotEnvelope = computed(() =>
    buildPlannerSnapshotEnvelope({
      board: state.form,
      boardInstances: state.boardInstances,
      resolutionCm: state.resolutionCm,
      runReferenceComparison: false,
    }),
  );
  const plannerIssueBuckets = computed(() =>
    buildIssueBucketsFromEnvelope(plannerSnapshotEnvelope.value),
  );
  const plannerSnapshot = computed(() => plannerSnapshotEnvelope.value.data);

  const board = computed(() => plannerSnapshot.value.board);
  const emitters = computed(() => plannerSnapshot.value.emitters);
  const ppfdSummary = computed(() => plannerSnapshot.value.summary);
  const stats = computed(() => [
    {
      label: "LED Positions",
      value: `${emitters.value.length} emitters`,
    },
    {
      label: "Board Instances",
      value: `${state.boardInstances.length}`,
    },
    {
      label: "Input Power",
      value: `${ppfdSummary.value.electrical.inputPowerW.toFixed(1)} W`,
    },
    {
      label: "Photon Flux",
      value: `${ppfdSummary.value.photon.boardPpfUmolS.toFixed(1)} umol/s est.`,
    },
    {
      label: "Average PPFD",
      value: `${ppfdSummary.value.average.toFixed(0)} umol/m²/s est.`,
    },
    {
      label: "Min PPFD",
      value: `${ppfdSummary.value.min.toFixed(0)} umol/m²/s est.`,
    },
    {
      label: "Max PPFD",
      value: `${ppfdSummary.value.max.toFixed(0)} umol/m²/s est.`,
    },
    {
      label: "Grid Size",
      value: `${ppfdSummary.value.gridWidth} x ${ppfdSummary.value.gridDepth}`,
    },
  ]);

  return {
    board,
    emitters,
    ppfdSummary,
    stats,
    boardOptions: computed(() => state.boardOptions),
    benchmarkRows: computed(() => state.benchmarkRows),
    boardInstances: computed(() => state.boardInstances),
    selectedBoardInstanceId: computed(() => state.selectedBoardInstanceId),
    boardConfigModal: computed(() => state.boardConfigModal),
    plannerWarnings: computed(() => plannerIssueBuckets.value.warnings),
    plannerErrors: computed(() => plannerIssueBuckets.value.errors),
    boardPreviewWarnings: computed(() => []),
    boardPreviewErrors: computed(() => []),
    issues: computed(() => [
      ...plannerIssueBuckets.value.errors,
      ...plannerIssueBuckets.value.warnings,
      ...(Array.isArray(state.issues) ? state.issues : []),
    ]),
    selectedBoardPlannerEmitterId: computed(
      () => state.selectedBoardPlannerEmitterId,
    ),
    selectedBoardPlannerEmitterIds: computed(
      () => state.selectedBoardPlannerEmitterIds,
    ),
    emitterConfigModal: computed(() => state.emitterConfigModal),
    bulkEmitterConfigModal: computed(() => state.bulkEmitterConfigModal),
    boardPlannerDefaultEmitterDrive: computed(
      () => state.boardPlannerDefaultEmitterDrive,
    ),
    boardEditorIssues: computed(() => state.boardEditorIssues),
    boardMigrationWarnings: computed(() => state.boardMigrationWarnings),
    boardPlannerSpectrumMode: computed(() => state.boardPlannerSpectrumMode),
    boardPlannerEmitterMoveLocked: computed(
      () => state.boardPlannerEmitterMoveLocked,
    ),
    emitterDragState: computed(() => state.emitterDragState),
  };
}
