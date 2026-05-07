<script setup lang="ts">
import { computed } from "vue";
import { buildSpectrumChartViewModel } from "@/application/ledLab/buildSpectrumChartViewModel";
import type { BoardPlannerPreviewSnapshot } from "@/application/planner/buildBoardPlannerPreviewSnapshot";
import SegmentedControl from "@/components/controls/SegmentedControl.vue";
import SpectrumChart from "@/components/SpectrumChart.vue";
import { usePlannerContext } from "@/stores/plannerContext";

const props = defineProps<{
  preview: BoardPlannerPreviewSnapshot;
}>();

const store = usePlannerContext();
const spectrumModeOptions = [
  { value: "relative", label: "Relative" },
  { value: "photon", label: "Photon" },
];

const boardSpectrumSeries = computed(() => {
  if (store.boardPlannerSpectrumMode === "photon") {
    return props.preview.aggregatePhotonSpectrum?.values ?? [];
  }
  return props.preview.aggregateRelativeSpectrum?.values ?? [];
});

const boardSpectrumChart = computed(() =>
  buildSpectrumChartViewModel({
    mode: store.boardPlannerSpectrumMode,
    nmMin: 280,
    nmMax: 840,
    series: [
      {
        id: "board-spectrum",
        label: "Board Spectrum",
        color: "#56e1ff",
        y: boardSpectrumSeries.value,
      },
    ],
  }),
);
</script>

<template>
  <div class="dli-table board-spectrum-chart">
    <div class="dli-table__header">
      <span class="stat-label">Board Spectrum</span>
      <span class="mono">280-840 nm</span>
    </div>
    <div class="field-grid two-columns" style="margin-top: 10px">
      <SegmentedControl
        label="SPD Mode"
        aria-label="SPD mode"
        :options="spectrumModeOptions"
        :model-value="store.boardPlannerSpectrumMode"
        @change="store.setBoardPlannerSpectrumMode"
      />
    </div>

    <SpectrumChart
      :view-model="boardSpectrumChart"
      aria-label="Board spectral chart"
    />
  </div>
</template>

<style scoped>
.board-spectrum-chart {
  margin-top: 14px;
}
</style>
