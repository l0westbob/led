import { computed } from "vue";
import { buildBoardPlannerPreviewSnapshotEnvelope } from "@/application/planner/buildBoardPlannerPreviewSnapshot";
import type { PlannerContextStore } from "@/stores/plannerContext";

export function useBoardPreviewViewModel(store: PlannerContextStore) {
  const previewEnvelope = computed(() =>
    buildBoardPlannerPreviewSnapshotEnvelope({
      board: store.form,
      selectedEmitterId: store.selectedBoardPlannerEmitterId,
      selectedEmitterIds: store.selectedBoardPlannerEmitterIds,
    }),
  );
  const preview = computed(() => previewEnvelope.value.data);

  function handleEscapeKey(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    if (store.bulkEmitterConfigModal.isOpen) {
      store.closeBulkEmitterConfig();
      return;
    }
    store.clearBoardPlannerEmitterSelection();
  }

  return {
    previewEnvelope,
    preview,
    handleEscapeKey,
  };
}
