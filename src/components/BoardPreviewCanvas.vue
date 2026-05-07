<script setup lang="ts">
import type { BoardPlannerPreviewSnapshot } from "@/application/planner/buildBoardPlannerPreviewSnapshot";
import { useBoardPreviewCanvasInteraction } from "@/components/boardPreview/useBoardPreviewCanvasInteraction";
import { usePlannerContext } from "@/stores/plannerContext";

const props = defineProps<{
  preview: BoardPlannerPreviewSnapshot;
}>();

const store = usePlannerContext();

const viewBoxWidth = 900;
const viewBoxHeight = 360;
const padding = 24;

const {
  boardRect,
  emitterPosition,
  emitterClassName,
  emitterDragController,
  handleEmitterPointerDown,
} = useBoardPreviewCanvasInteraction({
  preview: () => props.preview,
  store,
  viewBoxWidth,
  viewBoxHeight,
  padding,
});
</script>

<template>
  <div class="board-preview-shell">
    <svg
      :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
      class="board-preview-svg"
      role="group"
      aria-label="Board preview"
    >
      <rect
        :x="boardRect.x"
        :y="boardRect.y"
        :width="boardRect.width"
        :height="boardRect.height"
        rx="12"
        class="board-preview-rect"
      />
      <g
        v-for="emitter in preview.emitters"
        :key="emitter.id"
        class="emitter-node"
        @pointerdown="handleEmitterPointerDown($event, emitter.id)"
        @pointermove="
          emitterDragController.handlePointerMove($event, emitter.id)
        "
        @pointerup="emitterDragController.handlePointerUp($event, emitter.id)"
        @pointercancel="emitterDragController.handlePointerCancel()"
      >
        <circle
          :cx="emitterPosition(emitter).x"
          :cy="emitterPosition(emitter).y"
          :r="
            store.selectedBoardPlannerEmitterId === emitter.id
              ? 7
              : store.selectedBoardPlannerEmitterIds.includes(emitter.id)
                ? 6
                : 5
          "
          :class="emitterClassName(emitter)"
        />
      </g>
    </svg>
    <button
      v-for="(emitter, index) in preview.emitters"
      :key="`emitter-hit-${emitter.id}`"
      class="emitter-hit-button"
      type="button"
      :style="{
        left: `${(emitterPosition(emitter).x / viewBoxWidth) * 100}%`,
        top: `${(emitterPosition(emitter).y / viewBoxHeight) * 100}%`,
      }"
      :aria-label="`Emitter ${index + 1}`"
      :aria-pressed="store.selectedBoardPlannerEmitterIds.includes(emitter.id)"
      @pointerdown="handleEmitterPointerDown($event, emitter.id)"
      @pointermove="emitterDragController.handlePointerMove($event, emitter.id)"
      @pointerup="emitterDragController.handlePointerUp($event, emitter.id)"
      @pointercancel="emitterDragController.handlePointerCancel()"
    />
  </div>
</template>

<style scoped>
.board-preview-shell {
  border: 1px solid var(--line-panel);
  border-radius: 16px;
  background: rgba(8, 12, 21, 0.95);
  padding: 8px;
  margin-bottom: 14px;
  position: relative;
}

.board-preview-svg {
  width: 100%;
  display: block;
}

.board-preview-rect {
  fill: rgba(86, 225, 255, 0.12);
  stroke: rgba(86, 225, 255, 0.55);
  stroke-width: 2;
}

.emitter-node {
  cursor: pointer;
}

.emitter-hit-button {
  position: absolute;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: transparent;
  cursor: pointer;
  transform: translate(-50%, -50%);
}

.emitter-hit-button:focus-visible {
  outline: 2px solid rgba(255, 234, 138, 0.95);
  outline-offset: 3px;
}

.emitter-circle {
  fill: rgba(217, 255, 112, 0.85);
  stroke: rgba(10, 18, 30, 0.85);
  stroke-width: 1.5;
}

.emitter-circle.selected {
  fill: rgba(255, 170, 60, 0.95);
  stroke: rgba(255, 234, 138, 0.95);
  stroke-width: 2;
}

.emitter-circle.selected-secondary {
  fill: rgba(250, 224, 163, 0.92);
  stroke: rgba(255, 236, 182, 0.95);
  stroke-width: 1.9;
}

.emitter-circle.override {
  fill: rgba(255, 78, 78, 0.92);
  stroke: rgba(255, 178, 178, 0.95);
  stroke-width: 1.8;
}

.emitter-circle.selected.override {
  fill: rgba(255, 110, 110, 1);
  stroke: rgba(255, 220, 220, 1);
  stroke-width: 2.2;
}

.emitter-circle.selected-secondary.override {
  fill: rgba(255, 138, 138, 0.95);
  stroke: rgba(255, 220, 220, 0.95);
  stroke-width: 2;
}
</style>
