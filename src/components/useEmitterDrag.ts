import { createEmitterInteractionMachine } from "@/application/planner/emitterInteractionMachine";

type EmitterSelectionOptions = {
  additive?: boolean;
  range?: boolean;
};

type BoardCoordinates = {
  xMm: number;
  yMm: number;
};

type EmitterDragControllerInput = {
  isMoveLocked: () => boolean;
  startDrag: (emitterId: string) => void;
  previewDrag: (emitterId: string, xMm: number, yMm: number) => void;
  commitDrag: (emitterId: string, xMm: number, yMm: number) => void;
  cancelDrag: () => void;
  selectEmitter: (
    emitterId: string,
    selectionOptions?: EmitterSelectionOptions,
  ) => void;
  isDraggingEmitter: (emitterId: string) => boolean;
  toBoardCoordinates: (event: PointerEvent) => BoardCoordinates | null;
};

/**
 * Emitter drag interaction controller for Board Preview.
 *
 * Coordinates are handled in two spaces:
 * - pointer events in screen pixels (px)
 * - emitter positions in board millimeters (mm)
 */
export function createEmitterDragController(input: EmitterDragControllerInput) {
  const interactionMachine = createEmitterInteractionMachine({
    dragThresholdPx: 6,
  });

  function resolveSelectionOptionsFromEvent(
    event: Pick<PointerEvent, "metaKey" | "ctrlKey" | "shiftKey">,
  ): EmitterSelectionOptions {
    return {
      additive: Boolean(event.metaKey || event.ctrlKey),
      range: Boolean(event.shiftKey),
    };
  }

  function handlePointerDown(event: PointerEvent, emitterId: string) {
    const selectionOptions = resolveSelectionOptionsFromEvent(event);
    if (selectionOptions.additive || selectionOptions.range) {
      input.selectEmitter(emitterId, selectionOptions);
      interactionMachine.cancelPointer();
      return;
    }

    if (input.isMoveLocked()) {
      input.selectEmitter(emitterId, selectionOptions);
      return;
    }
    interactionMachine.beginPointer({
      emitterId,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    const pointerCaptureTarget = event.currentTarget as {
      setPointerCapture?: (pointerId: number) => void;
    } | null;
    pointerCaptureTarget?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent, emitterId: string) {
    const transition = interactionMachine.movePointer({
      emitterId,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });
    if (transition.shouldStartDrag) {
      input.startDrag(emitterId);
    }
    if (!transition.shouldPreviewDrag || !input.isDraggingEmitter(emitterId))
      return;
    const boardCoordinates = input.toBoardCoordinates(event);
    if (!boardCoordinates) return;
    input.previewDrag(emitterId, boardCoordinates.xMm, boardCoordinates.yMm);
  }

  function handlePointerUp(event: PointerEvent, emitterId: string) {
    const transition = interactionMachine.endPointer({
      emitterId,
      pointerId: event.pointerId,
    });
    if (transition.shouldSelectOnly) {
      input.selectEmitter(emitterId, resolveSelectionOptionsFromEvent(event));
      return;
    }
    if (!transition.shouldCommitDrag || !input.isDraggingEmitter(emitterId))
      return;
    const boardCoordinates = input.toBoardCoordinates(event);
    if (!boardCoordinates) {
      input.cancelDrag();
      return;
    }
    input.commitDrag(emitterId, boardCoordinates.xMm, boardCoordinates.yMm);
  }

  function handlePointerCancel() {
    const transition = interactionMachine.cancelPointer();
    if (transition.shouldCancelDrag) {
      input.cancelDrag();
    }
  }

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
