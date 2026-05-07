<script setup lang="ts">
import {
  formatLedDisplayName,
  resolveBestBinLabel,
} from "@/catalog/ledCatalog";
import SegmentedControl from "@/components/controls/SegmentedControl.vue";
import { useLedLabStore } from "@/stores/ledLabStore";

const store = useLedLabStore();
const snapshot = store.snapshot;
const spectrumModeOptions = [
  { value: "relative", label: "Relative" },
  { value: "photon", label: "Photon" },
];
</script>

<template>
  <div class="comparison-head">
    <span class="note"
      >Compared LEDs: {{ store.state.comparedLeds.length }} / 5</span
    >
    <div class="compare-actions">
      <button
        class="pill"
        type="button"
        :disabled="store.state.comparedLeds.length >= 5"
        @click="store.addComparedLed()"
      >
        + Add LED
      </button>
    </div>
  </div>

  <div class="field-grid two-columns">
    <div
      v-for="(row, index) in store.state.comparedLeds"
      :key="`led-row-${index}`"
      class="field"
    >
      <span>LED {{ index + 1 }}</span>
      <div class="led-row">
        <select v-model="row.id" :aria-label="`LED ${index + 1}`">
          <option value="">None</option>
          <option
            v-for="led in snapshot.ledOptions"
            :key="`${index}-${led.id}`"
            :value="led.id"
          >
            {{ formatLedDisplayName(led) }}
          </option>
        </select>
        <input
          v-model="row.color"
          type="color"
          :aria-label="`LED ${index + 1} color`"
        />
        <button
          class="pill pill-remove"
          type="button"
          :disabled="store.state.comparedLeds.length <= 1"
          :aria-label="`Remove LED ${index + 1}`"
          @click="store.removeComparedLedAt(index)"
        >
          -
        </button>
      </div>
      <span class="note led-bin-note">
        Best bin:
        {{
          row.id
            ? resolveBestBinLabel(
                snapshot.ledOptions.find((led) => led.id === row.id),
              )
            : "n/a"
        }}
      </span>
    </div>
  </div>

  <div class="field-grid two-columns led-mode-row">
    <SegmentedControl
      label="SPD Mode"
      aria-label="LED Lab SPD mode"
      :options="spectrumModeOptions"
      :model-value="store.state.mode"
      @change="store.setMode"
    />
    <div />
  </div>
</template>

<style scoped>
.comparison-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0;
}

.compare-actions {
  display: flex;
  gap: 8px;
}

.led-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.led-row input[type="color"] {
  width: 34px;
  height: 24px;
  border: 0;
  padding: 0;
  background: transparent;
}

.pill-remove {
  min-width: 32px;
  padding-inline: 0;
  text-align: center;
}

.led-bin-note {
  display: block;
  margin-top: 6px;
  opacity: 0.9;
}

.led-mode-row {
  margin-top: 10px;
}
</style>
