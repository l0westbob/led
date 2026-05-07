<script setup>
import { computed } from "vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();
const draft = computed(() => store.boardConfigModal.draft);
</script>

<template>
  <div v-if="store.boardConfigModal.isOpen && draft" class="modal-backdrop">
    <div class="modal-card">
      <div class="section-header">
        <h2>Board Drive Config</h2>
      </div>

      <label class="field">
        <span>Driver Mode</span>
        <div class="pill-row">
          <button
            class="pill"
            :class="{ active: draft.driveMode === 'constantVoltage' }"
            type="button"
            @click="store.setBoardConfigMode('constantVoltage')"
          >
            Constant Voltage
          </button>
          <button
            class="pill"
            :class="{ active: draft.driveMode === 'constantCurrent' }"
            type="button"
            @click="store.setBoardConfigMode('constantCurrent')"
          >
            Constant Current
          </button>
        </div>
      </label>

      <div class="field-grid three-columns">
        <label class="field">
          <span>Voltage (V)</span>
          <input
            :value="draft.voltageV"
            type="number"
            min="0"
            step="0.1"
            @input="store.updateBoardConfigDraft('voltageV', Number($event.target.value))"
          />
        </label>
        <label class="field">
          <span>Current (A)</span>
          <input
            :value="draft.currentA"
            type="number"
            min="0"
            step="0.01"
            @input="store.updateBoardConfigDraft('currentA', Number($event.target.value))"
          />
        </label>
        <label class="field">
          <span>Board Temp (°C)</span>
          <input
            :value="draft.temperatureC"
            type="number"
            min="-20"
            step="0.5"
            @input="store.updateBoardConfigDraft('temperatureC', Number($event.target.value))"
          />
        </label>
      </div>

      <div class="field-grid two-columns">
        <label class="field">
          <span>Series LEDs per String</span>
          <input
            :value="draft.seriesCount"
            type="number"
            min="0"
            step="1"
            @input="store.updateBoardConfigDraft('seriesCount', Number($event.target.value))"
          />
        </label>
        <label class="field">
          <span>Parallel Strings</span>
          <input
            :value="draft.parallelCount"
            type="number"
            min="0"
            step="1"
            @input="store.updateBoardConfigDraft('parallelCount', Number($event.target.value))"
          />
        </label>
      </div>

      <div class="modal-actions">
        <button class="ghost-button" type="button" @click="store.closeBoardConfig()">
          Cancel
        </button>
        <button class="ghost-button" type="button" @click="store.saveBoardConfig()">
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(5, 10, 18, 0.56);
  backdrop-filter: blur(8px);
  z-index: 1200;
  padding: 20px;
}

.modal-card {
  width: min(760px, 100%);
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(9, 16, 28, 0.96);
  padding: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
