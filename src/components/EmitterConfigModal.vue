<script setup lang="ts">
import { computed } from "vue";
import NumericField from "@/components/controls/NumericField.vue";
import SegmentedControl from "@/components/controls/SegmentedControl.vue";
import PlannerModalFrame from "@/components/modals/PlannerModalFrame.vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();
const draft = computed(() => store.emitterConfigModal.draft);
const driveModeOptions = [
  { value: "constantVoltage", label: "Constant Voltage" },
  { value: "constantCurrent", label: "Constant Current" },
];

function selectValueFromEvent(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : "";
}
</script>

<template>
  <PlannerModalFrame
    v-if="store.emitterConfigModal.isOpen && draft"
    :open="store.emitterConfigModal.isOpen"
    title="Emitter Config"
    label-id="emitter-config-title"
    @close="store.closeEmitterConfig()"
  >
    <label class="field">
      <span>LED Type</span>
      <select
        :value="draft.ledType"
        @change="
          store.updateEmitterConfigDraft(
            'ledType',
            selectValueFromEvent($event),
          )
        "
      >
        <option
          v-for="ledType in store.ledTypes"
          :key="ledType.id"
          :value="ledType.id"
        >
          {{ ledType.name }}
        </option>
      </select>
    </label>

    <SegmentedControl
      label="Driver Mode"
      aria-label="Driver Mode"
      group-class="pill-row"
      button-class="pill"
      :options="driveModeOptions"
      :model-value="draft.driveMode"
      @change="store.setEmitterConfigMode"
    />

    <div class="field-grid three-columns">
      <NumericField
        label="LED Voltage (V)"
        :model-value="draft.voltageV"
        min="0"
        step="0.1"
        @input-value="
          store.updateEmitterConfigDraft('voltageV', Number($event))
        "
      />
      <NumericField
        label="LED Current (A)"
        :model-value="draft.currentA"
        min="0"
        step="0.01"
        @input-value="
          store.updateEmitterConfigDraft('currentA', Number($event))
        "
      />
      <NumericField
        label="Board Temp (°C)"
        :model-value="draft.temperatureC"
        min="-20"
        step="0.5"
        @input-value="
          store.updateEmitterConfigDraft('temperatureC', Number($event))
        "
      />
    </div>

    <p class="note">
      Wiring is currently defined at board level and shared by all emitters.
    </p>

    <div class="modal-actions">
      <button
        class="ghost-button"
        type="button"
        @click="store.closeEmitterConfig()"
      >
        Cancel
      </button>
      <button
        class="ghost-button"
        type="button"
        @click="store.saveEmitterConfig()"
      >
        Save
      </button>
    </div>
  </PlannerModalFrame>
</template>
