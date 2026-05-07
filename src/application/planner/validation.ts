import type { AppIssue, BoardDefinition } from "@/domain/contracts";

/**
 * @param {Partial<import("@/domain/contracts").BoardDefinition>} board
 * @returns {ValidationIssue[]}
 */
export function validateBoardInput(
  board: Partial<BoardDefinition>,
): AppIssue[] {
  const issues: AppIssue[] = [];
  const checks: Array<[string, unknown, number, number]> = [
    ["widthMm", board.widthMm, 10, 10000],
    ["depthMm", board.depthMm, 10, 10000],
    ["ledCount", board.ledCount, 1, 20000],
    ["voltageV", board.voltageV, 0, 500],
    ["currentA", board.currentA, 0, 100],
    ["temperatureC", board.temperatureC, -50, 150],
    ["photoperiodHours", board.photoperiodHours, 0, 24],
  ];

  for (const [field, value, min, max] of checks) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      issues.push({
        code: "INVALID_NUMBER",
        field,
        severity: "error",
        message: `${field} must be a finite number.`,
      });
      continue;
    }
    if (numericValue < min || numericValue > max) {
      issues.push({
        code: "OUT_OF_RANGE",
        field,
        severity: "warning",
        message: `${field} is outside expected range (${min}..${max}).`,
      });
    }
  }

  return issues;
}
