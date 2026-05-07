<script setup lang="ts">
import { computed } from "vue";

type SpectrumChartSeries = {
  id: string;
  color: string;
  y: number[];
};

type SpectrumChartViewModel = {
  series?: SpectrumChartSeries[];
  chartData?: {
    series?: SpectrumChartSeries[];
  };
  yTicks: Array<{ value: number; y: number; label: string }>;
  yAxisLabel: string;
  seriesPath: (seriesY: number[]) => string;
};

const props = withDefaults(
  defineProps<{
    viewModel: SpectrumChartViewModel;
    ariaLabel?: string;
  }>(),
  {
    ariaLabel: "Spectral chart",
  },
);

const chartSeries = computed(
  () => props.viewModel.series ?? props.viewModel.chartData?.series ?? [],
);
</script>

<template>
  <div class="spectrum-chart">
    <svg :viewBox="`0 0 900 260`" role="img" :aria-label="ariaLabel">
      <rect
        x="0"
        y="0"
        width="900"
        height="260"
        rx="16"
        fill="rgba(255,255,255,0.03)"
      />
      <g stroke="rgba(255,255,255,0.10)" stroke-width="1">
        <line x1="60" y1="40" x2="60" y2="220" />
        <line x1="210" y1="40" x2="210" y2="220" />
        <line x1="360" y1="40" x2="360" y2="220" />
        <line x1="510" y1="40" x2="510" y2="220" />
        <line x1="660" y1="40" x2="660" y2="220" />
        <line x1="810" y1="40" x2="810" y2="220" />
        <line
          v-for="tick in viewModel.yTicks"
          :key="`grid-y-${tick.value}`"
          x1="60"
          :y1="tick.y"
          x2="840"
          :y2="tick.y"
        />
      </g>
      <g
        fill="rgba(255,255,255,0.55)"
        font-size="12"
        font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      >
        <text x="60" y="242">280</text>
        <text x="205" y="242">400</text>
        <text x="355" y="242">520</text>
        <text x="505" y="242">640</text>
        <text x="655" y="242">760</text>
        <text x="812" y="242">840</text>
        <text x="14" y="20">{{ viewModel.yAxisLabel }}</text>
        <text
          v-for="tick in viewModel.yTicks"
          :key="`tick-label-${tick.value}`"
          x="28"
          :y="tick.y + 4"
        >
          {{ tick.label }}
        </text>
      </g>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path
          v-for="series in chartSeries"
          :key="series.id"
          :d="viewModel.seriesPath(series.y)"
          :stroke="series.color"
          :stroke-width="
            series.id.startsWith('led-') || series.id === 'board-spectrum'
              ? 2.5
              : 1.25
          "
          :opacity="
            series.id.startsWith('led-') || series.id === 'board-spectrum'
              ? 0.95
              : 0.35
          "
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.spectrum-chart {
  padding: 8px;
}

.spectrum-chart svg {
  width: 100%;
  height: auto;
  display: block;
}
</style>
