/**
 * @typedef {{ code:string, message:string, severity:"warning"|"error", field?:string }} ValidationIssue
 */

/**
 * @param {Partial<import("@/domain/contracts").BoardDefinition>} board
 * @returns {ValidationIssue[]}
 */
export function validateBoardInput(board) {
  const issues = [];
  const checks = [
    ["widthMm", board.widthMm, 10, 10000],
    ["depthMm", board.depthMm, 10, 10000],
    ["ledCount", board.ledCount, 1, 20000],
    ["voltageV", board.voltageV, 0, 500],
    ["currentA", board.currentA, 0, 100],
    ["temperatureC", board.temperatureC, -50, 150],
    ["photoperiodHours", board.photoperiodHours, 0, 24],
  ];

  for (const [field, value, min, max] of checks) {
    if (!Number.isFinite(value)) {
      issues.push({
        code: "INVALID_NUMBER",
        field,
        severity: "error",
        message: `${field} must be a finite number.`,
      });
      continue;
    }
    if (value < min || value > max) {
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
