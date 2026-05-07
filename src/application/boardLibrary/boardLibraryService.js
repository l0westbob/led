import { normalizeBoardDefinition, listPresetBoards } from "@/catalog/boardCatalog";
import { slugify } from "@/utils/strings";

/**
 * @typedef {{
 *   loadSavedBoards:(storageKey:string)=>Array<object>,
 *   saveBoardCollection:(storageKey:string,boards:Array<object>)=>void
 * }} BoardStorageAdapter
 */

/**
 * @typedef {import("@/domain/contracts").OperationResult} OperationResult
 */

/**
 * Read normalized custom board definitions from persistent storage.
 *
 * @param {{ storageKey:string, storageAdapter:BoardStorageAdapter }} input
 * @returns {import("@/domain/contracts").BoardDefinition[]}
 */
export function listCustomBoardDefinitions(input) {
  return input.storageAdapter
    .loadSavedBoards(input.storageKey)
    .map((entry) => normalizeBoardDefinition(entry));
}

/**
 * Read preset + custom board definitions as one unified library.
 *
 * @param {{ storageKey:string, storageAdapter:BoardStorageAdapter }} input
 * @returns {Array<import("@/domain/contracts").BoardDefinition & { isPreset:boolean }>}
 */
export function listBoardDefinitions(input) {
  const presetBoards = listPresetBoards().map((entry) => ({
    ...entry,
    isPreset: true,
  }));
  const customBoards = listCustomBoardDefinitions(input).map((entry) => ({
    ...entry,
    isPreset: false,
  }));
  return [...presetBoards, ...customBoards];
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
function saveCustomBoardDefinitions(input) {
  input.storageAdapter.saveBoardCollection(input.storageKey, input.customBoards);
}

/**
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   draft:Partial<import("@/domain/contracts").BoardDefinition>
 * }} input
 * @returns {OperationResult}
 */
export function createBoardDefinition(input) {
  const existingLibrary = listBoardDefinitions(input);
  const existingCustomBoards = listCustomBoardDefinitions(input);
  const normalizedDraft = normalizeBoardDefinition(input.draft);
  const baseIdentifier = slugify(normalizedDraft.name) || `board-${Date.now()}`;

  let candidateIdentifier = baseIdentifier;
  if (existingLibrary.some((entry) => entry.id === candidateIdentifier)) {
    candidateIdentifier = `${baseIdentifier}-${Date.now()}`;
  }
  normalizedDraft.id = candidateIdentifier;
  existingCustomBoards.push(normalizedDraft);
  saveCustomBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    customBoards: existingCustomBoards,
  });
  return { ok: true, data: normalizedDraft };
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
export function updateBoardDefinition(input) {
  const existingCustomBoards = listCustomBoardDefinitions(input);
  const existingEntry = existingCustomBoards.find((entry) => entry.id === input.boardId);
  if (!existingEntry) {
    return {
      ok: false,
      errors: [
        {
          code: "BOARD_NOT_FOUND",
          message: `Cannot update board ${input.boardId} because it is not a custom board.`,
          severity: "error",
          field: "selectedBoardId",
        },
      ],
    };
  }

  const normalizedDraft = normalizeBoardDefinition(input.draft);
  normalizedDraft.id = input.boardId;
  const updatedCustomBoards = existingCustomBoards.filter((entry) => entry.id !== input.boardId);
  updatedCustomBoards.push(normalizedDraft);
  saveCustomBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    customBoards: updatedCustomBoards,
  });
  return { ok: true, data: normalizedDraft };
}

/**
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   boardId:string
 * }} input
 * @returns {OperationResult}
 */
export function deleteBoardDefinition(input) {
  const existingCustomBoards = listCustomBoardDefinitions(input);
  const boardExists = existingCustomBoards.some((entry) => entry.id === input.boardId);
  if (!boardExists) {
    return {
      ok: false,
      errors: [
        {
          code: "BOARD_NOT_FOUND",
          message: `Cannot delete board ${input.boardId} because it is not a custom board.`,
          severity: "error",
          field: "selectedBoardId",
        },
      ],
    };
  }

  const updatedCustomBoards = existingCustomBoards.filter((entry) => entry.id !== input.boardId);
  saveCustomBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    customBoards: updatedCustomBoards,
  });
  return { ok: true, data: { deletedBoardId: input.boardId } };
}

/**
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   draft:Partial<import("@/domain/contracts").BoardDefinition>
 * }} input
 * @returns {OperationResult}
 */
export function duplicateBoardDefinition(input) {
  const existingLibrary = listBoardDefinitions(input);
  const existingCustomBoards = listCustomBoardDefinitions(input);
  const normalizedDraft = normalizeBoardDefinition(input.draft);
  const baseIdentifier = slugify(normalizedDraft.name) || `board-${Date.now()}`;

  let candidateIdentifier = `${baseIdentifier}-copy`;
  let suffixIndex = 2;
  while (existingLibrary.some((entry) => entry.id === candidateIdentifier)) {
    candidateIdentifier = `${baseIdentifier}-copy-${suffixIndex}`;
    suffixIndex += 1;
  }

  normalizedDraft.id = candidateIdentifier;
  normalizedDraft.name = `${normalizedDraft.name} Copy`;
  existingCustomBoards.push(normalizedDraft);
  saveCustomBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    customBoards: existingCustomBoards,
  });
  return { ok: true, data: normalizedDraft };
}
