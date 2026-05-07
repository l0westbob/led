import { watch, type WatchStopHandle } from "vue";
import { normalizeBoardPlannerEmitters } from "@/application/planner/boardPlannerEmitters";
import type { createPlannerUseCases } from "@/application/planner/plannerUseCases";
import type {
  BoardOption,
  PlannerFormState,
  PlannerMutableState,
} from "@/application/planner/useCases/contracts";
import type { BoardDefinition } from "@/domain/contracts";

type PlannerLifecycleInput = {
  state: PlannerMutableState;
  plannerUseCases: ReturnType<typeof createPlannerUseCases>;
  createFormState: (source: Partial<BoardDefinition>) => PlannerFormState;
  overwriteForm: (source: BoardOption | BoardDefinition) => void;
};

export function createPlannerLifecycle(input: PlannerLifecycleInput) {
  let initialized = false;
  let stopSelectedBoardWatch: WatchStopHandle | null = null;

  function initializeStore() {
    if (initialized) return;
    initialized = true;

    const initialLoadResult =
      input.plannerUseCases.loadBoardOptionsWithReport();
    input.state.boardOptions = initialLoadResult.boards;
    input.state.boardMigrationWarnings = initialLoadResult.warnings;
    input.state.selectedBoardId = input.state.boardOptions[0]?.id ?? "";
    input.state.form = input.createFormState(input.state.boardOptions[0] ?? {});
    input.plannerUseCases.syncPlannerElectricalState("voltageV");
    input.plannerUseCases.resolveBoardPlannerDefaultEmitterDrive("voltageV");
    input.state.issues = [];

    stopSelectedBoardWatch = watch(
      () => input.state.selectedBoardId,
      (selectedId) => {
        const boardOption = input.state.boardOptions.find(
          (item) => item.id === selectedId,
        );
        if (!boardOption) return;
        input.overwriteForm(boardOption);
        input.state.form.emitters = normalizeBoardPlannerEmitters(
          input.state.form,
        );
        input.state.selectedBoardPlannerEmitterId =
          input.state.form.emitters[0]?.id ?? "";
        input.state.boardEditorIssues = [];
        input.plannerUseCases.syncPlannerElectricalState("voltageV");
        input.plannerUseCases.resolveBoardPlannerDefaultEmitterDrive(
          "voltageV",
        );
        input.state.issues = [];
      },
      { immediate: true },
    );
  }

  function dispose() {
    stopSelectedBoardWatch?.();
    stopSelectedBoardWatch = null;
  }

  return {
    initializeStore,
    dispose,
  };
}
