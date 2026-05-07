import { computed, ref, type Ref } from "vue";
import {
  canvasPointFromPointerEvent,
  createBoardDragState,
  findBoardRectAtPoint,
  isBoardMovePreviewValid,
  resolveBoardDragPreview,
  resolveDraggedBoardCenterCm,
  type BoardDragState,
  type BoardRect,
} from "@/components/heatmap/heatmapInteraction";
import type {
  HeatmapBoard,
  HeatmapBoardInstance,
} from "@/components/ppfdHeatmapCanvas";

type MoveBoardPayload = {
  id: string;
  xCm: number;
  yCm: number;
  previewOnly: false;
};

type HeatmapBoardDragInput = {
  board: () => HeatmapBoard;
  boardInstances: () => HeatmapBoardInstance[];
  canvasRef: Ref<HTMLCanvasElement | null>;
  canvasWidth: Ref<number>;
  canvasHeight: Ref<number>;
  getBoardRects: () => BoardRect[];
  scheduleRender: () => void;
  selectBoard: (id: string) => void;
  moveBoard: (payload: MoveBoardPayload) => void;
};

export function useHeatmapBoardDrag(input: HeatmapBoardDragInput) {
  const dragState = ref<BoardDragState | null>(null);
  const hasInstances = computed(() => input.boardInstances().length > 0);

  function pointFromEvent(event: PointerEvent) {
    const canvas = input.canvasRef.value;
    if (!canvas) return null;
    return canvasPointFromPointerEvent({
      event,
      canvas,
      canvasWidth: input.canvasWidth.value,
      canvasHeight: input.canvasHeight.value,
    });
  }

  function beginDrag(event: PointerEvent) {
    if (!hasInstances.value) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const hit = findBoardRectAtPoint({
      point,
      boardRects: input.getBoardRects(),
    });
    if (!hit) return;

    input.selectBoard(hit.id);
    dragState.value = createBoardDragState({
      hitRect: hit,
      point,
      board: input.board(),
      canvasWidth: input.canvasWidth.value,
      canvasHeight: input.canvasHeight.value,
    });
  }

  function moveDrag(event: PointerEvent) {
    if (!dragState.value) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const preview = resolveBoardDragPreview({
      point,
      dragState: dragState.value,
      board: input.board(),
      boardInstances: input.boardInstances(),
    });
    dragState.value.previewX = preview.previewX;
    dragState.value.previewY = preview.previewY;
    dragState.value.valid = preview.valid;
    input.scheduleRender();
  }

  function endDrag(event: PointerEvent) {
    if (!dragState.value) return;
    const point = pointFromEvent(event);
    if (!point) {
      dragState.value = null;
      return;
    }
    const nextCenter = resolveDraggedBoardCenterCm({
      point,
      dragState: dragState.value,
    });
    if (
      !isBoardMovePreviewValid({
        board: input.board(),
        boardInstances: input.boardInstances(),
        instanceId: dragState.value.instanceId,
        xCm: nextCenter.xCm,
        yCm: nextCenter.yCm,
      })
    ) {
      dragState.value = null;
      input.scheduleRender();
      return;
    }
    input.moveBoard({
      id: dragState.value.instanceId,
      xCm: nextCenter.xCm,
      yCm: nextCenter.yCm,
      previewOnly: false,
    });
    dragState.value = null;
    input.scheduleRender();
  }

  return {
    dragState,
    beginDrag,
    moveDrag,
    endDrag,
  };
}
