<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { createHeatmapColor } from "@/utils/colors";
import { getRotatedBoardFootprintMm } from "@/domain/boardGeometry";

const props = defineProps({
  board: {
    type: Object,
    required: true,
  },
  summary: {
    type: Object,
    required: true,
  },
  boardInstances: {
    type: Array,
    default: () => [],
  },
  selectedBoardInstanceId: {
    type: String,
    default: "",
  },
});
const emit = defineEmits(["select-board", "move-board"]);

const containerRef = ref(null);
const canvasRef = ref(null);
const canvasWidth = ref(900);
const canvasHeight = ref(540);
let resizeObserver = null;
const dragState = ref(null);

const hasInstances = computed(() => props.boardInstances.length > 0);

function effectiveSizeMm(instance) {
  return getRotatedBoardFootprintMm({
    widthMm: Number(instance.widthMm || props.board.widthMm),
    depthMm: Number(instance.depthMm || props.board.depthMm),
    rotationDeg: instance.rotationDeg,
  });
}

/**
 * Converts board millimeter dimensions into the heatmap canvas coordinate space.
 *
 * @returns {Array<{x: number, y: number, width: number, height: number}>}
 */
function getBoardRects() {
  const scaleX = canvasWidth.value / (props.board.roomWidthCm * 10);
  const scaleY = canvasHeight.value / (props.board.roomDepthCm * 10);

  const rects = [];
  for (const instance of props.boardInstances) {
    const { widthMm, depthMm } = effectiveSizeMm(instance);
    const xMm = Number(instance.xCm || 0) * 10 - widthMm * 0.5;
    const yMm = Number(instance.yCm || 0) * 10 - depthMm * 0.5;
    rects.push({
      id: instance.id,
      x: xMm * scaleX,
      y: yMm * scaleY,
      width: widthMm * scaleX,
      height: depthMm * scaleY,
    });
  }
  return rects;
}

function aspectRatio() {
  const w = Math.max(1, Number(props.board.roomWidthCm) || 1);
  const d = Math.max(1, Number(props.board.roomDepthCm) || 1);
  return w / d;
}

function resizeCanvasToContainer() {
  const container = containerRef.value;
  const canvas = canvasRef.value;
  if (!container || !canvas) return;

  const rect = container.getBoundingClientRect();
  const ratio = aspectRatio();

  // Fit inside container while honoring room ratio.
  let cssWidth = rect.width;
  let cssHeight = cssWidth / ratio;
  if (cssHeight > rect.height) {
    cssHeight = rect.height;
    cssWidth = cssHeight * ratio;
  }

  const dpr = window.devicePixelRatio || 1;
  canvasWidth.value = Math.max(1, Math.round(cssWidth * dpr));
  canvasHeight.value = Math.max(1, Math.round(cssHeight * dpr));

  canvas.width = canvasWidth.value;
  canvas.height = canvasHeight.value;

  // Size the element in CSS pixels for layout.
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
}

/**
 * Paints a low-cost preview heatmap.
 * The estimator remains separate so this component only worries about pixels.
 */
function renderCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

  const cellWidth = canvasWidth.value / props.summary.gridWidth;
  const cellHeight = canvasHeight.value / props.summary.gridDepth;

  for (let y = 0; y < props.summary.gridDepth; y += 1) {
    for (let x = 0; x < props.summary.gridWidth; x += 1) {
      const value = props.summary.values[y * props.summary.gridWidth + x];
      const range = Math.max(1, props.summary.max - props.summary.min);
      const normalized = (value - props.summary.min) / range;
      ctx.fillStyle = createHeatmapColor(normalized);
      ctx.fillRect(
        x * cellWidth,
        y * cellHeight,
        cellWidth + 0.5,
        cellHeight + 0.5,
      );
    }
  }

  // 10cm overlay grid with PPFD labels.
  const binCm = 10;
  const binCellsX = Math.max(
    1,
    Math.round(
      (binCm / Math.max(1, props.board.roomWidthCm)) * props.summary.gridWidth,
    ),
  );
  const binCellsY = Math.max(
    1,
    Math.round(
      (binCm / Math.max(1, props.board.roomDepthCm)) * props.summary.gridDepth,
    ),
  );
  const binCountX = Math.ceil(props.summary.gridWidth / binCellsX);
  const binCountY = Math.ceil(props.summary.gridDepth / binCellsY);

  ctx.save();
  ctx.strokeStyle = "rgba(186, 194, 210, 0.42)";
  ctx.lineWidth = 1.25;
  ctx.setLineDash([7, 7]);

  for (let bx = 0; bx <= binCountX; bx += 1) {
    const x = bx * binCellsX * cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight.value);
    ctx.stroke();
  }

  for (let by = 0; by <= binCountY; by += 1) {
    const y = by * binCellsY * cellHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth.value, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const fontPx = Math.max(
    10,
    Math.min(
      26,
      Math.round(
        Math.min(binCellsX * cellWidth, binCellsY * cellHeight) * 0.22,
      ),
    ),
  );
  ctx.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const valueRange = Math.max(1, props.summary.max - props.summary.min);

  for (let by = 0; by < binCountY; by += 1) {
    const startY = by * binCellsY;
    const endY = Math.min(props.summary.gridDepth, startY + binCellsY);
    for (let bx = 0; bx < binCountX; bx += 1) {
      const startX = bx * binCellsX;
      const endX = Math.min(props.summary.gridWidth, startX + binCellsX);

      let sum = 0;
      let count = 0;
      for (let y = startY; y < endY; y += 1) {
        const rowOffset = y * props.summary.gridWidth;
        for (let x = startX; x < endX; x += 1) {
          sum += props.summary.values[rowOffset + x];
          count += 1;
        }
      }

      if (count === 0) continue;
      const avg = sum / count;
      const normalized = (avg - props.summary.min) / valueRange;

      // Low values map to blue-ish colors, so use white text there.
      const useWhite = normalized < 0.35;
      ctx.fillStyle = useWhite ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.82)";
      ctx.shadowColor = useWhite
        ? "rgba(0,0,0,0.55)"
        : "rgba(255,255,255,0.35)";
      ctx.shadowBlur = 6;

      const cx = (startX + (endX - startX) / 2) * cellWidth;
      const cy = (startY + (endY - startY) / 2) * cellHeight;
      ctx.fillText(String(Math.round(avg)), cx, cy);
    }
  }

  ctx.restore();

  ctx.setLineDash([10, 6]);
  for (const rect of getBoardRects()) {
    const isDragged = dragState.value?.instanceId === rect.id;
    const drawX = isDragged
      ? dragState.value.previewX - rect.width * 0.5
      : rect.x;
    const drawY = isDragged
      ? dragState.value.previewY - rect.height * 0.5
      : rect.y;
    const selected = rect.id === props.selectedBoardInstanceId;
    ctx.strokeStyle = selected
      ? "rgba(44, 138, 255, 1)"
      : "rgba(24, 108, 230, 0.98)";
    ctx.lineWidth = selected ? 3.8 : 3;
    if (isDragged && !dragState.value.valid) {
      ctx.strokeStyle = "rgba(255, 98, 98, 0.95)";
    }
    ctx.strokeRect(drawX, drawY, rect.width, rect.height);
  }
  ctx.setLineDash([]);
}

function canvasPoint(event) {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvasWidth.value / Math.max(1, rect.width);
  const scaleY = canvasHeight.value / Math.max(1, rect.height);
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function instanceAtPoint(point) {
  const rects = getBoardRects();
  for (let index = rects.length - 1; index >= 0; index -= 1) {
    const rect = rects[index];
    if (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    ) {
      return rect;
    }
  }
  return null;
}

function isPreviewValid(instanceId, xCm, yCm) {
  const current = props.boardInstances.find((item) => item.id === instanceId);
  if (!current) return false;
  const currentSize = effectiveSizeMm(current);
  const halfW = (currentSize.widthMm / 10) * 0.5;
  const halfH = (currentSize.depthMm / 10) * 0.5;
  if (
    xCm - halfW < 0 ||
    xCm + halfW > props.board.roomWidthCm ||
    yCm - halfH < 0 ||
    yCm + halfH > props.board.roomDepthCm
  ) {
    return false;
  }

  for (const other of props.boardInstances) {
    if (other.id === instanceId) continue;
    const otherSize = effectiveSizeMm(other);
    const otherHalfW = (otherSize.widthMm / 10) * 0.5;
    const otherHalfH = (otherSize.depthMm / 10) * 0.5;
    if (
      Math.abs(xCm - Number(other.xCm || 0)) < halfW + otherHalfW &&
      Math.abs(yCm - Number(other.yCm || 0)) < halfH + otherHalfH
    ) {
      return false;
    }
  }
  return true;
}

function beginDrag(event) {
  if (!hasInstances.value) return;
  const point = canvasPoint(event);
  if (!point) return;
  const hit = instanceAtPoint(point);
  if (!hit) return;

  emit("select-board", hit.id);

  const scaleX = canvasWidth.value / (props.board.roomWidthCm * 10);
  const scaleY = canvasHeight.value / (props.board.roomDepthCm * 10);
  const centerX = hit.x + hit.width * 0.5;
  const centerY = hit.y + hit.height * 0.5;

  dragState.value = {
    instanceId: hit.id,
    offsetX: point.x - centerX,
    offsetY: point.y - centerY,
    scaleX,
    scaleY,
    previewX: centerX,
    previewY: centerY,
    valid: true,
  };
}

function moveDrag(event) {
  if (!dragState.value) return;
  const point = canvasPoint(event);
  if (!point) return;
  dragState.value.previewX = point.x - dragState.value.offsetX;
  dragState.value.previewY = point.y - dragState.value.offsetY;
  const nextXCm = dragState.value.previewX / dragState.value.scaleX / 10;
  const nextYCm = dragState.value.previewY / dragState.value.scaleY / 10;
  dragState.value.valid = isPreviewValid(
    dragState.value.instanceId,
    nextXCm,
    nextYCm,
  );
  renderCanvas();
}

function endDrag(event) {
  if (!dragState.value) return;
  const point = canvasPoint(event);
  if (!point) {
    dragState.value = null;
    return;
  }
  const nextXCm = (point.x - dragState.value.offsetX) / dragState.value.scaleX / 10;
  const nextYCm = (point.y - dragState.value.offsetY) / dragState.value.scaleY / 10;
  if (!isPreviewValid(dragState.value.instanceId, nextXCm, nextYCm)) {
    dragState.value = null;
    renderCanvas();
    return;
  }
  emit("move-board", {
    id: dragState.value.instanceId,
    xCm: nextXCm,
    yCm: nextYCm,
    previewOnly: false,
  });
  dragState.value = null;
}

onMounted(renderCanvas);
onMounted(() => {
  resizeCanvasToContainer();
  resizeObserver = new ResizeObserver(() => {
    resizeCanvasToContainer();
    renderCanvas();
  });
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
  renderCanvas();
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.addEventListener("pointerdown", beginDrag);
    canvas.addEventListener("pointermove", moveDrag);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointerleave", endDrag);
  }
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
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
    props.summary,
    props.board.roomWidthCm,
    props.board.roomDepthCm,
    props.boardInstances,
    props.selectedBoardInstanceId,
  ],
  () => {
    resizeCanvasToContainer();
    renderCanvas();
  },
  { deep: true },
);
</script>

<template>
  <div ref="containerRef" class="heatmap-frame">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>
