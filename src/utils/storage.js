/**
 * Reads previously saved boards from localStorage.
 *
 * @param {string} storageKey
 * @returns {Array<object>}
 */
export function loadSavedBoards(storageKey) {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Persists the current custom board collection.
 *
 * @param {string} storageKey
 * @param {Array<object>} boards
 */
export function saveBoardCollection(storageKey, boards) {
  window.localStorage.setItem(storageKey, JSON.stringify(boards));
}
