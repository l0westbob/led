<script setup lang="ts">
type BoardPreviewSpectrumSummary = {
  cct?: {
    valueK: number | null;
    method: string;
    confidence?: string;
    warningCode?: string | null;
  };
  boardElectricalEstimate: {
    boardVoltageV: number;
    boardCurrentA: number;
    inputPowerW: number;
    seriesCount: number;
    parallelCount: number;
  };
  spectralStats: {
    parRatio: number;
    pbarRatio: number;
    mccreeRatio: number;
    dinRatio: number;
  };
};

defineProps<{
  preview: BoardPreviewSpectrumSummary;
}>();
</script>

<template>
  <div class="dli-table">
    <div class="dli-table__header">
      <span class="stat-label">Board Spectrum Summary</span>
      <span class="mono">
        CCT:
        {{ preview.cct?.valueK ?? "n/a" }} /
        {{ preview.cct?.method ?? "unknown-method" }} /
        {{ preview.cct?.confidence ?? "unknown-confidence" }}
      </span>
    </div>
    <div class="dli-table__grid">
      <div class="dli-table__row">
        <span class="dli-table__label">Estimated Board Voltage</span>
        <span class="dli-table__value"
          >{{
            preview.boardElectricalEstimate.boardVoltageV.toFixed(2)
          }}
          V</span
        >
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">Estimated Board Current</span>
        <span class="dli-table__value"
          >{{
            preview.boardElectricalEstimate.boardCurrentA.toFixed(2)
          }}
          A</span
        >
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">Estimated Board Power</span>
        <span class="dli-table__value"
          >{{ preview.boardElectricalEstimate.inputPowerW.toFixed(2) }} W</span
        >
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">Wiring</span>
        <span class="dli-table__value">
          {{ preview.boardElectricalEstimate.seriesCount }}S /
          {{ preview.boardElectricalEstimate.parallelCount }}P
        </span>
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">PAR / total</span>
        <span class="dli-table__value">{{
          preview.spectralStats.parRatio.toFixed(3)
        }}</span>
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">PBAR / total</span>
        <span class="dli-table__value">{{
          preview.spectralStats.pbarRatio.toFixed(3)
        }}</span>
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">McCree / total</span>
        <span class="dli-table__value">{{
          preview.spectralStats.mccreeRatio.toFixed(3)
        }}</span>
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">DIN / total</span>
        <span class="dli-table__value">{{
          preview.spectralStats.dinRatio.toFixed(3)
        }}</span>
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">CCT Method</span>
        <span class="dli-table__value">{{ preview.cct?.method ?? "n/a" }}</span>
      </div>
      <div class="dli-table__row">
        <span class="dli-table__label">CCT Confidence</span>
        <span class="dli-table__value">{{
          preview.cct?.confidence ?? "n/a"
        }}</span>
      </div>
    </div>
    <p v-if="preview.cct?.warningCode" class="note" style="margin: 8px 0 0">
      CCT warning: {{ preview.cct.warningCode }}
    </p>
  </div>
</template>
