<script setup lang="ts">
import { computed } from "vue";
import BoardSetupSection from "@/components/BoardSetupSection.vue";
import PpfdHeatmap from "@/components/PpfdHeatmap.vue";
import StatsSnapshot from "@/components/StatsSnapshot.vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();

const heatmapCaption = computed(
  () =>
    `${store.form.roomWidthCm} x ${store.form.roomDepthCm} cm room at ${store.state.resolutionCm} cm resolution`,
);

type BoardMovePayload = {
  id?: string;
  xCm: number;
  yCm: number;
  previewOnly?: boolean;
};

function valueFromEvent(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : "";
}

function handleMoveBoard(payload: BoardMovePayload) {
  if (!payload?.id) return;
  if (payload.previewOnly) return;
  store.moveBoardInstance(payload.id, payload.xCm, payload.yCm);
}
</script>

<template>
  <section class="card">
    <BoardSetupSection />
  </section>

  <section class="card">
    <div class="field-grid map-header-grid">
      <label class="field">
        <span>Distance to Slice (cm)</span>
        <input
          :value="store.form.distanceCm"
          type="number"
          min="1"
          max="100"
          step="1"
          @input="store.applyUserEdit('distanceCm', valueFromEvent($event))"
        />
      </label>
      <label class="field">
        <span>Room Width (cm)</span>
        <input
          :value="store.form.roomWidthCm"
          type="number"
          min="10"
          step="1"
          @input="store.applyUserEdit('roomWidthCm', valueFromEvent($event))"
        />
      </label>
      <label class="field">
        <span>Room Depth (cm)</span>
        <input
          :value="store.form.roomDepthCm"
          type="number"
          min="10"
          step="1"
          @input="store.applyUserEdit('roomDepthCm', valueFromEvent($event))"
        />
      </label>
      <label class="field">
        <span>Photoperiod (h/day)</span>
        <input
          :value="store.form.photoperiodHours"
          type="number"
          min="0"
          max="24"
          step="0.25"
          @input="
            store.applyUserEdit('photoperiodHours', valueFromEvent($event))
          "
        />
      </label>
    </div>
  </section>

  <details class="card collapsible-card heatmap-card" open>
    <summary class="section-header collapsible-summary">
      <h2>PPFD Map Preview</h2>
      <span class="mono">{{ heatmapCaption }}</span>
    </summary>
    <PpfdHeatmap
      :board="store.board"
      :summary="store.ppfdSummary"
      :board-instances="store.boardInstances"
      :selected-board-instance-id="store.selectedBoardInstanceId"
      @select-board="store.selectBoardInstance"
      @move-board="handleMoveBoard"
    />
  </details>

  <details class="card collapsible-card" open>
    <summary class="section-header collapsible-summary">
      <h2>Snapshot</h2>
    </summary>
    <StatsSnapshot />
  </details>
</template>
