import {
  createBoardDefinition as createBoardDefinitionInLibrary,
  deleteBoardDefinition as deleteBoardDefinitionInLibrary,
  duplicateBoardDefinition as duplicateBoardDefinitionInLibrary,
  listBoardDefinitions,
  listBoardDefinitionsWithReport,
  updateBoardDefinition as updateBoardDefinitionInLibrary,
} from "@/application/boardLibrary/boardLibraryService";
import { validateBoardDefinitionDraft } from "@/application/boardLibrary/boardDefinitionValidation";
import {
  applyBoardSelection,
  normalizeBoardMutation,
} from "@/application/planner/mutations";
import {
  createFailureResult,
  type OperationResultV11,
} from "@/contracts/versioned/results";
import type { BoardStorageAdapter } from "@/application/boardLibrary/boardStorageAdapter";
import type { BoardOption } from "@/application/planner/useCases/contracts";
import type { AppIssueV11 } from "@/contracts/versioned/issues";
import type { BoardDefinition } from "@/domain/contracts";

type BoardLibraryStateInput = {
  storageKey: string;
  storageAdapter: BoardStorageAdapter;
  migrateLedType: (ledType: string) => string;
};

type BoardLibraryStorageInput = Omit<BoardLibraryStateInput, "migrateLedType">;

type BoardMutationStateInput = BoardLibraryStateInput & {
  draft: Partial<BoardDefinition>;
  clock?: { now: () => number };
};

/**
 * Load full board options and normalize LED fallback migration.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: { loadSavedBoards:(key:string)=>Array<object>, saveBoardCollection:(key:string, boards:Array<object>)=>void },
 *   migrateLedType:(ledType:string)=>string
 * }} input
 */
export function loadBoardOptions(input: BoardLibraryStateInput): BoardOption[] {
  return listBoardDefinitions({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
  }).map((board) => applyBoardSelection(board, input.migrateLedType));
}

/**
 * Load board options with migration warnings report.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: { loadSavedBoards:(key:string)=>Array<object>, saveBoardCollection:(key:string, boards:Array<object>)=>void },
 *   migrateLedType:(ledType:string)=>string
 * }} input
 */
export function loadBoardOptionsWithReport(input: BoardLibraryStateInput): {
  boards: BoardOption[];
  warnings: AppIssueV11[];
} {
  const result = listBoardDefinitionsWithReport({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
  });
  return {
    boards: result.boards.map((board) =>
      applyBoardSelection(board, input.migrateLedType),
    ),
    warnings: result.warnings,
  };
}

/**
 * Create a board definition and return an operation envelope.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter: { loadSavedBoards:(key:string)=>Array<object>, saveBoardCollection:(key:string, boards:Array<object>)=>void },
 *   draft: Record<string, unknown>,
 *   migrateLedType:(ledType:string)=>string,
 *   clock?: { now: () => number }
 * }} input
 */
export function createBoardDefinitionWithValidation(
  input: BoardMutationStateInput,
): OperationResultV11<BoardDefinition> {
  const normalizedDraft = normalizeBoardMutation(
    input.draft,
    input.migrateLedType,
  );
  const blockingIssues = validateBoardDefinitionDraft(normalizedDraft).filter(
    (issue) => issue.severity === "error",
  );
  if (blockingIssues.length > 0) {
    return createFailureResult({ errors: blockingIssues });
  }
  return createBoardDefinitionInLibrary({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    draft: normalizedDraft,
    clock: input.clock,
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
export function updateBoardDefinitionWithValidation(
  input: BoardMutationStateInput & { boardId: string },
): OperationResultV11<BoardDefinition> {
  const normalizedDraft = normalizeBoardMutation(
    input.draft,
    input.migrateLedType,
  );
  const blockingIssues = validateBoardDefinitionDraft(normalizedDraft).filter(
    (issue) => issue.severity === "error",
  );
  if (blockingIssues.length > 0) {
    return createFailureResult({ errors: blockingIssues });
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
 *   migrateLedType:(ledType:string)=>string,
 *   clock?: { now: () => number }
 * }} input
 */
export function duplicateBoardDefinitionWithValidation(
  input: BoardMutationStateInput,
): OperationResultV11<BoardDefinition> {
  const normalizedDraft = normalizeBoardMutation(
    input.draft,
    input.migrateLedType,
  );
  const blockingIssues = validateBoardDefinitionDraft(normalizedDraft).filter(
    (issue) => issue.severity === "error",
  );
  if (blockingIssues.length > 0) {
    return createFailureResult({ errors: blockingIssues });
  }
  return duplicateBoardDefinitionInLibrary({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    draft: normalizedDraft,
    clock: input.clock,
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
export function deleteBoardDefinitionWithValidation(
  input: BoardLibraryStorageInput & { boardId: string },
): OperationResultV11 {
  return deleteBoardDefinitionInLibrary({
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    boardId: input.boardId,
  });
}
