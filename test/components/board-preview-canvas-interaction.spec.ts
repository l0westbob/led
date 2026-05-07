import { describe, expect, it, vi } from "vitest";
import { useBoardPreviewCanvasInteraction } from "../../src/components/boardPreview/useBoardPreviewCanvasInteraction";
import type { BoardPlannerPreviewSnapshot } from "../../src/application/planner/buildBoardPlannerPreviewSnapshot";
import type { PlannerContextStore } from "../../src/stores/plannerContext";

function createPreview(): BoardPlannerPreviewSnapshot {
  return {
    board: {
      widthMm: 100,
      depthMm: 50,
    },
    emitters: [
      {
        id: "emitter-a",
        xMm: 10,
        yMm: 20,
        ledType: "override-led",
      },
    ],
  } as BoardPlannerPreviewSnapshot;
}

function createStore(): PlannerContextStore {
  return {
    form: { ledType: "base-led" },
    selectedBoardPlannerEmitterId: "emitter-a",
    selectedBoardPlannerEmitterIds: ["emitter-a"],
    boardPlannerEmitterMoveLocked: true,
    emitterDragState: {
      isDragging: false,
      emitterId: "",
    },
    selectBoardPlannerEmitter: vi.fn(),
    toggleBoardPlannerEmitterSelection: vi.fn(),
    startEmitterDrag: vi.fn(),
    previewEmitterPosition: vi.fn(),
    commitEmitterPosition: vi.fn(),
    cancelEmitterDrag: vi.fn(),
  } as unknown as PlannerContextStore;
}

function createPointerEvent(options: Partial<PointerEvent> = {}): PointerEvent {
  return {
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    currentTarget: null,
    ...options,
  } as PointerEvent;
}

describe("useBoardPreviewCanvasInteraction", () => {
  it("projects emitter coordinates into the SVG viewbox", () => {
    const preview = createPreview();
    const interaction = useBoardPreviewCanvasInteraction({
      preview: () => preview,
      store: createStore(),
      viewBoxWidth: 900,
      viewBoxHeight: 360,
      padding: 24,
    });

    expect(interaction.boardRect.value).toMatchObject({
      x: 138,
      y: 24,
      width: 624,
      height: 312,
    });
    expect(interaction.emitterPosition(preview.emitters[0])).toEqual({
      x: 200.4,
      y: 148.8,
    });
  });

  it("adds selected and override classes from store state", () => {
    const preview = createPreview();
    const interaction = useBoardPreviewCanvasInteraction({
      preview: () => preview,
      store: createStore(),
      viewBoxWidth: 900,
      viewBoxHeight: 360,
      padding: 24,
    });

    expect(interaction.emitterClassName(preview.emitters[0])).toBe(
      "emitter-circle selected override",
    );
  });

  it("routes additive pointer selection through the multi-select action", () => {
    const preview = createPreview();
    const store = createStore();
    const interaction = useBoardPreviewCanvasInteraction({
      preview: () => preview,
      store,
      viewBoxWidth: 900,
      viewBoxHeight: 360,
      padding: 24,
    });

    interaction.handleEmitterPointerDown(
      createPointerEvent({ metaKey: true }),
      "emitter-a",
    );

    expect(store.toggleBoardPlannerEmitterSelection).toHaveBeenCalledWith(
      "emitter-a",
      { additive: true, range: false },
    );
    expect(store.selectBoardPlannerEmitter).not.toHaveBeenCalled();
  });
});
