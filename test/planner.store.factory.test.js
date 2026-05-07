import test from "node:test";
import assert from "node:assert/strict";
import { nextTick } from "vue";
import { createPlannerStore } from "../src/stores/plannerStore";

function createMemoryStorageAdapter(options = {}) {
  let boards = Array.isArray(options.boards) ? [...options.boards] : [];
  const warnings = Array.isArray(options.warnings) ? options.warnings : [];

  return {
    loadSavedBoards() {
      return boards;
    },
    loadSavedBoardsWithReport() {
      return { boards, warnings, errors: [] };
    },
    saveBoardCollection(_storageKey, nextBoards) {
      boards = nextBoards;
    },
    saveBoardCollectionWithReport(_storageKey, nextBoards) {
      boards = nextBoards;
      return { ok: true, warnings: [], errors: [] };
    },
  };
}

function createStore(storageKey, options = {}) {
  return createPlannerStore({
    storageKey,
    storageAdapter: createMemoryStorageAdapter(options),
    dependencies: {
      idGenerator: () => `${storageKey}-instance`,
    },
  });
}

function createCustomBoard() {
  return {
    id: "custom-store-board",
    name: "Custom Store Board",
    ledType: "lm301h_cri80_5000k",
    widthMm: 300,
    depthMm: 200,
    ledCount: 12,
    columns: 4,
    rows: 3,
    spacingXMm: 30,
    spacingYMm: 30,
    voltageV: 5.4,
    currentA: 0.78,
    temperatureC: 25,
    seriesCount: 2,
    parallelCount: 6,
    distanceCm: 30,
    roomWidthCm: 120,
    roomDepthCm: 120,
    photoperiodHours: 12,
    boardCount: 1,
    boardSpacingCm: 20,
    fixtureColumns: 1,
    fixtureRows: 1,
    fixtureSpacingXCm: 20,
    fixtureSpacingYCm: 20,
  };
}

test("planner store factory creates stores with independent board selection", async () => {
  const storeA = createStore("planner-store-a", {
    boards: [createCustomBoard()],
  });
  const storeB = createStore("planner-store-b");

  try {
    const defaultBoardId = storeB.state.selectedBoardId;
    const customBoard = storeA.state.boardOptions.find(
      (option) => option.id === "custom-store-board",
    );
    assert.ok(customBoard);

    storeA.selectBoardDefinition(customBoard.id);
    await nextTick();

    assert.equal(storeA.state.selectedBoardId, customBoard.id);
    assert.equal(storeA.state.form.id, customBoard.id);
    assert.equal(storeB.state.selectedBoardId, defaultBoardId);
    assert.equal(storeB.state.form.id, defaultBoardId);
  } finally {
    storeA.dispose();
    storeB.dispose();
  }
});

test("planner store factory does not share board instances between stores", () => {
  const storeA = createStore("planner-store-instance-a");
  const storeB = createStore("planner-store-instance-b");

  try {
    const addResult = storeA.addBoardInstance();

    assert.equal(addResult.ok, true);
    assert.equal(storeA.state.boardInstances.length, 1);
    assert.equal(
      storeA.state.boardInstances[0].id,
      "planner-store-instance-a-instance",
    );
    assert.equal(storeB.state.boardInstances.length, 0);
    assert.equal(storeB.state.selectedBoardInstanceId, "");
  } finally {
    storeA.dispose();
    storeB.dispose();
  }
});

test("planner store factory keeps migration warnings per instance", () => {
  const storeA = createStore("planner-store-warning-a", {
    warnings: [
      {
        code: "BOARD_STORAGE_READ_FAILED",
        message: "Store A warning",
        severity: "warning",
        field: "boards",
      },
    ],
  });
  const storeB = createStore("planner-store-warning-b", {
    warnings: [
      {
        code: "BOARD_DOCUMENT_MIGRATED",
        message: "Store B warning",
        severity: "warning",
        field: "boards",
      },
    ],
  });

  try {
    assert.deepEqual(
      storeA.state.boardMigrationWarnings.map((warning) => warning.code),
      ["BOARD_STORAGE_READ_FAILED"],
    );
    assert.deepEqual(
      storeB.state.boardMigrationWarnings.map((warning) => warning.code),
      ["BOARD_DOCUMENT_MIGRATED"],
    );
  } finally {
    storeA.dispose();
    storeB.dispose();
  }
});
