import { BoardProfile } from "@/domain/BoardProfile";
import { PRESET_BOARDS } from "@/domain/BoardPresets";

/**
 * Normalize a board-like input to the canonical persisted/runtime board shape.
 *
 * @param {Partial<import("@/domain/contracts").BoardDefinition>} source
 * @returns {import("@/domain/contracts").BoardDefinition}
 */
export function normalizeBoardDefinition(source = {}) {
  return new BoardProfile(source).toJSON();
}

/**
 * @returns {import("@/domain/contracts").BoardDefinition[]}
 */
export function listPresetBoards() {
  return PRESET_BOARDS.map((board) => normalizeBoardDefinition(board));
}
