import { listLedDefinitions } from "@/catalog/ledCatalog";
import type {
  BoardDefinition,
  BoardEmitter,
  BoardEmitterDrive,
  LegacyBoardEmitter,
} from "@/domain/contracts";

const KNOWN_LED_DEFINITIONS = listLedDefinitions();
const LED_DEFINITION_BY_ID = new Map(
  KNOWN_LED_DEFINITIONS.map((ledDefinition) => [
    ledDefinition.id,
    ledDefinition,
  ]),
);

function resolveReferenceDriveForLed(ledType: string): BoardEmitterDrive {
  const ledDefinition = LED_DEFINITION_BY_ID.get(ledType);
  const referenceCurrentMA = Number(ledDefinition?.reference?.currentMA) || 65;
  const referenceForwardVoltageV =
    Number(ledDefinition?.reference?.forwardVoltageV) || 2.7;

  return {
    driveMode: "constantVoltage",
    voltageV: referenceForwardVoltageV,
    currentA: referenceCurrentMA / 1000,
    temperatureC: Number(ledDefinition?.reference?.solderPointTempC) || 25,
    seriesCount: 1,
    parallelCount: 1,
  };
}

function normalizeEmitterLedType(
  emitter: BoardEmitter | LegacyBoardEmitter,
  fallbackLedType: string,
) {
  const ledType = emitter.ledType ?? emitter.type ?? fallbackLedType;
  const known = new Set(listLedDefinitions().map((led) => led.id));
  return known.has(ledType) ? ledType : fallbackLedType;
}

function positionKey(xMm: number, yMm: number) {
  return `${Math.round(Number(xMm) || 0)}:${Math.round(Number(yMm) || 0)}`;
}

/**
 * Normalize board emitters into enriched per-emitter records.
 *
 * @param {import("@/domain/contracts").BoardDefinition} board
 * @returns {Array<import("@/domain/contracts").BoardEmitter>}
 */
export function normalizeBoardPlannerEmitters(
  board: BoardDefinition,
): BoardEmitter[] {
  const emitters = Array.isArray(board.emitters) ? board.emitters : [];

  return emitters.map((emitter, index) => {
    const emitterDrive = emitter.drive ?? {};
    const normalizedLedType = normalizeEmitterLedType(emitter, board.ledType);
    const ledReferenceDrive = resolveReferenceDriveForLed(normalizedLedType);

    return {
      id: emitter.id ?? `emitter-${index + 1}`,
      xMm: Number(emitter.xMm) || 0,
      yMm: Number(emitter.yMm) || 0,
      ledType: normalizedLedType,
      drive: {
        ...ledReferenceDrive,
        ...emitterDrive,
        driveMode:
          emitterDrive.driveMode === "constantCurrent"
            ? "constantCurrent"
            : "constantVoltage",
        voltageV:
          Number(emitterDrive.voltageV ?? ledReferenceDrive.voltageV) ||
          ledReferenceDrive.voltageV,
        currentA:
          Number(emitterDrive.currentA ?? ledReferenceDrive.currentA) ||
          ledReferenceDrive.currentA,
        temperatureC:
          Number(emitterDrive.temperatureC ?? ledReferenceDrive.temperatureC) ||
          ledReferenceDrive.temperatureC,
        seriesCount: 1,
        parallelCount: 1,
      },
    };
  });
}

/**
 * Generate emitter grid layout from board geometry fields.
 *
 * @param {import("@/domain/contracts").BoardDefinition} board
 * @returns {Array<import("@/domain/contracts").BoardEmitter>}
 */
export function generateBoardPlannerEmitterGrid(
  board: BoardDefinition,
): BoardEmitter[] {
  const columns = Math.max(1, Math.floor(Number(board.columns) || 1));
  const rows = Math.max(1, Math.floor(Number(board.rows) || 1));
  const ledCount = Math.max(1, Math.floor(Number(board.ledCount) || 1));
  const spacingXMm = Number(board.spacingXMm) || 18;
  const spacingYMm = Number(board.spacingYMm) || 18;

  const layoutWidth = (columns - 1) * spacingXMm;
  const layoutDepth = (rows - 1) * spacingYMm;
  const offsetX = (Number(board.widthMm) - layoutWidth) / 2;
  const offsetY = (Number(board.depthMm) - layoutDepth) / 2;
  const drive = resolveReferenceDriveForLed(board.ledType);

  const emitters: BoardEmitter[] = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      emitters.push({
        id: `emitter-${emitters.length + 1}`,
        xMm: offsetX + columnIndex * spacingXMm,
        yMm: offsetY + rowIndex * spacingYMm,
        ledType: board.ledType,
        drive: { ...drive },
      });
    }
  }

  return emitters.slice(0, ledCount);
}

/**
 * Regenerate board emitters from current grid parameters while preserving
 * per-emitter overrides where positions match.
 *
 * @param {import("@/domain/contracts").BoardDefinition} board
 * @returns {Array<import("@/domain/contracts").BoardEmitter>}
 */
export function regenerateBoardPlannerEmitters(
  board: BoardDefinition,
): BoardEmitter[] {
  const nextGridEmitters = generateBoardPlannerEmitterGrid(board);
  const currentEmitters = normalizeBoardPlannerEmitters(board);
  const byPosition = new Map(
    currentEmitters.map((emitter) => [
      positionKey(emitter.xMm, emitter.yMm),
      emitter,
    ]),
  );
  const byIndex = new Map(
    currentEmitters.map((emitter, index) => [index, emitter]),
  );

  return nextGridEmitters.map((emitter, index) => {
    const existingEmitter = byPosition.get(
      positionKey(emitter.xMm, emitter.yMm),
    );
    const fallbackEmitter = byIndex.get(index);
    const preservedEmitter = existingEmitter ?? fallbackEmitter;
    if (!preservedEmitter) {
      return emitter;
    }
    return {
      ...emitter,
      ledType: preservedEmitter.ledType,
      drive: { ...preservedEmitter.drive },
    };
  });
}

/**
 * Reset all emitters to board default LED type + board default drive.
 *
 * @param {import("@/domain/contracts").BoardDefinition} board
 * @returns {Array<import("@/domain/contracts").BoardEmitter>}
 */
export function resetBoardPlannerEmittersToDefault(
  board: BoardDefinition,
): BoardEmitter[] {
  const baseDrive = resolveReferenceDriveForLed(board.ledType);
  return normalizeBoardPlannerEmitters(board).map((emitter, index) => ({
    id: emitter.id ?? `emitter-${index + 1}`,
    xMm: emitter.xMm,
    yMm: emitter.yMm,
    ledType: board.ledType,
    drive: { ...baseDrive },
  }));
}
