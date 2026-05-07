import test from "node:test";
import assert from "node:assert/strict";
import {
  createBoardDefinition,
  deleteBoardDefinition,
  duplicateBoardDefinition,
  listBoardDefinitions,
  updateBoardDefinition,
} from "../src/application/boardLibrary/boardLibraryService";

function createMemoryStorageAdapter() {
  /** @type {Array<object>} */
  let values = [];
  return {
    loadSavedBoards() {
      return values;
    },
    saveBoardCollection(_storageKey, boards) {
      values = boards;
    },
    peekSavedBoards() {
      return values;
    },
  };
}

function createFailingSaveStorageAdapter() {
  return {
    loadSavedBoards() {
      return [];
    },
    saveBoardCollection() {
      throw new Error("quota exceeded");
    },
  };
}

function buildDraft() {
  return {
    id: "",
    name: "My Custom Board",
    ledType: "lm301h_cri80_5000k",
    emitters: [],
    widthMm: 440,
    depthMm: 285,
    ledCount: 308,
    columns: 22,
    rows: 14,
    spacingXMm: 20,
    spacingYMm: 18,
    voltageV: 38.6,
    currentA: 2,
    temperatureC: 50,
    seriesCount: 14,
    parallelCount: 22,
    distanceCm: 35,
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

test("board library create/update/delete flow works for custom entries", () => {
  const storageAdapter = createMemoryStorageAdapter();
  const storageKey = "test.boards";

  const createResult = createBoardDefinition({
    storageKey,
    storageAdapter,
    draft: buildDraft(),
  });
  assert.equal(createResult.ok, true);
  assert.ok(createResult.data?.id);
  assert.equal(createResult.contractVersion, "1.1");
  assert.equal(createResult.warnings.length, 0);
  assert.equal(createResult.errors.length, 0);

  const persistedCollection = storageAdapter.peekSavedBoards();
  assert.ok(Array.isArray(persistedCollection));
  assert.equal(persistedCollection.length, 1);
  assert.equal(persistedCollection[0]?.documentType, "BoardDefinitionDocument");
  assert.equal(persistedCollection[0]?.boardSchemaVersion, "1.1");
  assert.equal(persistedCollection[0]?.simulationContextVersion, "1.1");

  const libraryAfterCreate = listBoardDefinitions({
    storageKey,
    storageAdapter,
  });
  const createdBoard = libraryAfterCreate.find(
    (entry) => entry.id === createResult.data.id,
  );
  assert.ok(createdBoard);
  assert.equal(createdBoard.isPreset, false);

  const updateResult = updateBoardDefinition({
    storageKey,
    storageAdapter,
    boardId: createResult.data.id,
    draft: { ...buildDraft(), name: "Updated Name" },
  });
  assert.equal(updateResult.ok, true);
  assert.equal(updateResult.data?.name, "Updated Name");
  assert.equal(updateResult.contractVersion, "1.1");

  const duplicateResult = duplicateBoardDefinition({
    storageKey,
    storageAdapter,
    draft: { ...buildDraft(), name: "Updated Name" },
  });
  assert.equal(duplicateResult.ok, true);
  assert.notEqual(duplicateResult.data?.id, updateResult.data?.id);
  assert.equal(duplicateResult.contractVersion, "1.1");

  const deleteResult = deleteBoardDefinition({
    storageKey,
    storageAdapter,
    boardId: createResult.data.id,
  });
  assert.equal(deleteResult.ok, true);
  assert.equal(deleteResult.contractVersion, "1.1");
});

test("board library create reports storage write failures", () => {
  const createResult = createBoardDefinition({
    storageKey: "test.failing.boards",
    storageAdapter: createFailingSaveStorageAdapter(),
    draft: buildDraft(),
  });

  assert.equal(createResult.ok, false);
  assert.equal(createResult.errors[0]?.code, "BOARD_STORAGE_WRITE_FAILED");
  assert.match(createResult.errors[0]?.message, /quota exceeded/);
});
