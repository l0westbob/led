<script setup lang="ts">
import { computed } from "vue";
import { usePlannerContext } from "@/stores/plannerContext";
import {
  useBoardLibraryTransfer,
  valueFromEvent,
} from "@/pages/boardPlanner/useBoardLibraryTransfer";

const store = usePlannerContext();

const selectedBoard = computed(() =>
  store.boardOptions.find((board) => board.id === store.state.selectedBoardId),
);
const isPresetSelection = computed(() =>
  Boolean(selectedBoard.value?.isPreset),
);
const {
  importMode,
  importJson,
  importExportMessages,
  handleExportBoardLibrary,
  handleImportBoardLibrary,
} = useBoardLibraryTransfer(store);
</script>

<template>
  <details class="card collapsible-card" open>
    <summary class="section-header collapsible-summary">
      <h2>Board Planner</h2>
    </summary>

    <div class="section-header">
      <div class="pill-row">
        <button
          class="ghost-button"
          type="button"
          @click="store.createBoardDefinition()"
        >
          Save New
        </button>
        <button
          class="ghost-button"
          type="button"
          @click="store.updateBoardDefinition()"
        >
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
        @change="store.selectBoardDefinition(valueFromEvent($event))"
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
        <input
          :value="store.form.name"
          type="text"
          placeholder="My Board Name"
          @input="store.applyUserEdit('name', valueFromEvent($event))"
        />
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

    <div
      v-if="store.boardMigrationWarnings.length"
      class="issues-list migration-list"
    >
      <p
        v-for="warning in store.boardMigrationWarnings"
        :key="warning.code + warning.message"
        class="note migration-line"
      >
        {{ warning.message }}
      </p>
    </div>

    <details class="library-transfer">
      <summary class="mono">Library Import / Export</summary>
      <div class="field-grid two-columns">
        <button
          class="ghost-button"
          type="button"
          @click="handleExportBoardLibrary()"
        >
          Export Custom Boards
        </button>
        <label class="field">
          <span>Import Mode</span>
          <select v-model="importMode">
            <option value="merge">Merge (overwrite duplicates)</option>
            <option value="mergeSkipDuplicates">Merge (skip duplicates)</option>
            <option value="replace">Replace</option>
          </select>
        </label>
      </div>
      <label class="field">
        <span>Import JSON</span>
        <textarea
          v-model="importJson"
          rows="6"
          class="import-json"
          placeholder="Paste exported board library JSON here"
        />
      </label>
      <button
        class="ghost-button"
        type="button"
        @click="handleImportBoardLibrary()"
      >
        Import Library
      </button>

      <div
        v-if="importExportMessages.length"
        class="issues-list import-export-list"
      >
        <p
          v-for="message in importExportMessages"
          :key="message.code + message.message"
          class="note"
          :class="{
            'issue-line': message.severity === 'error',
            'migration-line': message.severity !== 'error',
          }"
        >
          {{ message.message }}
        </p>
      </div>
    </details>
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
  color: var(--warning-text);
  margin: 4px 0;
}

.migration-list {
  margin-top: 8px;
}

.migration-line {
  color: var(--info-text);
  margin: 4px 0;
}

.library-transfer {
  margin-top: 12px;
  border: 1px solid var(--line-muted-panel);
  border-radius: 10px;
  padding: 10px;
  background: var(--panel-bg-subtle);
}

.library-transfer summary {
  cursor: pointer;
  margin-bottom: 10px;
}

.import-json {
  width: 100%;
  min-height: 110px;
  resize: vertical;
  background: var(--control-bg);
  border: 1px solid var(--line-control);
  color: var(--text-soft);
  border-radius: 10px;
  padding: 8px 10px;
}

.import-export-list {
  margin-top: 10px;
}
</style>
