import {
  createBoardDefinitionDocumentCollection,
  isFutureBoardCollectionVersion,
} from "@/contracts/versioned/boardCollections";
import {
  createFailureResult,
  createSuccessResult,
  type OperationResultV11,
} from "@/contracts/versioned/results";
import {
  deserializeBoardDefinitionCollection,
  serializeBoardDefinitionCollection,
} from "@/application/boardLibrary/boardDocumentMigration";
import { saveBoardsToStorageAdapter } from "@/application/boardLibrary/boardStorageAdapter";
import { listCustomBoardDefinitions } from "@/application/boardLibrary/boardLibraryService";
import {
  assertBoardDefinitionDocument,
  assertBoardDefinitionDocumentCollection,
} from "@/contracts/versioned/assertions";
import { systemClock } from "@/utils/runtime";
import type {
  BoardStorageAdapter,
  BoardStorageRecord,
} from "@/application/boardLibrary/boardStorageAdapter";
import type { AppIssueV11 } from "@/contracts/versioned/issues";
import type { BoardDefinitionDocumentCollection } from "@/contracts/versioned/boardCollections";

type BoardLibraryTransferInput = {
  storageKey: string;
  storageAdapter: BoardStorageAdapter;
  clock?: { now: () => number };
};

export type ImportMode = "replace" | "merge" | "mergeSkipDuplicates";

export type BoardLibraryImportSummary = {
  mode: ImportMode;
  conflictPolicy: "replaceAll" | "mergeOverwrite" | "mergeSkipDuplicate";
  importedCount: number;
  skippedDuplicateCount: number;
  overwrittenCount: number;
  storedCount: number;
};

export type BoardLibraryExportResult =
  OperationResultV11<BoardDefinitionDocumentCollection>;

export type BoardLibraryImportResult =
  OperationResultV11<BoardLibraryImportSummary>;

type ImportPolicy = Pick<BoardLibraryImportSummary, "mode" | "conflictPolicy">;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isLegacyBoardEntry(value: unknown): value is BoardStorageRecord {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.ledType === "string"
  );
}

function validateIncomingBoardEntries(
  incomingRawBoards: unknown[],
): AppIssueV11[] {
  const errors: AppIssueV11[] = [];
  for (
    let boardIndex = 0;
    boardIndex < incomingRawBoards.length;
    boardIndex += 1
  ) {
    const rawBoard = incomingRawBoards[boardIndex];
    if (!isObject(rawBoard)) {
      errors.push({
        code: "IMPORT_BOARD_ENTRY_INVALID",
        message: `Imported board at index ${boardIndex} must be an object.`,
        severity: "error",
        field: "boards",
      });
      continue;
    }
    if (rawBoard.documentType === "BoardDefinitionDocument") {
      const documentIssues = assertBoardDefinitionDocument(rawBoard);
      errors.push(
        ...documentIssues.map((issue) => ({
          ...issue,
          message: `Imported board at index ${boardIndex}: ${issue.message}`,
        })),
      );
      continue;
    }
    if (!isLegacyBoardEntry(rawBoard)) {
      errors.push({
        code: "IMPORT_BOARD_ENTRY_UNSUPPORTED",
        message:
          `Imported board at index ${boardIndex} is neither a v1.1 document ` +
          "nor a supported legacy board entry.",
        severity: "error",
        field: "boards",
      });
    }
  }
  return errors;
}

function validateCollectionPayload(
  payload: Record<string, unknown>,
): AppIssueV11[] {
  if (payload.schema == null && payload.schemaVersion == null) {
    return [];
  }
  if (isFutureBoardCollectionVersion(String(payload.schemaVersion ?? ""))) {
    return [
      {
        code: "IMPORT_SCHEMA_VERSION_UNSUPPORTED",
        message: `Board collection schemaVersion ${payload.schemaVersion} is newer than this app supports.`,
        severity: "error",
        field: "schemaVersion",
      },
    ];
  }
  return assertBoardDefinitionDocumentCollection(payload);
}

function resolveImportPolicy(mode?: ImportMode): ImportPolicy {
  if (mode === "replace") {
    return { mode: "replace", conflictPolicy: "replaceAll" };
  }
  if (mode === "mergeSkipDuplicates") {
    return {
      mode: "mergeSkipDuplicates",
      conflictPolicy: "mergeSkipDuplicate",
    };
  }
  return { mode: "merge", conflictPolicy: "mergeOverwrite" };
}

/**
 * Export custom board library as versioned JSON payload.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: import("@/application/boardLibrary/boardStorageAdapter").BoardStorageAdapter,
 *   clock?: { now: () => number }
 * }} input
 */
export function exportBoardLibrary(
  input: BoardLibraryTransferInput,
): BoardLibraryExportResult {
  const customBoards = listCustomBoardDefinitions(input);
  const serializedBoards = serializeBoardDefinitionCollection(customBoards);
  const clock = input.clock ?? systemClock;
  return createSuccessResult({
    data: createBoardDefinitionDocumentCollection({
      exportedAtIso: new Date(clock.now()).toISOString(),
      boards: serializedBoards,
    }),
  });
}

/**
 * Import custom board library payload.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: import("@/application/boardLibrary/boardStorageAdapter").BoardStorageAdapter,
 *   payload: unknown,
 *   mode?: "replace"|"merge"|"mergeSkipDuplicates"
 * }} input
 */
export function importBoardLibrary(
  input: BoardLibraryTransferInput & {
    payload: unknown;
    mode?: ImportMode;
  },
): BoardLibraryImportResult {
  if (!input.payload || typeof input.payload !== "object") {
    return createFailureResult({
      errors: [
        {
          code: "IMPORT_PAYLOAD_INVALID",
          message: "Import payload must be a JSON object.",
          severity: "error",
          field: "payload",
        },
      ],
    });
  }

  const importPolicy = resolveImportPolicy(input.mode);
  const payload = input.payload as Record<string, unknown>;
  const collectionErrors = validateCollectionPayload(payload);
  if (collectionErrors.length > 0) {
    return createFailureResult({ errors: collectionErrors });
  }
  const incomingRawBoards = Array.isArray(payload.boards) ? payload.boards : [];
  const validationErrors = validateIncomingBoardEntries(incomingRawBoards);
  if (validationErrors.length > 0) {
    return createFailureResult({ errors: validationErrors });
  }

  const incomingDeserialized =
    deserializeBoardDefinitionCollection(incomingRawBoards);

  const existingCustomBoards = listCustomBoardDefinitions(input);
  const existingById = new Map(
    existingCustomBoards.map((board) => [board.id, board]),
  );

  let mergedBoards;
  let skippedDuplicateCount = 0;
  let overwrittenCount = 0;
  if (importPolicy.mode === "replace") {
    mergedBoards = incomingDeserialized.boards;
  } else {
    for (const incomingBoard of incomingDeserialized.boards) {
      if (
        importPolicy.mode === "mergeSkipDuplicates" &&
        existingById.has(incomingBoard.id)
      ) {
        skippedDuplicateCount += 1;
        continue;
      }
      if (existingById.has(incomingBoard.id)) {
        overwrittenCount += 1;
      }
      existingById.set(incomingBoard.id, incomingBoard);
    }
    mergedBoards = [...existingById.values()];
  }

  const saveResult = saveBoardsToStorageAdapter({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    boards: serializeBoardDefinitionCollection(mergedBoards),
  });
  if (!saveResult.ok) {
    return createFailureResult<BoardLibraryImportSummary>({
      warnings: saveResult.warnings,
      errors: saveResult.errors,
    });
  }

  return createSuccessResult<BoardLibraryImportSummary>({
    data: {
      mode: importPolicy.mode,
      conflictPolicy: importPolicy.conflictPolicy,
      importedCount: incomingDeserialized.boards.length,
      skippedDuplicateCount,
      overwrittenCount,
      storedCount: mergedBoards.length,
    },
    warnings: [...incomingDeserialized.warnings, ...saveResult.warnings],
  });
}
