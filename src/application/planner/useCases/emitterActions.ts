import { createBulkEmitterConfigActions } from "@/application/planner/useCases/bulkEmitterConfigActions";
import { createDefaultEmitterDriveActions } from "@/application/planner/useCases/defaultEmitterDriveActions";
import { createEmitterConfigActions } from "@/application/planner/useCases/emitterConfigActions";
import { createEmitterDragActions } from "@/application/planner/useCases/emitterDragActions";
import { createEmitterSelectionActions } from "@/application/planner/useCases/emitterSelectionActions";
import type { BoardPreviewEmitterActionsInput } from "@/application/planner/useCases/contracts";

/**
 * Planner board-preview emitter action bundle.
 *
 * @param {import("@/application/planner/useCases/contracts").BoardPreviewEmitterActionsInput} input
 */
export function createBoardPreviewEmitterActions(
  input: BoardPreviewEmitterActionsInput,
) {
  const emitterSelectionActions = createEmitterSelectionActions({
    state: input.state,
  });
  const defaultEmitterDriveActions = createDefaultEmitterDriveActions({
    state: input.state,
    roundToTwoDecimals: input.roundToTwoDecimals,
    resolveDefaultEmitterDriveDraft: input.resolveDefaultEmitterDriveDraft,
    resolveDraftPreserveField: input.resolveDraftPreserveField,
  });
  const emitterConfigActions = createEmitterConfigActions({
    state: input.state,
    roundToTwoDecimals: input.roundToTwoDecimals,
    resolveBoardConfigDraft: input.resolveBoardConfigDraft,
    resolveDraftPreserveField: input.resolveDraftPreserveField,
  });
  const bulkEmitterConfigActions = createBulkEmitterConfigActions({
    state: input.state,
    roundToTwoDecimals: input.roundToTwoDecimals,
    resolveBoardConfigDraft: input.resolveBoardConfigDraft,
    resolveDraftPreserveField: input.resolveDraftPreserveField,
    applyBulkEmitterConfiguration: input.applyBulkEmitterConfiguration,
  });
  const emitterDragActions = createEmitterDragActions({
    state: input.state,
  });

  function regenerateBoardPlannerEmittersFromGrid() {
    const regeneratedEmitters = input.regenerateBoardPlannerEmitters(
      input.state.form,
    );
    input.state.form.emitters = input.applyDefaultDriveToMatchingEmitters({
      emitters: regeneratedEmitters,
      boardDefaultLedType: input.state.form.ledType,
      defaultDrive: input.state.boardPlannerDefaultEmitterDrive,
      roundToTwoDecimals: input.roundToTwoDecimals,
    });
    if (
      !input.state.form.emitters.some(
        (emitter) => emitter.id === input.state.selectedBoardPlannerEmitterId,
      )
    ) {
      input.state.selectedBoardPlannerEmitterId =
        input.state.form.emitters[0]?.id ?? "";
    }
    emitterSelectionActions.sanitizeEmitterSelection();
    return { ok: true };
  }

  function resetBoardPlannerEmittersToDefaultLed() {
    input.state.form.emitters = input.applyDefaultDriveToMatchingEmitters({
      emitters: input.resetBoardPlannerEmittersToDefault(input.state.form),
      boardDefaultLedType: input.state.form.ledType,
      defaultDrive: input.state.boardPlannerDefaultEmitterDrive,
      roundToTwoDecimals: input.roundToTwoDecimals,
    });
    if (
      !input.state.form.emitters.some(
        (emitter) => emitter.id === input.state.selectedBoardPlannerEmitterId,
      )
    ) {
      input.state.selectedBoardPlannerEmitterId =
        input.state.form.emitters[0]?.id ?? "";
    }
    emitterSelectionActions.sanitizeEmitterSelection();
    return { ok: true };
  }

  return {
    ...emitterSelectionActions,
    ...defaultEmitterDriveActions,
    ...emitterConfigActions,
    ...bulkEmitterConfigActions,
    ...emitterDragActions,
    regenerateBoardPlannerEmittersFromGrid,
    resetBoardPlannerEmittersToDefaultLed,
  };
}
