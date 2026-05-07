import {
  createFailureResult,
  createSuccessResult,
  type OperationResultV11,
} from "@/contracts/versioned/results";
import type { AppIssueV11 } from "@/contracts/versioned/issues";

export type BoardStorageRecord = object;

export type BoardStorageAdapter = {
  loadSavedBoards: (storageKey: string) => BoardStorageRecord[];
  loadSavedBoardsWithReport?: (storageKey: string) => {
    boards: BoardStorageRecord[];
    warnings?: unknown;
    errors?: unknown;
  };
  saveBoardCollection: (
    storageKey: string,
    boards: BoardStorageRecord[],
  ) => void;
  saveBoardCollectionWithReport?: (
    storageKey: string,
    boards: BoardStorageRecord[],
  ) => { ok: boolean; warnings?: unknown; errors?: unknown };
};

function storageErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function createStorageReadWarning(error: unknown): AppIssueV11 {
  return {
    code: "BOARD_STORAGE_READ_FAILED",
    message: `Saved board library data could not be read: ${storageErrorMessage(error)}`,
    severity: "warning",
    field: "boards",
  };
}

function createStorageWriteError(error: unknown): AppIssueV11 {
  return {
    code: "BOARD_STORAGE_WRITE_FAILED",
    message: `Saved board library data could not be written: ${storageErrorMessage(error)}`,
    severity: "error",
    field: "boards",
  };
}

/**
 * @typedef {{
 *   loadSavedBoards:(storageKey:string)=>Array<object>,
 *   loadSavedBoardsWithReport?:(storageKey:string)=>{ boards:Array<object>, warnings?:unknown, errors?:unknown },
 *   saveBoardCollection:(storageKey:string,boards:Array<object>)=>void,
 *   saveBoardCollectionWithReport?:(storageKey:string,boards:Array<object>)=>{ ok:boolean, warnings?:unknown, errors?:unknown }
 * }} BoardStorageAdapter
 */

/**
 * Load boards from either the report-capable adapter or the legacy adapter.
 *
 * @param {{ storageKey:string, storageAdapter:BoardStorageAdapter }} input
 * @returns {{ boards:Array<object>, warnings:Array<object> }}
 */
export function loadBoardsFromStorageAdapter(input: {
  storageKey: string;
  storageAdapter: BoardStorageAdapter;
}): { boards: BoardStorageRecord[]; warnings: AppIssueV11[] } {
  if (input.storageAdapter.loadSavedBoardsWithReport) {
    const report = input.storageAdapter.loadSavedBoardsWithReport(
      input.storageKey,
    );
    return {
      boards: Array.isArray(report.boards) ? report.boards : [],
      warnings: Array.isArray(report.warnings)
        ? (report.warnings as AppIssueV11[])
        : [],
    };
  }

  try {
    const boards = input.storageAdapter.loadSavedBoards(input.storageKey);
    return {
      boards: Array.isArray(boards) ? boards : [],
      warnings: [],
    };
  } catch (error) {
    return {
      boards: [],
      warnings: [createStorageReadWarning(error)],
    };
  }
}

/**
 * Save boards through either the report-capable adapter or the legacy adapter.
 *
 * @param {{
 *   storageKey:string,
 *   storageAdapter:BoardStorageAdapter,
 *   boards:Array<object>
 * }} input
 */
export function saveBoardsToStorageAdapter(input: {
  storageKey: string;
  storageAdapter: BoardStorageAdapter;
  boards: BoardStorageRecord[];
}): OperationResultV11 {
  if (input.storageAdapter.saveBoardCollectionWithReport) {
    const report = input.storageAdapter.saveBoardCollectionWithReport(
      input.storageKey,
      input.boards,
    );
    if (!report.ok) {
      return createFailureResult({
        warnings: report.warnings,
        errors: report.errors,
      });
    }
    return createSuccessResult({ warnings: report.warnings });
  }

  try {
    input.storageAdapter.saveBoardCollection(input.storageKey, input.boards);
    return createSuccessResult();
  } catch (error) {
    return createFailureResult({
      errors: [createStorageWriteError(error)],
    });
  }
}
