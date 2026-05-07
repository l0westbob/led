import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { createAppIssue } from "@/contracts/versioned/issues";
import {
  createBoardDefinitionDocument,
  normalizeBoardEmitterDocument,
  normalizeDefaultDriveTemplate,
} from "@/contracts/versioned/boardDocuments";
import type { AppIssueV11 } from "@/contracts/versioned/issues";
import type {
  BoardDefinitionDocument,
  BoardEmitterDocument,
  DefaultDriveTemplate,
} from "@/contracts/versioned/boardDocuments";
import type { BoardDefinition } from "@/domain/contracts";

type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike {
  return value && typeof value === "object" ? (value as RecordLike) : {};
}

/**
 * Serialize a normalized runtime board definition into the v1.1 persisted
 * board-document format.
 *
 * @param {Partial<BoardDefinition>} runtimeBoard
 * @returns {BoardDefinitionDocument}
 */
export function serializeBoardDefinitionDocument(
  runtimeBoard: Partial<BoardDefinition>,
): BoardDefinitionDocument {
  const normalizedBoard = normalizeBoardDefinition(runtimeBoard);
  const defaultDriveTemplate = normalizeDefaultDriveTemplate({
    driveMode: "constantVoltage",
    voltageV: normalizedBoard.voltageV,
    currentA: normalizedBoard.currentA,
    temperatureC: normalizedBoard.temperatureC,
  });
  const normalizedEmitterDocuments = (
    Array.isArray(normalizedBoard.emitters) ? normalizedBoard.emitters : []
  ).map((emitter, emitterIndex) =>
    normalizeBoardEmitterDocument(
      emitter as Partial<BoardEmitterDocument>,
      (emitter?.drive as DefaultDriveTemplate | undefined) ??
        defaultDriveTemplate,
      emitterIndex,
    ),
  );

  return createBoardDefinitionDocument({
    definition: {
      id: normalizedBoard.id,
      name: normalizedBoard.name,
      ledType: normalizedBoard.ledType,
      widthMm: normalizedBoard.widthMm,
      depthMm: normalizedBoard.depthMm,
      ledCount: normalizedBoard.ledCount,
      columns: normalizedBoard.columns,
      rows: normalizedBoard.rows,
      spacingXMm: normalizedBoard.spacingXMm,
      spacingYMm: normalizedBoard.spacingYMm,
      seriesCount: normalizedBoard.seriesCount,
      parallelCount: normalizedBoard.parallelCount,
    },
    simulationContext: {
      distanceCm: normalizedBoard.distanceCm,
      roomWidthCm: normalizedBoard.roomWidthCm,
      roomDepthCm: normalizedBoard.roomDepthCm,
      photoperiodHours: normalizedBoard.photoperiodHours,
      boardCount: normalizedBoard.boardCount,
      boardSpacingCm: normalizedBoard.boardSpacingCm,
      fixtureColumns: normalizedBoard.fixtureColumns,
      fixtureRows: normalizedBoard.fixtureRows,
      fixtureSpacingXCm: normalizedBoard.fixtureSpacingXCm,
      fixtureSpacingYCm: normalizedBoard.fixtureSpacingYCm,
    },
    defaultDriveTemplate,
    emitters: normalizedEmitterDocuments,
  });
}

/**
 * Deserialize any persisted board-like payload into runtime board shape. This
 * accepts both legacy flat board records and v1.1 board documents.
 *
 * @param {unknown} persistedValue
 * @returns {{ board: BoardDefinition, warnings: import("@/contracts/versioned/issues").AppIssueV11[] }}
 */
export function deserializeBoardDefinitionDocument(persistedValue: unknown): {
  board: BoardDefinition;
  warnings: AppIssueV11[];
} {
  const fallbackBoard = normalizeBoardDefinition({});
  if (!persistedValue || typeof persistedValue !== "object") {
    return { board: fallbackBoard, warnings: [] };
  }

  const rawDocument = asRecord(persistedValue);
  const isV11Document =
    rawDocument.documentType === "BoardDefinitionDocument" &&
    rawDocument.definition &&
    typeof rawDocument.definition === "object";

  if (!isV11Document) {
    return {
      board: normalizeBoardDefinition(rawDocument),
      warnings: [
        createAppIssue({
          code: "MIGRATED_LEGACY_BOARD_DOCUMENT",
          message:
            "Legacy board entry was migrated in-memory to the v1.1 document contract.",
          severity: "info",
        }),
      ],
    };
  }

  const rawDefinition = asRecord(rawDocument.definition);
  const rawContext = asRecord(rawDocument.simulationContext);
  const defaultDriveTemplate = normalizeDefaultDriveTemplate(
    asRecord(rawDocument.defaultDriveTemplate) as Partial<DefaultDriveTemplate>,
  );
  const rawEmitters = Array.isArray(rawDocument.emitters)
    ? rawDocument.emitters
    : [];
  const normalizedEmitters = rawEmitters.map((rawEmitter, emitterIndex) =>
    normalizeBoardEmitterDocument(
      asRecord(rawEmitter) as Partial<BoardEmitterDocument>,
      defaultDriveTemplate,
      emitterIndex,
    ),
  );

  return {
    board: normalizeBoardDefinition({
      id: rawDefinition.id,
      name: rawDefinition.name,
      ledType: rawDefinition.ledType,
      emitters: normalizedEmitters,
      widthMm: rawDefinition.widthMm,
      depthMm: rawDefinition.depthMm,
      ledCount: rawDefinition.ledCount,
      columns: rawDefinition.columns,
      rows: rawDefinition.rows,
      spacingXMm: rawDefinition.spacingXMm,
      spacingYMm: rawDefinition.spacingYMm,
      voltageV: defaultDriveTemplate.voltageV,
      currentA: defaultDriveTemplate.currentA,
      temperatureC: defaultDriveTemplate.temperatureC,
      seriesCount: rawDefinition.seriesCount,
      parallelCount: rawDefinition.parallelCount,
      distanceCm: rawContext.distanceCm,
      roomWidthCm: rawContext.roomWidthCm,
      roomDepthCm: rawContext.roomDepthCm,
      photoperiodHours: rawContext.photoperiodHours,
      boardCount: rawContext.boardCount,
      boardSpacingCm: rawContext.boardSpacingCm,
      fixtureColumns: rawContext.fixtureColumns,
      fixtureRows: rawContext.fixtureRows,
      fixtureSpacingXCm: rawContext.fixtureSpacingXCm,
      fixtureSpacingYCm: rawContext.fixtureSpacingYCm,
    } as Partial<BoardDefinition>),
    warnings: [],
  };
}

/**
 * Deserialize a persisted board collection and aggregate migration warnings.
 *
 * @param {Array<unknown>} persistedCollection
 * @returns {{
 *   boards: BoardDefinition[],
 *   warnings: import("@/contracts/versioned/issues").AppIssueV11[]
 * }}
 */
export function deserializeBoardDefinitionCollection(
  persistedCollection: unknown[],
): {
  boards: BoardDefinition[];
  warnings: AppIssueV11[];
} {
  if (!Array.isArray(persistedCollection)) {
    return { boards: [], warnings: [] };
  }

  const boards: BoardDefinition[] = [];
  const warnings: AppIssueV11[] = [];
  for (const persistedEntry of persistedCollection) {
    const parsedEntry = deserializeBoardDefinitionDocument(persistedEntry);
    boards.push(parsedEntry.board);
    warnings.push(...parsedEntry.warnings);
  }
  return { boards, warnings };
}

/**
 * Serialize a runtime board collection into v1.1 documents.
 *
 * @param {Array<Partial<BoardDefinition>>} boards
 * @returns {BoardDefinitionDocument[]}
 */
export function serializeBoardDefinitionCollection(
  boards: Array<Partial<BoardDefinition>>,
): BoardDefinitionDocument[] {
  if (!Array.isArray(boards)) {
    return [];
  }
  return boards.map((board) => serializeBoardDefinitionDocument(board));
}

/**
 * Build an empty board document used by migration fallback paths.
 *
 * @returns {BoardDefinitionDocument}
 */
export function createEmptyBoardDefinitionDocument() {
  return serializeBoardDefinitionDocument(normalizeBoardDefinition({}));
}
