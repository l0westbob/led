<script setup lang="ts">
import SpectrumChart from "@/components/SpectrumChart.vue";

type SpectrumLegendSeries = {
  id: string;
  label: string;
  color: string;
  y: number[];
};

defineProps<{
  snapshot: {
    chartData: {
      nmMin: number;
      nmMax: number;
      series: SpectrumLegendSeries[];
    };
    yTicks: Array<{ value: number; y: number; label: string }>;
    yAxisLabel: string;
    seriesPath: (seriesY: number[]) => string;
  };
}>();
</script>

<template>
  <div class="dli-table spectrum-section">
    <div class="dli-table__header">
      <span class="stat-label">Spectrum</span>
      <span class="mono"
        >{{ snapshot.chartData.nmMin }}-{{ snapshot.chartData.nmMax }} nm</span
      >
    </div>
    <div class="spectrum-legend">
      <span
        v-for="series in snapshot.chartData.series"
        :key="series.id"
        class="spectrum-legend__item"
      >
        <span
          class="spectrum-legend__swatch"
          :style="{ background: series.color }"
        />
        <span class="mono">{{ series.label }}</span>
      </span>
    </div>

    <SpectrumChart
      :view-model="snapshot"
      aria-label="Spectral comparison chart"
    />
  </div>
</template>

<style scoped>
.spectrum-section {
  margin-top: 14px;
}

.spectrum-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
  padding: 10px 8px 8px;
}

.spectrum-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.spectrum-legend__swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}
</style>
