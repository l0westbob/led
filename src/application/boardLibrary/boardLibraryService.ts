import {
  normalizeBoardDefinition,
  listPresetBoards,
} from "@/catalog/boardCatalog";
import {
  deserializeBoardDefinitionCollection,
  serializeBoardDefinitionCollection,
} from "@/application/boardLibrary/boardDocumentMigration";
import {
  loadBoardsFromStorageAdapter,
  saveBoardsToStorageAdapter,
} from "@/application/boardLibrary/boardStorageAdapter";
import {
  createFailureResult,
  createSuccessResult,
  type OperationResultV11,
} from "@/contracts/versioned/results";
import { systemClock } from "@/utils/runtime";
import { slugify } from "@/utils/strings";
import type { BoardStorageAdapter } from "@/application/boardLibrary/boardStorageAdapter";
import type { AppIssueV11 } from "@/contracts/versioned/issues";
import type { BoardDefinition } from "@/domain/contracts";

type BoardLibraryInput = {
  storageKey: string;
  storageAdapter: BoardStorageAdapter;
};

type BoardDefinitionWithPresetFlag = BoardDefinition & { isPreset: boolean };

type BoardMutationInput = BoardLibraryInput & {
  draft: Partial<BoardDefinition>;
  clock?: { now: () => number };
};

type BoardIdMutationInput = BoardLibraryInput & {
  boardId: string;
};

/**
 * @typedef {{
 *   loadSavedBoards:(storageKey:string)=>Array<object>,
 *   loadSavedBoardsWithReport?:(storageKey:string)=>{ boards:Array<object>, warnings?:unknown, errors?:unknown },
 *   saveBoardCollection:(storageKey:string,boards:Array<object>)=>void,
 *   saveBoardCollectionWithReport?:(storageKey:string,boards:Array<object>)=>{ ok:boolean, warnings?:unknown, errors?:unknown }
 * }} BoardStorageAdapter
 */

/**
 * @typedef {import("@/domain/contracts").OperationResult} OperationResult
 */

/**
 * Read normalized custom board definitions from persistent storage.
 *
 * @param {{ storageKey:string, storageAdapter:BoardStorageAdapter }} input
 * @returns {{
 *   boards: import("@/domain/contracts").BoardDefinition[],
 *   warnings: import("@/contracts/versioned/issues").AppIssueV11[]
 * }}
 */
export function listCustomBoardDefinitionsWithReport(
  input: BoardLibraryInput,
): { boards: BoardDefinition[]; warnings: AppIssueV11[] } {
  const storageReport = loadBoardsFromStorageAdapter(input);
  const deserializedCollection = deserializeBoardDefinitionCollection(
    storageReport.boards,
  );
  return {
    boards: deserializedCollection.boards.map((entry) =>
      normalizeBoardDefinition(entry),
    ),
    warnings: [...storageReport.warnings, ...deserializedCollection.warnings],
  };
}

/**
 * Read normalized custom board definitions from persistent storage.
 *
 * @param {{ storageKey:string, storageAdapter:BoardStorageAdapter }} input
 * @returns {import("@/domain/contracts").BoardDefinition[]}
 */
export function listCustomBoardDefinitions(
  input: BoardLibraryInput,
): BoardDefinition[] {
  return listCustomBoardDefinitionsWithReport(input).boards;
}

/**
 * Read preset + custom board definitions as one unified library with migration
 * report warnings.
 *
 * @param {{ storageKey:string, storageAdapter:BoardStorageAdapter }} input
 * @returns {{
 *   boards: Array<import("@/domain/contracts").BoardDefinition & { isPreset:boolean }>,
 *   warnings: import("@/contracts/versioned/issues").AppIssueV11[]
 * }}
 */
export function listBoardDefinitionsWithReport(input: BoardLibraryInput): {
  boards: BoardDefinitionWithPresetFlag[];
  warnings: AppIssueV11[];
} {
  const customWithReport = listCustomBoardDefinitionsWithReport(input);
  const presetBoards = listPresetBoards().map((entry) => ({
    ...entry,
    isPreset: true,
  }));
  const customBoards = customWithReport.boards.map((entry) => ({
    ...entry,
    isPreset: false,
  }));
  return {
    boards: [...presetBoards, ...customBoards],
    warnings: customWithReport.warnings,
  };
}

/**
 * Read preset + custom board definitions as one unified library.
 *
 * @param {{ storageKey:string, storageAdapter:BoardStorageAdapter }} input
 * @returns {Array<import("@/domain/contracts").BoardDefinition & { isPreset:boolean }>}
 */
export function listBoardDefinitions(
  input: BoardLibraryInput,
): BoardDefinitionWithPresetFlag[] {
  return listBoardDefinitionsWithReport(input).boards;
}

/**
 * Persist a normalized custom-board collection.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   customBoards:Array<import("@/domain/contracts").BoardDefinition>
 * }} input
 */
function saveCustomBoardDefinitions(
  input: BoardLibraryInput & {
    customBoards: BoardDefinition[];
  },
): OperationResultV11 {
  const serializedCollection = serializeBoardDefinitionCollection(
    input.customBoards,
  );
  return saveBoardsToStorageAdapter({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    boards: serializedCollection,
  });
}

/**
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   draft:Partial<import("@/domain/contracts").BoardDefinition>,
 *   clock?: { now: () => number }
 * }} input
 * @returns {OperationResult}
 */
export function createBoardDefinition(
  input: BoardMutationInput,
): OperationResultV11<BoardDefinition> {
  const existingLibrary = listBoardDefinitions(input);
  const existingCustomBoards = listCustomBoardDefinitions(input);
  const normalizedDraft = normalizeBoardDefinition(input.draft);
  const timestamp = input.clock?.now?.() ?? systemClock.now();
  const baseIdentifier = slugify(normalizedDraft.name) || `board-${timestamp}`;

  let candidateIdentifier = baseIdentifier;
  if (existingLibrary.some((entry) => entry.id === candidateIdentifier)) {
    candidateIdentifier = `${baseIdentifier}-${timestamp}`;
  }
  normalizedDraft.id = candidateIdentifier;
  existingCustomBoards.push(normalizedDraft);
  const saveResult = saveCustomBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    customBoards: existingCustomBoards,
  });
  if (!saveResult.ok) {
    return createFailureResult<BoardDefinition>({
      warnings: saveResult.warnings,
      errors: saveResult.errors,
    });
  }
  return createSuccessResult({
    data: normalizedDraft,
    warnings: saveResult.warnings,
  });
}

/**
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   boardId:string,
 *   draft:Partial<import("@/domain/contracts").BoardDefinition>
 * }} input
 * @returns {OperationResult}
 */
export function updateBoardDefinition(
  input: BoardIdMutationInput & { draft: Partial<BoardDefinition> },
): OperationResultV11<BoardDefinition> {
  const existingCustomBoards = listCustomBoardDefinitions(input);
  const existingEntry = existingCustomBoards.find(
    (entry) => entry.id === input.boardId,
  );
  if (!existingEntry) {
    return createFailureResult({
      errors: [
        {
          code: "BOARD_NOT_FOUND",
          message: `Cannot update board ${input.boardId} because it is not a custom board.`,
          severity: "error",
          field: "selectedBoardId",
        },
      ],
    });
  }

  const normalizedDraft = normalizeBoardDefinition(input.draft);
  normalizedDraft.id = input.boardId;
  const updatedCustomBoards = existingCustomBoards.filter(
    (entry) => entry.id !== input.boardId,
  );
  updatedCustomBoards.push(normalizedDraft);
  const saveResult = saveCustomBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    customBoards: updatedCustomBoards,
  });
  if (!saveResult.ok) {
    return createFailureResult<BoardDefinition>({
      warnings: saveResult.warnings,
      errors: saveResult.errors,
    });
  }
  return createSuccessResult({
    data: normalizedDraft,
    warnings: saveResult.warnings,
  });
}

/**
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   boardId:string
 * }} input
 * @returns {OperationResult}
 */
export function deleteBoardDefinition(
  input: BoardIdMutationInput,
): OperationResultV11<{ deletedBoardId: string }> {
  const existingCustomBoards = listCustomBoardDefinitions(input);
  const boardExists = existingCustomBoards.some(
    (entry) => entry.id === input.boardId,
  );
  if (!boardExists) {
    return createFailureResult({
      errors: [
        {
          code: "BOARD_NOT_FOUND",
          message: `Cannot delete board ${input.boardId} because it is not a custom board.`,
          severity: "error",
          field: "selectedBoardId",
        },
      ],
    });
  }

  const updatedCustomBoards = existingCustomBoards.filter(
    (entry) => entry.id !== input.boardId,
  );
  const saveResult = saveCustomBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    customBoards: updatedCustomBoards,
  });
  if (!saveResult.ok) {
    return createFailureResult<{ deletedBoardId: string }>({
      warnings: saveResult.warnings,
      errors: saveResult.errors,
    });
  }
  return createSuccessResult({ data: { deletedBoardId: input.boardId } });
}

/**
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   draft:Partial<import("@/domain/contracts").BoardDefinition>,
 *   clock?: { now: () => number }
 * }} input
 * @returns {OperationResult}
 */
export function duplicateBoardDefinition(
  input: BoardMutationInput,
): OperationResultV11<BoardDefinition> {
  const existingLibrary = listBoardDefinitions(input);
  const existingCustomBoards = listCustomBoardDefinitions(input);
  const normalizedDraft = normalizeBoardDefinition(input.draft);
  const timestamp = input.clock?.now?.() ?? systemClock.now();
  const baseIdentifier = slugify(normalizedDraft.name) || `board-${timestamp}`;

  let candidateIdentifier = `${baseIdentifier}-copy`;
  let suffixIndex = 2;
  while (existingLibrary.some((entry) => entry.id === candidateIdentifier)) {
    candidateIdentifier = `${baseIdentifier}-copy-${suffixIndex}`;
    suffixIndex += 1;
  }

  normalizedDraft.id = candidateIdentifier;
  normalizedDraft.name = `${normalizedDraft.name} Copy`;
  existingCustomBoards.push(normalizedDraft);
  const saveResult = saveCustomBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    customBoards: existingCustomBoards,
  });
  if (!saveResult.ok) {
    return createFailureResult<BoardDefinition>({
      warnings: saveResult.warnings,
      errors: saveResult.errors,
    });
  }
  return createSuccessResult({
    data: normalizedDraft,
    warnings: saveResult.warnings,
  });
}
