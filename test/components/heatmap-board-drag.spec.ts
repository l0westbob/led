import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useHeatmapBoardDrag } from "../../src/components/heatmap/useHeatmapBoardDrag";

function createCanvasRef() {
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 900,
      bottom: 540,
      width: 900,
      height: 540,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return ref<HTMLCanvasElement | null>(canvas);
}

function createPointerEvent(clientX: number, clientY: number): PointerEvent {
  return { clientX, clientY } as PointerEvent;
}

describe("useHeatmapBoardDrag", () => {
  it("selects, previews, and commits a valid board drag", () => {
    const scheduleRender = vi.fn();
    const selectBoard = vi.fn();
    const moveBoard = vi.fn();
    const drag = useHeatmapBoardDrag({
      board: () => ({
        roomWidthCm: 90,
        roomDepthCm: 54,
        widthMm: 100,
        depthMm: 50,
      }),
      boardInstances: () => [
        {
          id: "board-a",
          xCm: 15,
          yCm: 12.5,
          widthMm: 100,
          depthMm: 50,
          rotationDeg: 0,
        },
      ],
      canvasRef: createCanvasRef(),
      canvasWidth: ref(900),
      canvasHeight: ref(540),
      getBoardRects: () => [
        {
          id: "board-a",
          x: 100,
          y: 100,
          width: 100,
          height: 50,
        },
      ],
      scheduleRender,
      selectBoard,
      moveBoard,
    });

    drag.beginDrag(createPointerEvent(120, 120));
    drag.moveDrag(createPointerEvent(160, 130));
    drag.endDrag(createPointerEvent(200, 140));

    expect(selectBoard).toHaveBeenCalledWith("board-a");
    expect(scheduleRender).toHaveBeenCalled();
    expect(moveBoard).toHaveBeenCalledWith({
      id: "board-a",
      xCm: 23,
      yCm: 14.5,
      previewOnly: false,
    });
    expect(drag.dragState.value).toBeNull();
  });

  it("does not begin a drag when no board rect is hit", () => {
    const selectBoard = vi.fn();
    const drag = useHeatmapBoardDrag({
      board: () => ({
        roomWidthCm: 90,
        roomDepthCm: 54,
        widthMm: 100,
        depthMm: 50,
      }),
      boardInstances: () => [
        {
          id: "board-a",
          xCm: 15,
          yCm: 12.5,
          widthMm: 100,
          depthMm: 50,
          rotationDeg: 0,
        },
      ],
      canvasRef: createCanvasRef(),
      canvasWidth: ref(900),
      canvasHeight: ref(540),
      getBoardRects: () => [],
      scheduleRender: vi.fn(),
      selectBoard,
      moveBoard: vi.fn(),
    });

    drag.beginDrag(createPointerEvent(120, 120));

    expect(selectBoard).not.toHaveBeenCalled();
    expect(drag.dragState.value).toBeNull();
  });
});
