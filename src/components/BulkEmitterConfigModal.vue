<script setup lang="ts">
import { computed } from "vue";
import NumericField from "@/components/controls/NumericField.vue";
import SegmentedControl from "@/components/controls/SegmentedControl.vue";
import PlannerModalFrame from "@/components/modals/PlannerModalFrame.vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();
const draft = computed(() => store.bulkEmitterConfigModal.draft);
const driveModeOptions = [
  { value: "constantVoltage", label: "Constant Voltage" },
  { value: "constantCurrent", label: "Constant Current" },
];

function selectValueFromEvent(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : "";
}

function checkedFromEvent(event: Event): boolean {
  return event.target instanceof HTMLInputElement
    ? event.target.checked
    : false;
}
</script>

<template>
  <PlannerModalFrame
    v-if="store.bulkEmitterConfigModal.isOpen && draft"
    :open="store.bulkEmitterConfigModal.isOpen"
    title="Bulk Emitter Config"
    label-id="bulk-emitter-config-title"
    size="wide"
    @close="store.closeBulkEmitterConfig()"
  >
    <template #header-meta>
      <span class="mono"
        >{{ store.selectedBoardPlannerEmitterIds.length }} selected</span
      >
    </template>
    <div class="field-grid two-columns">
      <label class="field">
        <span>LED Type</span>
        <select
          :value="draft.ledType"
          @change="
            store.updateBulkEmitterConfigDraft(
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
      <label class="field checkbox-field">
        <input
          :checked="draft.applyLedType"
          type="checkbox"
          @change="
            store.updateBulkEmitterConfigDraft(
              'applyLedType',
              checkedFromEvent($event),
            )
          "
        />
        <span>Apply LED Type</span>
      </label>
    </div>

    <SegmentedControl
      label="Driver Mode"
      aria-label="Driver Mode"
      group-class="pill-row"
      button-class="pill"
      :options="driveModeOptions"
      :model-value="draft.driveMode"
      @change="store.setBulkEmitterConfigMode"
    />

    <div class="field-grid three-columns">
      <NumericField
        label="LED Voltage (V)"
        :model-value="draft.voltageV"
        min="0"
        step="0.01"
        @input-value="
          store.updateBulkEmitterConfigDraft('voltageV', Number($event))
        "
      >
        <label class="checkbox-inline">
          <input
            :checked="draft.applyVoltageV"
            type="checkbox"
            @change="
              store.updateBulkEmitterConfigDraft(
                'applyVoltageV',
                checkedFromEvent($event),
              )
            "
          />
          <span>Apply</span>
        </label>
      </NumericField>
      <NumericField
        label="LED Current (A)"
        :model-value="draft.currentA"
        min="0"
        step="0.01"
        @input-value="
          store.updateBulkEmitterConfigDraft('currentA', Number($event))
        "
      >
        <label class="checkbox-inline">
          <input
            :checked="draft.applyCurrentA"
            type="checkbox"
            @change="
              store.updateBulkEmitterConfigDraft(
                'applyCurrentA',
                checkedFromEvent($event),
              )
            "
          />
          <span>Apply</span>
        </label>
      </NumericField>
      <NumericField
        label="Board Temp (°C)"
        :model-value="draft.temperatureC"
        min="-20"
        step="0.5"
        @input-value="
          store.updateBulkEmitterConfigDraft('temperatureC', Number($event))
        "
      >
        <label class="checkbox-inline">
          <input
            :checked="draft.applyTemperatureC"
            type="checkbox"
            @change="
              store.updateBulkEmitterConfigDraft(
                'applyTemperatureC',
                checkedFromEvent($event),
              )
            "
          />
          <span>Apply</span>
        </label>
      </NumericField>
    </div>

    <label class="field checkbox-field">
      <input
        :checked="draft.applyDriveMode"
        type="checkbox"
        @change="
          store.updateBulkEmitterConfigDraft(
            'applyDriveMode',
            checkedFromEvent($event),
          )
        "
      />
      <span>Apply Drive Mode</span>
    </label>

    <div class="modal-actions">
      <button
        class="ghost-button"
        type="button"
        @click="store.closeBulkEmitterConfig()"
      >
        Cancel
      </button>
      <button
        class="ghost-button"
        type="button"
        @click="store.saveBulkEmitterConfig()"
      >
        Apply to Selection
      </button>
    </div>
  </PlannerModalFrame>
</template>

<style scoped>
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
</style>
