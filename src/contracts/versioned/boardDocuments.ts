import {
  BOARD_SCHEMA_VERSION,
  SIMULATION_CONTEXT_VERSION,
} from "@/contracts/versioned/contractVersions";

export type DefaultDriveTemplate = {
  driveMode: "constantVoltage" | "constantCurrent";
  voltageV: number;
  currentA: number;
  temperatureC: number;
};

export type BoardEmitterDocument = {
  documentType: "BoardEmitterDocument";
  id: string;
  xMm: number;
  yMm: number;
  ledType: string;
  type?: string;
  drive: DefaultDriveTemplate;
};

export type BoardDefinitionDocument = {
  documentType: "BoardDefinitionDocument";
  boardSchemaVersion: string;
  simulationContextVersion: string;
  definition: {
    id: string;
    name: string;
    ledType: string;
    widthMm: number;
    depthMm: number;
    ledCount: number;
    columns: number;
    rows: number;
    spacingXMm: number;
    spacingYMm: number;
    seriesCount: number;
    parallelCount: number;
  };
  simulationContext: {
    distanceCm: number;
    roomWidthCm: number;
    roomDepthCm: number;
    photoperiodHours: number;
    boardCount: number;
    boardSpacingCm: number;
    fixtureColumns: number;
    fixtureRows: number;
    fixtureSpacingXCm: number;
    fixtureSpacingYCm: number;
  };
  defaultDriveTemplate: DefaultDriveTemplate;
  emitters: BoardEmitterDocument[];
};

/**
 * @returns {DefaultDriveTemplate}
 */
export function createDefaultDriveTemplate(): DefaultDriveTemplate {
  return {
    driveMode: "constantVoltage",
    voltageV: 2.7,
    currentA: 0.065,
    temperatureC: 25,
  };
}

/**
 * @param {Partial<DefaultDriveTemplate>} source
 * @returns {DefaultDriveTemplate}
 */
export function normalizeDefaultDriveTemplate(
  source: Partial<DefaultDriveTemplate> = {},
): DefaultDriveTemplate {
  return {
    driveMode:
      source.driveMode === "constantCurrent"
        ? "constantCurrent"
        : "constantVoltage",
    voltageV: Number(source.voltageV) || 2.7,
    currentA: Number(source.currentA) || 0.065,
    temperatureC: Number(source.temperatureC) || 25,
  };
}

/**
 * @param {Partial<BoardEmitterDocument>} source
 * @param {DefaultDriveTemplate} fallbackDriveTemplate
 * @param {number} index
 * @returns {BoardEmitterDocument}
 */
export function normalizeBoardEmitterDocument(
  source: Partial<BoardEmitterDocument> & { type?: string },
  fallbackDriveTemplate: DefaultDriveTemplate,
  index: number,
): BoardEmitterDocument {
  const legacyLedType = source?.ledType ?? source?.type ?? "";
  const legacyDrive = source?.drive ?? {};
  return {
    documentType: "BoardEmitterDocument",
    id: source?.id ?? `emitter-${index + 1}`,
    xMm: Number(source?.xMm) || 0,
    yMm: Number(source?.yMm) || 0,
    ledType: String(legacyLedType),
    drive: normalizeDefaultDriveTemplate({
      ...fallbackDriveTemplate,
      ...legacyDrive,
    }),
  };
}

/**
 * @param {{
 *   definition: BoardDefinitionDocument["definition"],
 *   simulationContext: BoardDefinitionDocument["simulationContext"],
 *   defaultDriveTemplate: DefaultDriveTemplate,
 *   emitters: BoardEmitterDocument[]
 * }} input
 * @returns {BoardDefinitionDocument}
 */
export function createBoardDefinitionDocument(input: {
  definition: BoardDefinitionDocument["definition"];
  simulationContext: BoardDefinitionDocument["simulationContext"];
  defaultDriveTemplate: DefaultDriveTemplate;
  emitters: BoardEmitterDocument[];
}): BoardDefinitionDocument {
  return {
    documentType: "BoardDefinitionDocument",
    boardSchemaVersion: BOARD_SCHEMA_VERSION,
    simulationContextVersion: SIMULATION_CONTEXT_VERSION,
    definition: input.definition,
    simulationContext: input.simulationContext,
    defaultDriveTemplate: normalizeDefaultDriveTemplate(
      input.defaultDriveTemplate,
    ),
    emitters: input.emitters.map((emitter, index) =>
      normalizeBoardEmitterDocument(emitter, input.defaultDriveTemplate, index),
    ),
  };
}
