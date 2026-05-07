<script setup lang="ts">
import NumericField from "@/components/controls/NumericField.vue";
import SegmentedControl from "@/components/controls/SegmentedControl.vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();
const driveModeOptions = [
  { value: "constantVoltage", label: "Constant Voltage" },
  { value: "constantCurrent", label: "Constant Current" },
];

function selectValueFromEvent(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : "";
}
</script>

<template>
  <div class="preview-controls-grid">
    <div class="control-group">
      <h3 class="control-group-title">Default LED Drive</h3>
      <div class="mini-drive-row">
        <label class="mini-drive-field led-select-field">
          <span>Default LED</span>
          <select
            :value="store.form.ledType"
            class="mini-drive-input led-select-input"
            @change="
              store.applyUserEdit('ledType', selectValueFromEvent($event))
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
          label="Mode"
          aria-label="Default drive mode"
          field-class="mini-drive-field"
          group-class="mode-button-group"
          button-class="pill-button mode-pill"
          :options="driveModeOptions"
          :model-value="store.boardPlannerDefaultEmitterDrive.driveMode"
          @change="store.setBoardPlannerDefaultEmitterDriveMode"
        />
        <NumericField
          label="V"
          :model-value="store.boardPlannerDefaultEmitterDrive.voltageV"
          min="0"
          step="0.01"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="
            store.updateBoardPlannerDefaultEmitterDrive('voltageV', $event)
          "
        />
        <NumericField
          label="A"
          :model-value="store.boardPlannerDefaultEmitterDrive.currentA"
          min="0"
          step="0.01"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="
            store.updateBoardPlannerDefaultEmitterDrive('currentA', $event)
          "
        />
        <NumericField
          label="°C"
          :model-value="store.boardPlannerDefaultEmitterDrive.temperatureC"
          min="-20"
          step="0.5"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="
            store.updateBoardPlannerDefaultEmitterDrive('temperatureC', $event)
          "
        />
      </div>
    </div>
    <div class="control-group">
      <h3 class="control-group-title">Board Geometry</h3>
      <div class="mini-drive-row">
        <NumericField
          label="Width (mm)"
          :model-value="store.form.widthMm"
          min="10"
          step="1"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="store.applyUserEdit('widthMm', $event)"
        />
        <NumericField
          label="Depth (mm)"
          :model-value="store.form.depthMm"
          min="10"
          step="1"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="store.applyUserEdit('depthMm', $event)"
        />
        <NumericField
          label="LED Count"
          :model-value="store.form.ledCount"
          min="1"
          step="1"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="store.applyUserEdit('ledCount', $event)"
        />
        <NumericField
          label="Columns"
          :model-value="store.form.columns"
          min="1"
          step="1"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="store.applyUserEdit('columns', $event)"
        />
        <NumericField
          label="Rows"
          :model-value="store.form.rows"
          min="1"
          step="1"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="store.applyUserEdit('rows', $event)"
        />
        <NumericField
          label="Spacing X (mm)"
          :model-value="store.form.spacingXMm"
          min="0.5"
          step="0.5"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="store.applyUserEdit('spacingXMm', $event)"
        />
        <NumericField
          label="Spacing Y (mm)"
          :model-value="store.form.spacingYMm"
          min="0.5"
          step="0.5"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          @input-value="store.applyUserEdit('spacingYMm', $event)"
        />
      </div>
    </div>
    <div class="control-group">
      <h3 class="control-group-title">Wiring</h3>
      <div class="mini-drive-row">
        <NumericField
          label="Parallel Strings"
          :model-value="store.form.parallelCount"
          min="1"
          step="1"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          title="Parallel Strings"
          @input-value="store.applyUserEdit('parallelCount', $event)"
        />
        <NumericField
          label="Series per String"
          :model-value="store.form.seriesCount"
          min="1"
          step="1"
          field-class="mini-drive-field"
          input-class="mini-drive-input"
          title="Series LEDs per String"
          @input-value="store.applyUserEdit('seriesCount', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mini-drive-row {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.mini-drive-field) {
  display: inline-flex;
  gap: 6px;
  color: var(--muted);
  font-size: 0.78rem;
  flex-direction: column;
  align-items: flex-start;
}

:deep(.mini-drive-input) {
  width: 88px;
  background: var(--control-bg);
  border: 1px solid var(--line-control);
  color: var(--text-soft);
  border-radius: 10px;
  padding: 7px 9px;
}

.led-select-field {
  margin-left: 6px;
}

.led-select-input {
  width: 280px;
}

:deep(.mode-pill) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 12px;
  line-height: 1;
  vertical-align: middle;
  border: 1px solid var(--line-strong);
  background: var(--control-bg-soft);
  color: var(--text-soft);
}

:deep(.mode-pill.active) {
  border-color: var(--selected-border);
  background: var(--selected-bg);
  color: var(--selected-text);
  box-shadow: 0 0 0 1px var(--selected-shadow) inset;
}

:deep(.mode-button-group) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.preview-controls-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.control-group {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  background: rgba(7, 13, 24, 0.65);
}

.control-group-title {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--text-soft);
}

@media (max-width: 1400px) {
  .preview-controls-grid {
    grid-template-columns: 1fr;
  }
}
</style>
