<script setup lang="ts">
import LedComparisonControls from "@/components/LedComparisonControls.vue";
import LedPhotonFluxTable from "@/components/LedPhotonFluxTable.vue";
import LedSpectralMetricTables from "@/components/LedSpectralMetricTables.vue";
import LedSpectrumChartSection from "@/components/LedSpectrumChartSection.vue";
import { useLedLabStore } from "@/stores/ledLabStore";

const store = useLedLabStore();
const snapshot = store.snapshot;
</script>

<template>
  <details class="card collapsible-card">
    <summary class="section-header collapsible-summary">
      <h2>LED Lab</h2>
    </summary>

    <LedComparisonControls />

    <div class="dli-table spectral-weighting-panel">
      <div class="dli-table__header">
        <span class="stat-label">Spectral Weighting (relative)</span>
        <span class="mono"
          >{{ snapshot.points1nm }} pts (1nm) -> {{ snapshot.points5nm }} pts
          (5nm)</span
        >
      </div>
      <p
        v-if="snapshot.spectralStats.error"
        class="note"
        style="margin: 0 0 10px"
      >
        {{ snapshot.spectralStats.error }}
      </p>

      <LedPhotonFluxTable
        v-if="store.state.mode === 'photon'"
        :snapshot="snapshot"
      />
      <LedSpectralMetricTables :snapshot="snapshot" />
    </div>

    <LedSpectrumChartSection :snapshot="snapshot" />
  </details>
</template>

<style scoped>
.spectral-weighting-panel {
  margin-top: 14px;
}
</style>
