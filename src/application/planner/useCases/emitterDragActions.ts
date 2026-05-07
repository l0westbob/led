import { clampEmitterPosition } from "@/application/planner/emitterPlacement";
import type { EmitterDragActionDependencies } from "@/application/planner/useCases/contracts";

/**
 * Board-preview emitter movement and preview-mode actions.
 *
 * @param {import("@/application/planner/useCases/contracts").EmitterDragActionDependencies} input
 */
export function createEmitterDragActions(input: EmitterDragActionDependencies) {
  function startEmitterDrag(emitterId: string) {
    if (
      !input.state.form.emitters.some((emitter) => emitter.id === emitterId)
    ) {
      return {
        ok: false,
        errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }],
      };
    }
    input.state.emitterDragState.isDragging = true;
    input.state.emitterDragState.emitterId = emitterId;
    input.state.selectedBoardPlannerEmitterId = emitterId;
    return { ok: true };
  }

  function previewEmitterPosition(emitterId: string, xMm: number, yMm: number) {
    const activeEmitterId = input.state.emitterDragState.emitterId || emitterId;
    const emitter = input.state.form.emitters.find(
      (item) => item.id === activeEmitterId,
    );
    if (!emitter) {
      return {
        ok: false,
        errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }],
      };
    }
    const clampedPosition = clampEmitterPosition({
      xMm,
      yMm,
      boardWidthMm: input.state.form.widthMm,
      boardDepthMm: input.state.form.depthMm,
      snapStepMm: 1,
    });
    emitter.xMm = clampedPosition.xMm;
    emitter.yMm = clampedPosition.yMm;
    return { ok: true, data: clampedPosition };
  }

  function commitEmitterPosition(emitterId: string, xMm: number, yMm: number) {
    const previewResult = previewEmitterPosition(emitterId, xMm, yMm);
    input.state.emitterDragState.isDragging = false;
    input.state.emitterDragState.emitterId = "";
    return previewResult?.ok === false ? previewResult : { ok: true };
  }

  function cancelEmitterDrag() {
    input.state.emitterDragState.isDragging = false;
    input.state.emitterDragState.emitterId = "";
    return { ok: true };
  }

  function setBoardPlannerSpectrumMode(mode: string) {
    input.state.boardPlannerSpectrumMode =
      mode === "photon" ? "photon" : "relative";
    return { ok: true };
  }

  function setBoardPlannerEmitterMoveLocked(isLocked: boolean) {
    input.state.boardPlannerEmitterMoveLocked = Boolean(isLocked);
    if (input.state.boardPlannerEmitterMoveLocked) {
      cancelEmitterDrag();
    }
    return { ok: true };
  }

  return {
    startEmitterDrag,
    previewEmitterPosition,
    commitEmitterPosition,
    cancelEmitterDrag,
    setBoardPlannerSpectrumMode,
    setBoardPlannerEmitterMoveLocked,
  };
}
