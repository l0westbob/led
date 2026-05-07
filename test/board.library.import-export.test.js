import test from "node:test";
import assert from "node:assert/strict";
import {
  exportBoardLibrary,
  importBoardLibrary,
} from "../src/application/boardLibrary/boardLibraryImportExport";
import { createBoardDefinition } from "../src/application/boardLibrary/boardLibraryService";

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

function buildDraft(name, overrides = {}) {
  return {
    id: "",
    name,
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
    ...overrides,
  };
}

test("board library export/import round-trip preserves custom board count", () => {
  const storageKey = "test.boards";
  const sourceAdapter = createMemoryStorageAdapter();
  const targetAdapter = createMemoryStorageAdapter();
  createBoardDefinition({
    storageKey,
    storageAdapter: sourceAdapter,
    draft: buildDraft("Export Board"),
  });

  const exported = exportBoardLibrary({
    storageKey,
    storageAdapter: sourceAdapter,
  });
  assert.equal(exported.ok, true);
  assert.equal(exported.data.boardCount, 1);
  assert.equal(exported.data.schema, "BoardDefinitionDocumentCollection");
  assert.equal(exported.data.schemaVersion, "1.1");

  const imported = importBoardLibrary({
    storageKey,
    storageAdapter: targetAdapter,
    payload: exported.data,
    mode: "replace",
  });
  assert.equal(imported.ok, true);
  assert.equal(imported.data.storedCount, 1);
  assert.equal(imported.data.conflictPolicy, "replaceAll");
});

test("board library import rejects malformed boards before storage write", () => {
  const storageKey = "board-library-import-invalid";
  const storageAdapter = createMemoryStorageAdapter();

  const imported = importBoardLibrary({
    storageKey,
    storageAdapter,
    payload: {
      boards: [{ id: "bad-board" }],
    },
    mode: "replace",
  });

  assert.equal(imported.ok, false);
  assert.equal(storageAdapter.loadSavedBoards(storageKey).length, 0);
  assert.ok(
    imported.errors.some(
      (issue) => issue.code === "IMPORT_BOARD_ENTRY_UNSUPPORTED",
    ),
  );
});

test("board library import reports storage write failures", () => {
  const imported = importBoardLibrary({
    storageKey: "board-library-import-failing-save",
    storageAdapter: createFailingSaveStorageAdapter(),
    payload: {
      boards: [],
    },
    mode: "replace",
  });

  assert.equal(imported.ok, false);
  assert.equal(imported.errors[0]?.code, "BOARD_STORAGE_WRITE_FAILED");
  assert.match(imported.errors[0]?.message, /quota exceeded/);
});

test("board library import rejects future collection schema versions", () => {
  const imported = importBoardLibrary({
    storageKey: "board-library-import-future-version",
    storageAdapter: createMemoryStorageAdapter(),
    payload: {
      schema: "BoardDefinitionDocumentCollection",
      schemaVersion: "9.0",
      exportedAtIso: "2026-05-29T00:00:00.000Z",
      boardCount: 0,
      boards: [],
    },
    mode: "replace",
  });

  assert.equal(imported.ok, false);
  assert.equal(imported.errors[0]?.code, "IMPORT_SCHEMA_VERSION_UNSUPPORTED");
});

test("board library import rejects duplicate ids in collection payloads", () => {
  const duplicateBoard = exportBoardLibrary({
    storageKey: "board-library-duplicate-source",
    storageAdapter: createMemoryStorageAdapter(),
  }).data;
  const document = {
    documentType: "BoardDefinitionDocument",
    boardSchemaVersion: "1.1",
    simulationContextVersion: "1.1",
    definition: {
      id: "duplicate-board",
      name: "Duplicate Board",
      ledType: "lm301h_cri80_5000k",
      widthMm: 440,
      depthMm: 285,
      ledCount: 308,
      columns: 22,
      rows: 14,
      spacingXMm: 20,
      spacingYMm: 18,
      seriesCount: 14,
      parallelCount: 22,
    },
    simulationContext: {},
    defaultDriveTemplate: {
      driveMode: "constantVoltage",
      voltageV: 38.6,
      currentA: 2,
      temperatureC: 50,
    },
    emitters: [],
  };
  duplicateBoard.boards = [document, document];
  duplicateBoard.boardCount = 2;

  const imported = importBoardLibrary({
    storageKey: "board-library-import-duplicate",
    storageAdapter: createMemoryStorageAdapter(),
    payload: duplicateBoard,
    mode: "replace",
  });

  assert.equal(imported.ok, false);
  assert.ok(
    imported.errors.some(
      (issue) => issue.code === "BOARD_COLLECTION_DUPLICATE_ID",
    ),
  );
});

test("board library merge overwrites duplicate ids and reports conflict policy", () => {
  const storageKey = "board-library-merge-overwrite";
  const sourceAdapter = createMemoryStorageAdapter();
  const targetAdapter = createMemoryStorageAdapter();
  createBoardDefinition({
    storageKey,
    storageAdapter: sourceAdapter,
    draft: buildDraft("Duplicate Board", { widthMm: 500 }),
  });
  createBoardDefinition({
    storageKey,
    storageAdapter: targetAdapter,
    draft: buildDraft("Duplicate Board", { widthMm: 100 }),
  });

  const imported = importBoardLibrary({
    storageKey,
    storageAdapter: targetAdapter,
    payload: exportBoardLibrary({ storageKey, storageAdapter: sourceAdapter })
      .data,
    mode: "merge",
  });

  assert.equal(imported.ok, true);
  assert.equal(imported.data.conflictPolicy, "mergeOverwrite");
  assert.equal(imported.data.overwrittenCount, 1);
  assert.equal(
    targetAdapter.loadSavedBoards(storageKey)[0].definition.widthMm,
    500,
  );
});

test("board library merge can skip duplicate ids", () => {
  const storageKey = "board-library-merge-skip";
  const sourceAdapter = createMemoryStorageAdapter();
  const targetAdapter = createMemoryStorageAdapter();
  createBoardDefinition({
    storageKey,
    storageAdapter: sourceAdapter,
    draft: buildDraft("Duplicate Board", { widthMm: 500 }),
  });
  createBoardDefinition({
    storageKey,
    storageAdapter: targetAdapter,
    draft: buildDraft("Duplicate Board", { widthMm: 100 }),
  });

  const imported = importBoardLibrary({
    storageKey,
    storageAdapter: targetAdapter,
    payload: exportBoardLibrary({ storageKey, storageAdapter: sourceAdapter })
      .data,
    mode: "mergeSkipDuplicates",
  });

  assert.equal(imported.ok, true);
  assert.equal(imported.data.conflictPolicy, "mergeSkipDuplicate");
  assert.equal(imported.data.skippedDuplicateCount, 1);
  assert.equal(
    targetAdapter.loadSavedBoards(storageKey)[0].definition.widthMm,
    100,
  );
});
