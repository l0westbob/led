import type { AppIssue, OperationResult } from "@/domain/contracts";

type StoredBoardRecord = object;
type BoardStorageReadReport = {
  boards: StoredBoardRecord[];
  warnings: AppIssue[];
  errors: AppIssue[];
};

/**
 * Reads previously saved boards from localStorage.
 *
 * @param {string} storageKey
 * @returns {Array<object>}
 */
export function loadSavedBoards(storageKey: string): StoredBoardRecord[] {
  return loadSavedBoardsWithReport(storageKey).boards;
}

function storageErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reads saved boards and reports recoverable storage problems.
 *
 * @param {string} storageKey
 * @returns {{
 *   boards:Array<object>,
 *   warnings:Array<{code:string,message:string,severity:"warning",field:string}>,
 *   errors:Array<object>
 * }}
 */
export function loadSavedBoardsWithReport(
  storageKey: string,
): BoardStorageReadReport {
  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (rawValue == null) {
      return { boards: [], warnings: [], errors: [] };
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return {
        boards: [],
        warnings: [
          {
            code: "BOARD_STORAGE_NOT_ARRAY",
            message:
              "Saved board library data was ignored because it is not an array.",
            severity: "warning",
            field: "boards",
          },
        ],
        errors: [],
      };
    }

    return {
      boards: parsedValue as StoredBoardRecord[],
      warnings: [],
      errors: [],
    };
  } catch (error) {
    return {
      boards: [],
      warnings: [
        {
          code: "BOARD_STORAGE_READ_FAILED",
          message: `Saved board library data could not be read: ${storageErrorMessage(error)}`,
          severity: "warning",
          field: "boards",
        },
      ],
      errors: [],
    };
  }
}

/**
 * Persists the current custom board collection.
 *
 * @param {string} storageKey
 * @param {Array<object>} boards
 */
export function saveBoardCollection(
  storageKey: string,
  boards: StoredBoardRecord[],
) {
  const result = saveBoardCollectionWithReport(storageKey, boards);
  if (!result.ok) {
    throw new Error(
      result.errors?.[0]?.message ?? "Board library save failed.",
    );
  }
}

/**
 * Persists boards and reports storage failures as operation-style issues.
 *
 * @param {string} storageKey
 * @param {Array<object>} boards
 * @returns {{
 *   ok:boolean,
 *   warnings:Array<object>,
 *   errors:Array<{code:string,message:string,severity:"error",field:string}>
 * }}
 */
export function saveBoardCollectionWithReport(
  storageKey: string,
  boards: StoredBoardRecord[],
): OperationResult {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(boards));
    return { ok: true, warnings: [], errors: [] };
  } catch (error) {
    return {
      ok: false,
      warnings: [],
      errors: [
        {
          code: "BOARD_STORAGE_WRITE_FAILED",
          message: `Saved board library data could not be written: ${storageErrorMessage(error)}`,
          severity: "error",
          field: "boards",
        },
      ],
    };
  }
}
