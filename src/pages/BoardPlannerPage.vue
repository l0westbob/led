<script setup>
import { computed } from "vue";
import { usePlannerContext } from "@/stores/plannerContext";

const store = usePlannerContext();

const selectedBoard = computed(() =>
  store.boardOptions.find((board) => board.id === store.state.selectedBoardId),
);
const isPresetSelection = computed(() => Boolean(selectedBoard.value?.isPreset));
</script>

<template>
  <details class="card collapsible-card" open>
    <summary class="section-header collapsible-summary">
      <h2>Board Planner</h2>
    </summary>

    <div class="section-header">
      <div class="pill-row">
        <button class="ghost-button" type="button" @click="store.createBoardDefinition()">
          Save New
        </button>
        <button class="ghost-button" type="button" @click="store.updateBoardDefinition()">
          {{ isPresetSelection ? "Duplicate as Custom" : "Save Changes" }}
        </button>
        <button
          class="ghost-button"
          type="button"
          :disabled="isPresetSelection"
          @click="store.deleteBoardDefinition()"
        >
          Delete
        </button>
      </div>
    </div>

    <label class="field">
      <span>Board Library Entry</span>
      <select
        :value="store.state.selectedBoardId"
        @change="store.selectBoardDefinition($event.target.value)"
      >
        <option
          v-for="boardOption in store.boardOptions"
          :key="boardOption.id"
          :value="boardOption.id"
        >
          {{ boardOption.name }}{{ boardOption.isPreset ? " (Preset)" : "" }}
        </option>
      </select>
    </label>

    <div class="field-grid one-column">
      <label class="field">
        <span>Board Name</span>
        <input v-model="store.form.name" type="text" placeholder="My Board Name" />
      </label>
    </div>

    <div v-if="store.boardEditorIssues.length" class="issues-list">
      <p
        v-for="issue in store.boardEditorIssues"
        :key="issue.code + issue.message"
        class="note issue-line"
      >
        {{ issue.message }}
      </p>
    </div>
  </details>
</template>

<style scoped>
.one-column {
  grid-template-columns: minmax(0, 1fr);
}

.issues-list {
  margin-top: 10px;
}

.issue-line {
  color: rgba(255, 190, 140, 0.95);
  margin: 4px 0;
}

</style>
