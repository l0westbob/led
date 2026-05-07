import { CONTRACT_ENVELOPE_VERSION } from "@/contracts/versioned/contractVersions";
import {
  normalizeAppIssues,
  type AppIssueV11,
} from "@/contracts/versioned/issues";

export type OperationResultV11<TData = unknown> = {
  ok: boolean;
  data?: TData;
  warnings: AppIssueV11[];
  errors: AppIssueV11[];
  contractVersion: string;
};

type ResultInput<TData = unknown> = {
  data?: TData;
  warnings?: unknown;
  errors?: unknown;
};

export type SnapshotEnvelope<TData = unknown> = {
  data: TData;
  warnings: AppIssueV11[];
  errors: AppIssueV11[];
  timings: Record<string, number>;
  contractVersion: string;
};

export function createSuccessResult<TData = unknown>(
  input: ResultInput<TData> = {},
): OperationResultV11<TData> {
  return {
    ok: true,
    ...(Object.hasOwn(input, "data") ? { data: input.data } : {}),
    warnings: normalizeAppIssues(input.warnings),
    errors: [],
    contractVersion: CONTRACT_ENVELOPE_VERSION,
  };
}

export function createFailureResult<TData = unknown>(
  input: ResultInput<TData> = {},
): OperationResultV11<TData> {
  return {
    ok: false,
    ...(Object.hasOwn(input, "data") ? { data: input.data } : {}),
    warnings: normalizeAppIssues(input.warnings),
    errors: normalizeAppIssues(input.errors),
    contractVersion: CONTRACT_ENVELOPE_VERSION,
  };
}

export function createSnapshotEnvelope<TData>(input: {
  data: TData;
  warnings?: unknown;
  errors?: unknown;
  timings?: Record<string, number>;
}): SnapshotEnvelope<TData> {
  return {
    data: input.data,
    warnings: normalizeAppIssues(input.warnings),
    errors: normalizeAppIssues(input.errors),
    timings: input.timings ?? {},
    contractVersion: CONTRACT_ENVELOPE_VERSION,
  };
}
