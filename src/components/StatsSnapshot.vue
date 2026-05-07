<script setup lang="ts">
import { computed } from "vue";
import StatCard from "@/components/StatCard.vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();

function toDliMol(ppfdUmolM2S: number, hoursPerDay: number): number {
  const ppfd = Number(ppfdUmolM2S) || 0;
  const hours = Math.max(0, Number(hoursPerDay) || 0);
  // DLI (mol/m^2/day) = PPFD (umol/m^2/s) * 3600s/h * h/day / 1e6 umol/mol
  return (ppfd * 3600 * hours) / 1_000_000;
}

const dliRows = computed(() => {
  const hours = store.form.photoperiodHours;
  const summary = store.ppfdSummary;
  return [
    { label: "DLI Min", value: toDliMol(summary.min, hours) },
    { label: "DLI Avg", value: toDliMol(summary.average, hours) },
    { label: "DLI Max", value: toDliMol(summary.max, hours) },
  ];
});
</script>

<template>
  <section class="card stats-card">
    <div class="section-header">
      <h2>Snapshot</h2>
    </div>

    <div class="stats-grid">
      <StatCard
        v-for="stat in store.stats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
      />
    </div>

    <div class="dli-table" aria-label="Daily Light Integral">
      <div class="dli-table__header">
        <span class="stat-label">DLI (mol/m²/day)</span>
        <span class="mono"
          >{{ Number(store.form.photoperiodHours || 0) }} h</span
        >
      </div>
      <div class="dli-table__grid dli-table__grid--single-row">
        <div v-for="row in dliRows" :key="row.label" class="dli-table__row">
          <span class="dli-table__label">{{ row.label }}</span>
          <span class="dli-table__value">{{ row.value.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <p class="note">
      Snapshot values combine the resolved electrical operating point, the LED's
      calibrated photon model, and the current fixture layout. PPFD remains an
      interactive approximation and does not yet model optics or reflections.
    </p>
  </section>
</template>

<style scoped>
.dli-table__grid--single-row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 820px) {
  .dli-table__grid--single-row {
    grid-template-columns: 1fr;
  }
}
</style>
