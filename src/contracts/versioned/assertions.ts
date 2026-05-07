import { createAppIssue } from "@/contracts/versioned/issues";
import type { AppIssueV11 } from "@/contracts/versioned/issues";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireFiniteNumber(
  value: unknown,
  field: string,
  issues: AppIssueV11[],
) {
  if (!Number.isFinite(Number(value))) {
    issues.push(
      createAppIssue({
        code: "CONTRACT_NUMBER_INVALID",
        message: `${field} must be a finite number.`,
        severity: "error",
        field,
      }),
    );
  }
}

function requireString(value: unknown, field: string, issues: AppIssueV11[]) {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(
      createAppIssue({
        code: "CONTRACT_STRING_INVALID",
        message: `${field} must be a non-empty string.`,
        severity: "error",
        field,
      }),
    );
  }
}

/**
 * Validate a persisted board-emitter document.
 *
 * @param {unknown} document
 * @returns {import("@/contracts/versioned/issues").AppIssueV11[]}
 */
export function assertBoardEmitterDocument(document: unknown): AppIssueV11[] {
  const issues: AppIssueV11[] = [];
  if (!isObject(document)) {
    return [
      createAppIssue({
        code: "BOARD_EMITTER_DOCUMENT_INVALID",
        message: "Board emitter document must be an object.",
        severity: "error",
        field: "emitters",
      }),
    ];
  }

  if (document.documentType !== "BoardEmitterDocument") {
    issues.push(
      createAppIssue({
        code: "BOARD_EMITTER_DOCUMENT_TYPE_INVALID",
        message: "Board emitter documentType must be BoardEmitterDocument.",
        severity: "error",
        field: "emitters.documentType",
      }),
    );
  }
  requireString(document.id, "emitters.id", issues);
  requireString(document.ledType, "emitters.ledType", issues);
  requireFiniteNumber(document.xMm, "emitters.xMm", issues);
  requireFiniteNumber(document.yMm, "emitters.yMm", issues);

  if (!isObject(document.drive)) {
    issues.push(
      createAppIssue({
        code: "BOARD_EMITTER_DRIVE_INVALID",
        message: "Board emitter drive must be an object.",
        severity: "error",
        field: "emitters.drive",
      }),
    );
    return issues;
  }

  requireFiniteNumber(
    document.drive.voltageV,
    "emitters.drive.voltageV",
    issues,
  );
  requireFiniteNumber(
    document.drive.currentA,
    "emitters.drive.currentA",
    issues,
  );
  requireFiniteNumber(
    document.drive.temperatureC,
    "emitters.drive.temperatureC",
    issues,
  );
  if (
    typeof document.drive.driveMode !== "string" ||
    !["constantVoltage", "constantCurrent"].includes(document.drive.driveMode)
  ) {
    issues.push(
      createAppIssue({
        code: "BOARD_EMITTER_DRIVE_MODE_INVALID",
        message:
          "Board emitter drive mode must be constantVoltage or constantCurrent.",
        severity: "error",
        field: "emitters.drive.driveMode",
      }),
    );
  }
  return issues;
}

/**
 * Validate a v1.1 board definition document.
 *
 * @param {unknown} document
 * @returns {import("@/contracts/versioned/issues").AppIssueV11[]}
 */
export function assertBoardDefinitionDocument(
  document: unknown,
): AppIssueV11[] {
  const issues: AppIssueV11[] = [];
  if (!isObject(document)) {
    return [
      createAppIssue({
        code: "BOARD_DEFINITION_DOCUMENT_INVALID",
        message: "Board definition document must be an object.",
        severity: "error",
        field: "boards",
      }),
    ];
  }

  if (document.documentType !== "BoardDefinitionDocument") {
    issues.push(
      createAppIssue({
        code: "BOARD_DEFINITION_DOCUMENT_TYPE_INVALID",
        message:
          "Board definition documentType must be BoardDefinitionDocument.",
        severity: "error",
        field: "documentType",
      }),
    );
  }
  requireString(document.boardSchemaVersion, "boardSchemaVersion", issues);
  requireString(
    document.simulationContextVersion,
    "simulationContextVersion",
    issues,
  );

  if (!isObject(document.definition)) {
    issues.push(
      createAppIssue({
        code: "BOARD_DEFINITION_INVALID",
        message: "Board definition payload must be an object.",
        severity: "error",
        field: "definition",
      }),
    );
  } else {
    requireString(document.definition.id, "definition.id", issues);
    requireString(document.definition.name, "definition.name", issues);
    requireString(document.definition.ledType, "definition.ledType", issues);
    for (const field of [
      "widthMm",
      "depthMm",
      "ledCount",
      "columns",
      "rows",
      "spacingXMm",
      "spacingYMm",
      "seriesCount",
      "parallelCount",
    ]) {
      requireFiniteNumber(
        document.definition[field],
        `definition.${field}`,
        issues,
      );
    }
  }

  if (!isObject(document.simulationContext)) {
    issues.push(
      createAppIssue({
        code: "BOARD_SIMULATION_CONTEXT_INVALID",
        message: "Board simulation context must be an object.",
        severity: "error",
        field: "simulationContext",
      }),
    );
  }

  if (!isObject(document.defaultDriveTemplate)) {
    issues.push(
      createAppIssue({
        code: "BOARD_DEFAULT_DRIVE_INVALID",
        message: "Board default drive template must be an object.",
        severity: "error",
        field: "defaultDriveTemplate",
      }),
    );
  }

  if (!Array.isArray(document.emitters)) {
    issues.push(
      createAppIssue({
        code: "BOARD_EMITTERS_INVALID",
        message: "Board emitters must be an array.",
        severity: "error",
        field: "emitters",
      }),
    );
  } else {
    for (const emitter of document.emitters) {
      issues.push(...assertBoardEmitterDocument(emitter));
    }
  }

  return issues;
}

/**
 * Validate an exported board-definition document collection.
 *
 * @param {unknown} collection
 * @returns {import("@/contracts/versioned/issues").AppIssueV11[]}
 */
export function assertBoardDefinitionDocumentCollection(
  collection: unknown,
): AppIssueV11[] {
  const issues: AppIssueV11[] = [];
  if (!isObject(collection)) {
    return [
      createAppIssue({
        code: "BOARD_COLLECTION_INVALID",
        message: "Board collection must be an object.",
        severity: "error",
        field: "payload",
      }),
    ];
  }

  if (collection.schema !== "BoardDefinitionDocumentCollection") {
    issues.push(
      createAppIssue({
        code: "BOARD_COLLECTION_SCHEMA_INVALID",
        message:
          "Board collection schema must be BoardDefinitionDocumentCollection.",
        severity: "error",
        field: "schema",
      }),
    );
  }
  requireString(collection.schemaVersion, "schemaVersion", issues);
  requireString(collection.exportedAtIso, "exportedAtIso", issues);
  requireFiniteNumber(collection.boardCount, "boardCount", issues);

  if (!Array.isArray(collection.boards)) {
    issues.push(
      createAppIssue({
        code: "BOARD_COLLECTION_BOARDS_INVALID",
        message: "Board collection boards must be an array.",
        severity: "error",
        field: "boards",
      }),
    );
    return issues;
  }

  const seenIds = new Set<string>();
  collection.boards.forEach((boardDocument, boardIndex) => {
    const boardIssues = assertBoardDefinitionDocument(boardDocument);
    issues.push(
      ...boardIssues.map((issue) => ({
        ...issue,
        field: `boards.${boardIndex}.${issue.field ?? "document"}`,
      })),
    );
    const boardRecord = isObject(boardDocument) ? boardDocument : {};
    const definitionRecord = isObject(boardRecord.definition)
      ? boardRecord.definition
      : {};
    const boardId = definitionRecord.id;
    if (typeof boardId !== "string") return;
    if (seenIds.has(boardId)) {
      issues.push(
        createAppIssue({
          code: "BOARD_COLLECTION_DUPLICATE_ID",
          message: `Board collection contains duplicate board id: ${boardId}.`,
          severity: "error",
          field: `boards.${boardIndex}.definition.id`,
        }),
      );
    }
    seenIds.add(boardId);
  });

  return issues;
}

/**
 * Validate a standardized operation result envelope.
 *
 * @param {unknown} result
 * @returns {import("@/contracts/versioned/issues").AppIssueV11[]}
 */
export function assertOperationResult(result: unknown): AppIssueV11[] {
  const issues: AppIssueV11[] = [];
  if (!isObject(result)) {
    return [
      createAppIssue({
        code: "OPERATION_RESULT_INVALID",
        message: "Operation result must be an object.",
        severity: "error",
      }),
    ];
  }

  if (typeof result.ok !== "boolean") {
    issues.push(
      createAppIssue({
        code: "OPERATION_RESULT_OK_INVALID",
        message: "Operation result ok must be boolean.",
        severity: "error",
        field: "ok",
      }),
    );
  }
  if (!Array.isArray(result.warnings)) {
    issues.push(
      createAppIssue({
        code: "OPERATION_RESULT_WARNINGS_INVALID",
        message: "Operation result warnings must be an array.",
        severity: "error",
        field: "warnings",
      }),
    );
  }
  if (!Array.isArray(result.errors)) {
    issues.push(
      createAppIssue({
        code: "OPERATION_RESULT_ERRORS_INVALID",
        message: "Operation result errors must be an array.",
        severity: "error",
        field: "errors",
      }),
    );
  }
  requireString(result.contractVersion, "contractVersion", issues);
  return issues;
}

/**
 * Validate the planner summary fields consumed by UI and baselines.
 *
 * @param {unknown} summary
 * @returns {import("@/contracts/versioned/issues").AppIssueV11[]}
 */
export function assertPlannerSnapshotSummary(summary: unknown): AppIssueV11[] {
  const issues: AppIssueV11[] = [];
  if (!isObject(summary)) {
    return [
      createAppIssue({
        code: "PLANNER_SUMMARY_INVALID",
        message: "Planner summary must be an object.",
        severity: "error",
        field: "summary",
      }),
    ];
  }
  for (const field of [
    "average",
    "min",
    "max",
    "gridWidth",
    "gridDepth",
    "inputPower",
    "boardPhotonFlux",
    "fixtureCount",
    "sourceCount",
    "calculationMs",
  ]) {
    requireFiniteNumber(summary[field], `summary.${field}`, issues);
  }
  return issues;
}
