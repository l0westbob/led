import type { AppIssue } from "@/domain/contracts";

type IssueBuckets = {
  warnings?: AppIssue[];
  errors?: AppIssue[];
};

/**
 * Normalize unknown issue-like values into a consistent AppIssue-like shape.
 *
 * @param {unknown} issueLike
 * @returns {{ code:string, message:string, severity:"info"|"warning"|"error", field?:string }}
 */
function normalizeIssue(issueLike: unknown): AppIssue {
  if (!issueLike || typeof issueLike !== "object") {
    return {
      code: "UNKNOWN_ISSUE",
      message: String(issueLike ?? "Unknown issue"),
      severity: "warning",
    };
  }

  const issueRecord = issueLike as Record<string, unknown>;
  const severity =
    issueRecord.severity === "error" || issueRecord.severity === "info"
      ? issueRecord.severity
      : "warning";

  return {
    code: String(issueRecord.code ?? "UNKNOWN_ISSUE"),
    message: String(issueRecord.message ?? "Unknown issue"),
    severity,
    ...(issueRecord.field ? { field: String(issueRecord.field) } : {}),
  };
}

/**
 * Build warning/error buckets from a standardized snapshot envelope.
 *
 * @param {{
 *   warnings?: unknown,
 *   errors?: unknown
 * }} envelope
 * @returns {{
 *   warnings: Array<{ code:string, message:string, severity:"info"|"warning"|"error", field?:string }>,
 *   errors: Array<{ code:string, message:string, severity:"info"|"warning"|"error", field?:string }>
 * }}
 */
export function buildIssueBucketsFromEnvelope(envelope: {
  warnings?: unknown;
  errors?: unknown;
}): Required<IssueBuckets> {
  const normalizedWarnings = (
    Array.isArray(envelope?.warnings) ? envelope.warnings : []
  ).map(normalizeIssue);
  const normalizedErrors = (
    Array.isArray(envelope?.errors) ? envelope.errors : []
  ).map(normalizeIssue);

  return {
    warnings: normalizedWarnings,
    errors: normalizedErrors,
  };
}

/**
 * Flatten warning/error buckets into one display list.
 *
 * @param {{
 *   warnings?: Array<{ code:string, message:string, severity:"info"|"warning"|"error", field?:string }>,
 *   errors?: Array<{ code:string, message:string, severity:"info"|"warning"|"error", field?:string }>
 * }} issueBuckets
 * @returns {Array<{ code:string, message:string, severity:"info"|"warning"|"error", field?:string }>}
 */
export function flattenIssueBuckets(issueBuckets: IssueBuckets): AppIssue[] {
  return [
    ...(Array.isArray(issueBuckets?.errors) ? issueBuckets.errors : []),
    ...(Array.isArray(issueBuckets?.warnings) ? issueBuckets.warnings : []),
  ];
}
