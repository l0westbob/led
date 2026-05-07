export type AppIssueSeverityV11 = "info" | "warning" | "error";

export type AppIssueV11 = {
  code: string;
  message: string;
  severity: AppIssueSeverityV11;
  field?: string;
};

type AppIssueInput = {
  code: string;
  message: string;
  severity?: AppIssueSeverityV11;
  field?: string;
};

function isAppIssueSeverity(value: unknown): value is AppIssueSeverityV11 {
  return value === "info" || value === "warning" || value === "error";
}

export function createAppIssue(input: AppIssueInput): AppIssueV11 {
  return {
    code: String(input.code || "UNKNOWN"),
    message: String(input.message || "Unknown issue"),
    severity: input.severity ?? "error",
    ...(input.field ? { field: input.field } : {}),
  };
}

export function normalizeAppIssues(issues: unknown): AppIssueV11[] {
  if (!Array.isArray(issues)) {
    return [];
  }
  return issues.map((issue) => {
    if (!issue || typeof issue !== "object") {
      return createAppIssue({
        code: "UNKNOWN",
        message: String(issue ?? "Unknown issue"),
      });
    }
    const issueRecord = issue as Record<string, unknown>;
    return createAppIssue({
      code: String(issueRecord.code ?? "UNKNOWN"),
      message: String(issueRecord.message ?? "Unknown issue"),
      severity: isAppIssueSeverity(issueRecord.severity)
        ? issueRecord.severity
        : undefined,
      field:
        typeof issueRecord.field === "string" ? issueRecord.field : undefined,
    });
  });
}
