<script setup>
import { computed } from "vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();

const hasResults = computed(() => store.benchmarkRows.length > 0);
</script>

<template>
  <section class="card benchmark-card">
    <div class="section-header">
      <h2>Performance Check</h2>
      <button
        class="ghost-button"
        type="button"
        @click="store.runPerformanceBenchmark()"
      >
        Run Benchmark
      </button>
    </div>

    <p class="note">
      Benchmark runs the default PPFD estimator for 1, 2, 4, and 8 boards using
      the current room size and slice resolution (3 rounds each).
    </p>

    <table v-if="hasResults" class="benchmark-table">
      <thead>
        <tr>
          <th>Boards</th>
          <th>Emitters</th>
          <th>Grid Cells</th>
          <th>Avg Time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in store.benchmarkRows" :key="row.boardCount">
          <td>{{ row.boardCount }}</td>
          <td>{{ row.emitterCount }}</td>
          <td>{{ row.cellCount }}</td>
          <td>{{ row.averageMs.toFixed(2) }} ms</td>
        </tr>
      </tbody>
    </table>

    <p v-else class="note">
      No benchmark data yet. Run it once to collect baseline timings.
    </p>
  </section>
</template>
