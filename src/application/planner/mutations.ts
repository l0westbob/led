import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import type { BoardDefinition } from "@/domain/contracts";

/**
 * Build normalized form patch when a board is selected/loaded.
 *
 * @param {Partial<import("@/domain/contracts").BoardDefinition>} source
 * @param {(ledType:string)=>string} migrateLedType
 */
export function applyBoardSelection(
  source: Partial<BoardDefinition>,
  migrateLedType: (ledType: string) => string,
): BoardDefinition {
  return normalizeBoardDefinition({
    ...source,
    ledType: migrateLedType(String(source.ledType ?? "")),
  });
}

/**
 * Build normalized form patch for save/update operations.
 *
 * @param {Partial<import("@/domain/contracts").BoardDefinition>} source
 * @param {(ledType:string)=>string} migrateLedType
 */
export function normalizeBoardMutation(
  source: Partial<BoardDefinition>,
  migrateLedType: (ledType: string) => string,
): BoardDefinition {
  return normalizeBoardDefinition({
    ...source,
    ledType: migrateLedType(String(source.ledType ?? "")),
  });
}

/**
 * Infer which electrical field should be preserved after LED-related edits.
 *
 * @param {{
 *   driveMode: "constantVoltage" | "constantCurrent",
 *   lastEdited: "voltageV" | "currentA"
 * }} input
 * @returns {"voltageV" | "currentA"}
 */
export function preserveFieldForElectricalRecompute(input: {
  driveMode: "constantVoltage" | "constantCurrent";
  lastEdited: "voltageV" | "currentA";
}): "voltageV" | "currentA" {
  return input.driveMode === "constantCurrent" ||
    input.lastEdited === "currentA"
    ? "currentA"
    : "voltageV";
}
