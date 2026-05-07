type EmitterInteractionState = "idle" | "pendingDrag" | "dragging";
type EmitterInteractionPointer = {
  emitterId: string;
  pointerId: number;
  clientX: number;
  clientY: number;
};
type EmitterInteractionContext = {
  emitterId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
};

export function createEmitterInteractionMachine(
  options: { dragThresholdPx?: number } = {},
) {
  const dragThresholdPx = Number(options.dragThresholdPx) || 6;
  let interactionState: EmitterInteractionState = "idle";
  let interactionContext: EmitterInteractionContext | null = null;

  function resetToIdle() {
    interactionState = "idle";
    interactionContext = null;
  }

  /**
   * @param {{
   *   emitterId:string,
   *   pointerId:number,
   *   clientX:number,
   *   clientY:number
   * }} input
   */
  function beginPointer(input: EmitterInteractionPointer) {
    interactionState = "pendingDrag";
    interactionContext = {
      emitterId: input.emitterId,
      pointerId: input.pointerId,
      startClientX: input.clientX,
      startClientY: input.clientY,
    };
    return {
      state: interactionState,
      shouldStartDrag: false,
    };
  }

  /**
   * @param {{
   *   emitterId:string,
   *   pointerId:number,
   *   clientX:number,
   *   clientY:number
   * }} input
   */
  function movePointer(input: EmitterInteractionPointer) {
    if (!interactionContext) {
      return {
        state: interactionState,
        shouldStartDrag: false,
        shouldPreviewDrag: false,
      };
    }
    if (
      interactionContext.emitterId !== input.emitterId ||
      interactionContext.pointerId !== input.pointerId
    ) {
      return {
        state: interactionState,
        shouldStartDrag: false,
        shouldPreviewDrag: false,
      };
    }

    if (interactionState === "pendingDrag") {
      const deltaX = input.clientX - interactionContext.startClientX;
      const deltaY = input.clientY - interactionContext.startClientY;
      const dragDistance = Math.hypot(deltaX, deltaY);
      if (dragDistance >= dragThresholdPx) {
        interactionState = "dragging";
        return {
          state: interactionState,
          shouldStartDrag: true,
          shouldPreviewDrag: true,
        };
      }
      return {
        state: interactionState,
        shouldStartDrag: false,
        shouldPreviewDrag: false,
      };
    }

    return {
      state: interactionState,
      shouldStartDrag: false,
      shouldPreviewDrag: interactionState === "dragging",
    };
  }

  /**
   * @param {{
   *   emitterId:string,
   *   pointerId:number
   * }} input
   */
  function endPointer(
    input: Pick<EmitterInteractionPointer, "emitterId" | "pointerId">,
  ) {
    if (
      !interactionContext ||
      interactionContext.emitterId !== input.emitterId ||
      interactionContext.pointerId !== input.pointerId
    ) {
      const previousState = interactionState;
      resetToIdle();
      return {
        state: previousState,
        shouldCommitDrag: false,
        shouldSelectOnly: false,
      };
    }

    const wasDragging = interactionState === "dragging";
    const wasPending = interactionState === "pendingDrag";
    const previousState = interactionState;
    resetToIdle();
    return {
      state: previousState,
      shouldCommitDrag: wasDragging,
      shouldSelectOnly: wasPending,
    };
  }

  function cancelPointer() {
    const previousState = interactionState;
    resetToIdle();
    return {
      state: previousState,
      shouldCancelDrag: previousState === "dragging",
    };
  }

  function getState() {
    return interactionState;
  }

  return {
    beginPointer,
    movePointer,
    endPointer,
    cancelPointer,
    getState,
  };
}
