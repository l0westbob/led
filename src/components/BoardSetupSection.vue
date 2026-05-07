<script setup>
import { usePlannerContext } from "@/stores/plannerContext";

/**
 * Board setup inputs stay together because they shape the domain object
 * more directly than the later visualization settings.
 */
const store = usePlannerContext();
</script>

<template>
  <details class="card collapsible-card board-setup-card" open>
    <summary class="section-header collapsible-summary">
      <h2>Board Setup</h2>
      <span class="mono">Placed: {{ store.boardInstances.length }}</span>
    </summary>

    <div class="board-picker-row">
      <label class="field board-picker-field">
        <span>Preset Board</span>
        <select
          :value="store.state.selectedBoardId"
          @change="store.selectBoard($event.target.value)"
        >
          <option
            v-for="boardOption in store.boardOptions"
            :key="boardOption.id"
            :value="boardOption.id"
          >
            {{ boardOption.name }}
          </option>
        </select>
      </label>
      <button class="ghost-button board-add-button" type="button" @click="store.addBoardInstance()">
        Add Board
      </button>
    </div>

    <div class="section-header">
      <h3>Placed Boards</h3>
    </div>
    <div class="instance-list">
      <div
        v-for="instance in store.boardInstances"
        :key="instance.id"
        class="instance-row"
        :class="{ selected: store.selectedBoardInstanceId === instance.id }"
        @click="store.selectBoardInstance(instance.id)"
      >
        <span class="instance-title">{{ instance.name }}</span>
        <span class="instance-pos">
          {{ instance.xCm.toFixed(1) }} / {{ instance.yCm.toFixed(1) }} cm ·
          {{ Number(instance.rotationDeg || 0) }}°
        </span>
        <div class="instance-actions">
          <button
            class="ghost-button"
            type="button"
            @click.stop="store.rotateBoardInstanceLeft(instance.id)"
          >
            ↺ 90°
          </button>
          <button
            class="ghost-button"
            type="button"
            @click.stop="store.rotateBoardInstanceRight(instance.id)"
          >
            ↻ 90°
          </button>
          <button
            class="ghost-button"
            type="button"
            @click.stop="store.openBoardConfig(instance.id)"
          >
            Config
          </button>
          <button
            class="ghost-button"
            type="button"
            @click.stop="store.removeBoardInstance(instance.id)"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </details>
</template>

<style scoped>
.board-setup-card {
  width: 100%;
}

.board-picker-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
  margin-top: 10px;
}

.board-picker-field {
  margin: 0;
}

.board-add-button {
  white-space: nowrap;
}

.instance-list {
  display: grid;
  gap: 8px;
}

.instance-row {
  border: 1px solid rgba(147, 197, 253, 0.18);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  cursor: pointer;
}

.instance-row.selected {
  border-color: rgba(217, 255, 112, 0.72);
}

.instance-title {
  font-weight: 600;
}

.instance-pos {
  color: var(--muted);
  font-size: 0.86rem;
}

.instance-actions {
  display: flex;
  gap: 8px;
}
</style>
