import { computed } from "vue";
import { createEmitterDragController } from "@/components/useEmitterDrag";
import type { BoardPlannerPreviewSnapshot } from "@/application/planner/buildBoardPlannerPreviewSnapshot";
import type { PlannerContextStore } from "@/stores/plannerContext";

type BoardPreviewCanvasInteractionInput = {
  preview: () => BoardPlannerPreviewSnapshot;
  store: PlannerContextStore;
  viewBoxWidth: number;
  viewBoxHeight: number;
  padding: number;
};

type PreviewEmitter = BoardPlannerPreviewSnapshot["emitters"][number];

export function useBoardPreviewCanvasInteraction(
  input: BoardPreviewCanvasInteractionInput,
) {
  const boardRect = computed(() => {
    const board = input.preview().board;
    const widthMm = Number(board.widthMm) || 1;
    const depthMm = Number(board.depthMm) || 1;
    const scale = Math.min(
      (input.viewBoxWidth - input.padding * 2) / widthMm,
      (input.viewBoxHeight - input.padding * 2) / depthMm,
    );
    const width = widthMm * scale;
    const height = depthMm * scale;
    return {
      scale,
      x: (input.viewBoxWidth - width) / 2,
      y: (input.viewBoxHeight - height) / 2,
      width,
      height,
    };
  });

  function emitterPosition(emitter: PreviewEmitter) {
    return {
      x: boardRect.value.x + (Number(emitter.xMm) || 0) * boardRect.value.scale,
      y: boardRect.value.y + (Number(emitter.yMm) || 0) * boardRect.value.scale,
    };
  }

  function emitterClassName(emitter: PreviewEmitter) {
    const isSelected = input.store.selectedBoardPlannerEmitterIds.includes(
      emitter.id,
    );
    const isPrimarySelected =
      input.store.selectedBoardPlannerEmitterId === emitter.id;
    const isOverrideLed = emitter.ledType !== input.store.form.ledType;
    if (isPrimarySelected && isOverrideLed) {
      return "emitter-circle selected override";
    }
    if (isPrimarySelected) {
      return "emitter-circle selected";
    }
    if (isSelected && isOverrideLed) {
      return "emitter-circle selected-secondary override";
    }
    if (isSelected) {
      return "emitter-circle selected-secondary";
    }
    if (isOverrideLed) {
      return "emitter-circle override";
    }
    return "emitter-circle";
  }

  function toBoardCoordinates(event: PointerEvent) {
    if (!(event.currentTarget instanceof Element)) return null;
    const svgElement =
      event.currentTarget.closest("svg") ??
      event.currentTarget
        .closest(".board-preview-shell")
        ?.querySelector(".board-preview-svg");
    if (!svgElement) return null;
    const bounds = svgElement.getBoundingClientRect();
    const ratioX = input.viewBoxWidth / bounds.width;
    const ratioY = input.viewBoxHeight / bounds.height;
    const viewBoxX = (event.clientX - bounds.left) * ratioX;
    const viewBoxY = (event.clientY - bounds.top) * ratioY;
    const xMm = (viewBoxX - boardRect.value.x) / boardRect.value.scale;
    const yMm = (viewBoxY - boardRect.value.y) / boardRect.value.scale;
    return { xMm, yMm };
  }

  const emitterDragController = createEmitterDragController({
    isMoveLocked: () => input.store.boardPlannerEmitterMoveLocked,
    startDrag: (emitterId) => input.store.startEmitterDrag(emitterId),
    previewDrag: (emitterId, xMm, yMm) =>
      input.store.previewEmitterPosition(emitterId, xMm, yMm),
    commitDrag: (emitterId, xMm, yMm) =>
      input.store.commitEmitterPosition(emitterId, xMm, yMm),
    cancelDrag: () => input.store.cancelEmitterDrag(),
    selectEmitter: (emitterId, selectionOptions) => {
      if (selectionOptions?.additive || selectionOptions?.range) {
        input.store.toggleBoardPlannerEmitterSelection(
          emitterId,
          selectionOptions,
        );
        return;
      }
      input.store.selectBoardPlannerEmitter(emitterId);
    },
    isDraggingEmitter: (emitterId) =>
      input.store.emitterDragState.isDragging &&
      input.store.emitterDragState.emitterId === emitterId,
    toBoardCoordinates,
  });

  function handleEmitterPointerDown(event: PointerEvent, emitterId: string) {
    emitterDragController.handlePointerDown(event, emitterId);
  }

  return {
    boardRect,
    emitterPosition,
    emitterClassName,
    emitterDragController,
    handleEmitterPointerDown,
  };
}
