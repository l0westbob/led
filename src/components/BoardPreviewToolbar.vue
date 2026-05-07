<script setup lang="ts">
import type { BoardPlannerPreviewSnapshot } from "@/application/planner/buildBoardPlannerPreviewSnapshot";
import { usePlannerContext } from "@/stores/plannerContext";

defineProps<{
  preview: BoardPlannerPreviewSnapshot;
}>();

const store = usePlannerContext();
</script>

<template>
  <div class="section-header">
    <div class="pill-row">
      <button
        class="ghost-button"
        type="button"
        @click="store.regenerateBoardPlannerEmittersFromGrid()"
      >
        Regenerate Grid
      </button>
      <button
        class="ghost-button"
        type="button"
        @click="store.resetBoardPlannerEmittersToDefaultLed()"
      >
        Reset LEDs to Default
      </button>
      <button
        class="ghost-button"
        type="button"
        @click="store.selectAllBoardPlannerEmitters()"
      >
        Select All
      </button>
      <button
        class="ghost-button"
        type="button"
        @click="store.clearBoardPlannerEmitterSelection()"
      >
        Clear
      </button>
    </div>
    <span class="mono">{{ preview.selectedEmitterCount }} selected</span>
    <button
      class="ghost-button"
      type="button"
      :aria-pressed="!store.boardPlannerEmitterMoveLocked"
      @click="
        store.setBoardPlannerEmitterMoveLocked(
          !store.boardPlannerEmitterMoveLocked,
        )
      "
    >
      {{
        store.boardPlannerEmitterMoveLocked ? "Move Locked" : "Move Unlocked"
      }}
    </button>
    <button
      class="ghost-button"
      type="button"
      :disabled="!store.selectedBoardPlannerEmitterId"
      @click="store.openEmitterConfig(store.selectedBoardPlannerEmitterId)"
    >
      Config Selected Emitter
    </button>
    <button
      class="ghost-button"
      type="button"
      :disabled="preview.selectedEmitterCount === 0"
      @click="store.openBulkEmitterConfig()"
    >
      Bulk Configure ({{ preview.selectedEmitterCount }})
    </button>
  </div>
</template>
