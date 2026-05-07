<script setup lang="ts">
import { computed, defineAsyncComponent, proxyRefs, ref } from "vue";
import PerformanceBenchmark from "@/components/PerformanceBenchmark.vue";
import BoardConfigModal from "@/components/BoardConfigModal.vue";
import EmitterConfigModal from "@/components/EmitterConfigModal.vue";
import BulkEmitterConfigModal from "@/components/BulkEmitterConfigModal.vue";
import LampPlannerPage from "@/pages/LampPlannerPage.vue";
import { providePlannerStore } from "@/stores/plannerContext";
import { usePlannerStore } from "@/stores/plannerStore";

const BoardPlannerPage = defineAsyncComponent(
  () => import("@/pages/BoardPlannerPage.vue"),
);
const BoardPreviewSection = defineAsyncComponent(
  () => import("@/components/BoardPreviewSection.vue"),
);
const LedComparisonPage = defineAsyncComponent(
  () => import("@/pages/LedComparisonPage.vue"),
);

/**
 * Root composition for the planner.
 * The store centralizes the mutable state while the view remains declarative.
 */
const store = proxyRefs(usePlannerStore());
providePlannerStore(store);

const resolutionOptions = [
  { label: "1 cm", value: 1 },
  { label: "2 cm", value: 2 },
  { label: "5 cm", value: 5 },
];

const activePage = ref("planner");
const showBenchmark = ref(false);
const calcTimeLabel = computed(
  () => `${store.ppfdSummary.calculationMs.toFixed(2)} ms`,
);
</script>

<template>
  <section class="card top-switch-card">
    <div class="top-switch-row">
      <div class="pill-row">
        <button
          class="pill"
          :class="{ active: activePage === 'board-planner' }"
          type="button"
          :aria-pressed="activePage === 'board-planner'"
          @click="activePage = 'board-planner'"
        >
          Board Planner
        </button>
        <button
          class="pill"
          :class="{ active: activePage === 'planner' }"
          type="button"
          :aria-pressed="activePage === 'planner'"
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
            :aria-pressed="store.state.resolutionCm === option.value"
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
        {{ calcTimeLabel }} ·
        {{
          showBenchmark ? "Hide Performance Check" : "Show Performance Check"
        }}
      </button>
    </div>

    <PerformanceBenchmark
      v-if="activePage === 'planner' && showBenchmark"
      class="performance-benchmark-expanded"
    />
  </section>

  <div class="app-shell">
    <main class="visual-panel full-width-panel">
      <LampPlannerPage v-if="activePage === 'planner'" />

      <template v-else>
        <BoardPlannerPage />
        <BoardPreviewSection />
        <LedComparisonPage />
      </template>
    </main>
  </div>
  <BoardConfigModal />
  <EmitterConfigModal />
  <BulkEmitterConfigModal />
</template>

<style scoped>
.performance-benchmark-expanded {
  margin-top: 14px;
}
</style>
