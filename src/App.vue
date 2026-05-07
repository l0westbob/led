<script setup>
import { computed, proxyRefs, ref } from "vue";
import PpfdHeatmap from "@/components/PpfdHeatmap.vue";
import BoardSetupSection from "@/components/BoardSetupSection.vue";
import PerformanceBenchmark from "@/components/PerformanceBenchmark.vue";
import StatsSnapshot from "@/components/StatsSnapshot.vue";
import BoardConfigModal from "@/components/BoardConfigModal.vue";
import EmitterConfigModal from "@/components/EmitterConfigModal.vue";
import BoardPreviewSection from "@/components/BoardPreviewSection.vue";
import LedComparisonPage from "@/pages/LedComparisonPage.vue";
import BoardPlannerPage from "@/pages/BoardPlannerPage.vue";
import { providePlannerStore } from "@/stores/plannerContext";
import { usePlannerStore } from "@/stores/plannerStore";

/**
 * Root composition for the planner.
 * The store centralizes the mutable state while the view remains declarative.
 */
const store = proxyRefs(usePlannerStore());
providePlannerStore(store);

const heatmapCaption = computed(
  () =>
    `${store.form.roomWidthCm} x ${store.form.roomDepthCm} cm room at ${store.state.resolutionCm} cm resolution`,
);
const resolutionOptions = [
  { label: "1 cm", value: 1 },
  { label: "2 cm", value: 2 },
  { label: "5 cm", value: 5 },
];

const activePage = ref("planner");
const showBenchmark = ref(false);
const calcTimeLabel = computed(() => `${store.ppfdSummary.calculationMs.toFixed(2)} ms`);

function handleMoveBoard(payload) {
  if (!payload?.id) return;
  if (payload.previewOnly) return;
  store.moveBoardInstance(payload.id, payload.xCm, payload.yCm);
}
</script>

<template>
  <section class="card top-switch-card">
    <div class="top-switch-row">
      <div class="pill-row">
        <button
          class="pill"
          :class="{ active: activePage === 'board-planner' }"
          type="button"
          @click="activePage = 'board-planner'"
        >
          Board Planner
        </button>
        <button
          class="pill"
          :class="{ active: activePage === 'planner' }"
          type="button"
          @click="activePage = 'planner'"
        >
          Lamp Planner
        </button>
        <template v-if="activePage === 'planner'">
          <button
            v-for="option in resolutionOptions"
            :key="option.value"
            class="pill"
            :class="{ active: store.state.resolutionCm === option.value }"
            type="button"
            @click="store.setResolution(option.value)"
          >
            {{ option.label }}
          </button>
        </template>
      </div>

      <button
        v-if="activePage === 'planner'"
        class="ghost-button"
        type="button"
        @click="showBenchmark = !showBenchmark"
      >
        {{ calcTimeLabel }} · {{ showBenchmark ? "Hide Performance Check" : "Show Performance Check" }}
      </button>
    </div>

    <PerformanceBenchmark
      v-if="activePage === 'planner' && showBenchmark"
      class="performance-benchmark-expanded"
    />
  </section>

  <div class="app-shell">
    <main class="visual-panel full-width-panel">
      <section v-if="activePage === 'planner'" class="card">
        <BoardSetupSection />
      </section>

      <section v-if="activePage === 'planner'" class="card">
        <div class="field-grid map-header-grid">
          <label class="field">
            <span>Distance to Slice (cm)</span>
            <input
              v-model.number="store.form.distanceCm"
              type="number"
              min="1"
              max="100"
              step="1"
            />
          </label>
          <label class="field">
            <span>Room Width (cm)</span>
            <input
              v-model.number="store.form.roomWidthCm"
              type="number"
              min="10"
              step="1"
            />
          </label>
          <label class="field">
            <span>Room Depth (cm)</span>
            <input
              v-model.number="store.form.roomDepthCm"
              type="number"
              min="10"
              step="1"
            />
          </label>
          <label class="field">
            <span>Photoperiod (h/day)</span>
            <input
              v-model.number="store.form.photoperiodHours"
              type="number"
              min="0"
              max="24"
              step="0.25"
            />
          </label>
        </div>
      </section>

      <details v-if="activePage === 'planner'" class="card collapsible-card heatmap-card" open>
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

      <details v-if="activePage === 'planner'" class="card collapsible-card" open>
        <summary class="section-header collapsible-summary">
          <h2>Snapshot</h2>
        </summary>
        <StatsSnapshot />
      </details>

      <template v-else>
        <BoardPlannerPage />
        <BoardPreviewSection />
        <LedComparisonPage />
      </template>
    </main>
  </div>
  <BoardConfigModal />
  <EmitterConfigModal />
</template>

<style scoped>
.performance-benchmark-expanded {
  margin-top: 14px;
}
</style>
