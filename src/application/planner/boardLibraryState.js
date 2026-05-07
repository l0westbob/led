import {
  createBoardDefinition as createBoardDefinitionInLibrary,
  deleteBoardDefinition as deleteBoardDefinitionInLibrary,
  duplicateBoardDefinition as duplicateBoardDefinitionInLibrary,
  listBoardDefinitions,
  updateBoardDefinition as updateBoardDefinitionInLibrary,
} from "@/application/boardLibrary/boardLibraryService";
import { validateBoardDefinitionDraft } from "@/application/boardLibrary/boardDefinitionValidation";
import { applyBoardSelection, normalizeBoardMutation } from "@/application/planner/mutations";

/**
 * Load full board options and normalize LED fallback migration.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: { loadSavedBoards:(key:string)=>Array<object>, saveBoardCollection:(key:string, boards:Array<object>)=>void },
 *   migrateLedType:(ledType:string)=>string
 * }} input
 */
export function loadBoardOptions(input) {
  return listBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
  }).map((board) => applyBoardSelection(board, input.migrateLedType));
}

/**
 * Create a board definition and return an operation envelope.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: { loadSavedBoards:(key:string)=>Array<object>, saveBoardCollection:(key:string, boards:Array<object>)=>void },
 *   draft: Record<string, unknown>,
 *   migrateLedType:(ledType:string)=>string
 * }} input
 */
export function createBoardDefinitionWithValidation(input) {
  const normalizedDraft = normalizeBoardMutation(input.draft, input.migrateLedType);
  const blockingIssues = validateBoardDefinitionDraft(normalizedDraft).filter(
    (issue) => issue.severity === "error",
  );
  if (blockingIssues.length > 0) {
    return { ok: false, errors: blockingIssues };
  }
  return createBoardDefinitionInLibrary({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    draft: normalizedDraft,
  });
}

/**
 * Update a custom board definition and return an operation envelope.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: { loadSavedBoards:(key:string)=>Array<object>, saveBoardCollection:(key:string, boards:Array<object>)=>void },
 *   boardId: string,
 *   draft: Record<string, unknown>,
 *   migrateLedType:(ledType:string)=>string
 * }} input
 */
export function updateBoardDefinitionWithValidation(input) {
  const normalizedDraft = normalizeBoardMutation(input.draft, input.migrateLedType);
  const blockingIssues = validateBoardDefinitionDraft(normalizedDraft).filter(
    (issue) => issue.severity === "error",
  );
  if (blockingIssues.length > 0) {
    return { ok: false, errors: blockingIssues };
  }
  return updateBoardDefinitionInLibrary({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    boardId: input.boardId,
    draft: normalizedDraft,
  });
}

/**
 * Duplicate a board definition draft and return an operation envelope.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: { loadSavedBoards:(key:string)=>Array<object>, saveBoardCollection:(key:string, boards:Array<object>)=>void },
 *   draft: Record<string, unknown>,
 *   migrateLedType:(ledType:string)=>string
 * }} input
 */
export function duplicateBoardDefinitionWithValidation(input) {
  const normalizedDraft = normalizeBoardMutation(input.draft, input.migrateLedType);
  const blockingIssues = validateBoardDefinitionDraft(normalizedDraft).filter(
    (issue) => issue.severity === "error",
  );
  if (blockingIssues.length > 0) {
    return { ok: false, errors: blockingIssues };
  }
  return duplicateBoardDefinitionInLibrary({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    draft: normalizedDraft,
  });
}

/**
 * Delete one custom board definition.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: { loadSavedBoards:(key:string)=>Array<object>, saveBoardCollection:(key:string, boards:Array<object>)=>void },
 *   boardId: string
 * }} input
 */
export function deleteBoardDefinitionWithValidation(input) {
  return deleteBoardDefinitionInLibrary({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    boardId: input.boardId,
  });
}
