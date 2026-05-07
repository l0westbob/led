<script setup lang="ts">
import { computed } from "vue";
import NumericField from "@/components/controls/NumericField.vue";
import SegmentedControl from "@/components/controls/SegmentedControl.vue";
import PlannerModalFrame from "@/components/modals/PlannerModalFrame.vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();
const draft = computed(() => store.boardConfigModal.draft);
const driveModeOptions = [
  { value: "constantVoltage", label: "Constant Voltage" },
  { value: "constantCurrent", label: "Constant Current" },
];
</script>

<template>
  <PlannerModalFrame
    v-if="store.boardConfigModal.isOpen && draft"
    :open="store.boardConfigModal.isOpen"
    title="Board Drive Config"
    label-id="board-drive-config-title"
    @close="store.closeBoardConfig()"
  >
    <SegmentedControl
      label="Driver Mode"
      aria-label="Driver Mode"
      group-class="pill-row"
      button-class="pill"
      :options="driveModeOptions"
      :model-value="draft.driveMode"
      @change="store.setBoardConfigMode"
    />

    <div class="field-grid three-columns">
      <NumericField
        label="Voltage (V)"
        :model-value="draft.voltageV"
        min="0"
        step="0.1"
        @input-value="store.updateBoardConfigDraft('voltageV', Number($event))"
      />
      <NumericField
        label="Current (A)"
        :model-value="draft.currentA"
        min="0"
        step="0.01"
        @input-value="store.updateBoardConfigDraft('currentA', Number($event))"
      />
      <NumericField
        label="Board Temp (°C)"
        :model-value="draft.temperatureC"
        min="-20"
        step="0.5"
        @input-value="
          store.updateBoardConfigDraft('temperatureC', Number($event))
        "
      />
    </div>

    <div class="field-grid two-columns">
      <NumericField
        label="Series LEDs per String"
        :model-value="draft.seriesCount"
        min="0"
        step="1"
        @input-value="
          store.updateBoardConfigDraft('seriesCount', Number($event))
        "
      />
      <NumericField
        label="Parallel Strings"
        :model-value="draft.parallelCount"
        min="0"
        step="1"
        @input-value="
          store.updateBoardConfigDraft('parallelCount', Number($event))
        "
      />
    </div>

    <div class="modal-actions">
      <button
        class="ghost-button"
        type="button"
        @click="store.closeBoardConfig()"
      >
        Cancel
      </button>
      <button
        class="ghost-button"
        type="button"
        @click="store.saveBoardConfig()"
      >
        Save
      </button>
    </div>
  </PlannerModalFrame>
</template>
