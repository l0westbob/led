/**
 * Emitter drag interaction controller for Board Preview.
 *
 * Coordinates are handled in two spaces:
 * - pointer events in screen pixels (px)
 * - emitter positions in board millimeters (mm)
 *
 * @param {{
 *   isMoveLocked: () => boolean,
 *   startDrag: (emitterId:string) => void,
 *   previewDrag: (emitterId:string, xMm:number, yMm:number) => void,
 *   commitDrag: (emitterId:string, xMm:number, yMm:number) => void,
 *   cancelDrag: () => void,
 *   selectEmitter: (emitterId:string) => void,
 *   isDraggingEmitter: (emitterId:string) => boolean,
 *   toBoardCoordinates: (event: PointerEvent) => {xMm:number,yMm:number}|null
 * }} input
 */
export function createEmitterDragController(input) {
  const DRAG_START_THRESHOLD_PX = 6;
  let pointerDragContext = null;

  function handlePointerDown(event, emitterId) {
    if (input.isMoveLocked()) {
      input.selectEmitter(emitterId);
      return;
    }
    pointerDragContext = {
      emitterId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      hasStartedDrag: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event, emitterId) {
    if (!pointerDragContext) return;
    if (pointerDragContext.emitterId !== emitterId) return;
    if (pointerDragContext.pointerId !== event.pointerId) return;

    if (!pointerDragContext.hasStartedDrag) {
      const deltaX = event.clientX - pointerDragContext.startClientX;
      const deltaY = event.clientY - pointerDragContext.startClientY;
      const dragDistancePx = Math.hypot(deltaX, deltaY);
      if (dragDistancePx < DRAG_START_THRESHOLD_PX) return;
      pointerDragContext.hasStartedDrag = true;
      input.startDrag(emitterId);
    }

    if (!input.isDraggingEmitter(emitterId)) return;
    const boardCoordinates = input.toBoardCoordinates(event);
    if (!boardCoordinates) return;
    input.previewDrag(emitterId, boardCoordinates.xMm, boardCoordinates.yMm);
  }

  function handlePointerUp(event, emitterId) {
    if (!pointerDragContext) return;
    if (pointerDragContext.emitterId !== emitterId) return;
    const didStartDrag = pointerDragContext.hasStartedDrag;
    pointerDragContext = null;

    if (!didStartDrag) {
      input.selectEmitter(emitterId);
      return;
    }
    if (!input.isDraggingEmitter(emitterId)) return;
    const boardCoordinates = input.toBoardCoordinates(event);
    if (!boardCoordinates) {
      input.cancelDrag();
      return;
    }
    input.commitDrag(emitterId, boardCoordinates.xMm, boardCoordinates.yMm);
  }

  function handlePointerCancel() {
    pointerDragContext = null;
    input.cancelDrag();
  }

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}

