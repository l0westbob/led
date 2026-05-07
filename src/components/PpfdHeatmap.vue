<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  renderPpfdHeatmapCanvas,
  resolveHeatmapAspectRatio,
  resolveHeatmapBoardRects,
  type HeatmapBoard,
  type HeatmapBoardInstance,
  type HeatmapSummary,
} from "@/components/ppfdHeatmapCanvas";
import { useHeatmapBoardDrag } from "@/components/heatmap/useHeatmapBoardDrag";
import { useResizableCanvas } from "@/components/heatmap/useResizableCanvas";
import { useScheduledCanvasRender } from "@/components/heatmap/useScheduledCanvasRender";

const props = withDefaults(
  defineProps<{
    board: HeatmapBoard;
    summary: HeatmapSummary;
    boardInstances?: HeatmapBoardInstance[];
    selectedBoardInstanceId?: string;
  }>(),
  {
    boardInstances: () => [],
    selectedBoardInstanceId: "",
  },
);
const emit = defineEmits<{
  "select-board": [id: string];
  "move-board": [
    payload: {
      id: string;
      xCm: number;
      yCm: number;
      previewOnly: false;
    },
  ];
}>();

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasWidth = ref(900);
const canvasHeight = ref(540);

function getBoardRects() {
  return resolveHeatmapBoardRects({
    board: props.board,
    boardInstances: props.boardInstances,
    canvasWidth: canvasWidth.value,
    canvasHeight: canvasHeight.value,
  });
}

function aspectRatio() {
  return resolveHeatmapAspectRatio(props.board);
}

function renderCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  renderPpfdHeatmapCanvas({
    ctx,
    canvasWidth: canvasWidth.value,
    canvasHeight: canvasHeight.value,
    board: props.board,
    summary: props.summary,
    boardRects: getBoardRects(),
    selectedBoardInstanceId: props.selectedBoardInstanceId,
    dragPreview: dragState.value,
  });
}

const { cancelScheduledRender, renderImmediately, scheduleRender } =
  useScheduledCanvasRender(renderCanvas);
const { resizeCanvasToContainer, startResizeObserver, stopResizeObserver } =
  useResizableCanvas({
    containerRef,
    canvasRef,
    canvasWidth,
    canvasHeight,
    aspectRatio,
    onResize: scheduleRender,
  });
const { dragState, beginDrag, moveDrag, endDrag } = useHeatmapBoardDrag({
  board: () => props.board,
  boardInstances: () => props.boardInstances,
  canvasRef,
  canvasWidth,
  canvasHeight,
  getBoardRects,
  scheduleRender,
  selectBoard: (id) => emit("select-board", id),
  moveBoard: (payload) => emit("move-board", payload),
});

onMounted(() => {
  resizeCanvasToContainer();
  startResizeObserver();
  renderImmediately();
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.addEventListener("pointerdown", beginDrag);
    canvas.addEventListener("pointermove", moveDrag);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointerleave", endDrag);
  }
});
onBeforeUnmount(() => {
  stopResizeObserver();
  cancelScheduledRender();
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.removeEventListener("pointerdown", beginDrag);
    canvas.removeEventListener("pointermove", moveDrag);
    canvas.removeEventListener("pointerup", endDrag);
    canvas.removeEventListener("pointerleave", endDrag);
  }
});

watch(
  () => [
    props.summary.values,
    props.summary.gridWidth,
    props.summary.gridDepth,
    props.summary.min,
    props.summary.max,
    props.board.roomWidthCm,
    props.board.roomDepthCm,
    props.board.widthMm,
    props.board.depthMm,
    props.boardInstances
      .map(
        (instance) =>
          `${instance.id}:${instance.xCm}:${instance.yCm}:${instance.widthMm}:${instance.depthMm}:${instance.rotationDeg}`,
      )
      .join("|"),
    props.selectedBoardInstanceId,
  ],
  () => {
    resizeCanvasToContainer();
    scheduleRender();
  },
);
</script>

<template>
  <div ref="containerRef" class="heatmap-frame">
    <canvas ref="canvasRef" role="img" aria-label="PPFD heatmap"></canvas>
  </div>
</template>
