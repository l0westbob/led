import type { AppIssue, BoardDefinition } from "@/domain/contracts";

/**
 * Validate the editable board-definition form fields.
 *
 * @param {Partial<import("@/domain/contracts").BoardDefinition>} boardDefinition
 * @returns {BoardDefinitionIssue[]}
 */
export function validateBoardDefinitionDraft(
  boardDefinition: Partial<BoardDefinition>,
): AppIssue[] {
  const issues: AppIssue[] = [];
  const boardName = String(boardDefinition.name ?? "").trim();
  if (boardName.length < 2) {
    issues.push({
      code: "BOARD_NAME_TOO_SHORT",
      message: "Board name must contain at least 2 characters.",
      severity: "error",
      field: "name",
    });
  }

  if (!boardDefinition.ledType) {
    issues.push({
      code: "LED_TYPE_REQUIRED",
      message: "LED type is required.",
      severity: "error",
      field: "ledType",
    });
  }

  const numericRangeChecks: Array<[string, unknown, number, number]> = [
    ["widthMm", boardDefinition.widthMm, 10, 10000],
    ["depthMm", boardDefinition.depthMm, 10, 10000],
    ["ledCount", boardDefinition.ledCount, 1, 20000],
    ["columns", boardDefinition.columns, 1, 400],
    ["rows", boardDefinition.rows, 1, 400],
    ["spacingXMm", boardDefinition.spacingXMm, 0.5, 1000],
    ["spacingYMm", boardDefinition.spacingYMm, 0.5, 1000],
    ["voltageV", boardDefinition.voltageV, 0, 500],
    ["currentA", boardDefinition.currentA, 0, 100],
    ["temperatureC", boardDefinition.temperatureC, -50, 150],
    ["seriesCount", boardDefinition.seriesCount, 0, 20000],
    ["parallelCount", boardDefinition.parallelCount, 0, 20000],
  ];

  for (const [field, rawValue, min, max] of numericRangeChecks) {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      issues.push({
        code: "INVALID_NUMBER",
        message: `${field} must be a finite number.`,
        severity: "error",
        field,
      });
      continue;
    }
    if (numericValue < min || numericValue > max) {
      issues.push({
        code: "OUT_OF_RANGE",
        message: `${field} is outside expected range (${min}..${max}).`,
        severity: "warning",
        field,
      });
    }
  }

  return issues;
}
