import { BoardProfile } from "@/domain/BoardProfile";
import { PRESET_BOARDS } from "@/domain/BoardPresets";
import type { BoardDefinition } from "@/domain/contracts";

/**
 * Normalize a board-like input to the canonical persisted/runtime board shape.
 *
 * @param {Partial<import("@/domain/contracts").BoardDefinition>} source
 * @returns {import("@/domain/contracts").BoardDefinition}
 */
export function normalizeBoardDefinition(
  source: Partial<BoardDefinition> = {},
): BoardDefinition {
  return new BoardProfile(source).toJSON();
}

/**
 * @returns {import("@/domain/contracts").BoardDefinition[]}
 */
export function listPresetBoards(): BoardDefinition[] {
  return PRESET_BOARDS.map((board) => normalizeBoardDefinition(board));
}
