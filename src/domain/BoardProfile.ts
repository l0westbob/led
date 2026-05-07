import type {
  BoardDefinition,
  BoardEmitter,
  LegacyBoardEmitter,
} from "@/domain/contracts";

type BoardProfileInput = Partial<BoardDefinition> & {
  spacingMm?: number;
  emitters?: Array<BoardEmitter | LegacyBoardEmitter>;
};

/**
 * Domain model for a board configuration.
 * The class normalizes user input and owns emitter generation rules.
 */
export class BoardProfile {
  id: string;
  name: string;
  ledType: string;
  emitters: Array<BoardEmitter | LegacyBoardEmitter>;
  widthMm: number;
  depthMm: number;
  ledCount: number;
  columns: number;
  rows: number;
  spacingXMm: number;
  spacingYMm: number;
  voltageV: number;
  currentA: number;
  temperatureC: number;
  seriesCount: number;
  parallelCount: number;
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
  boardSchemaVersion: string;
  simulationContextVersion: string;

  constructor(input: BoardProfileInput = {}) {
    this.id = input.id ?? "";
    this.name = input.name ?? "Untitled Board";
    this.ledType = input.ledType ?? "lm301h";
    this.emitters = Array.isArray(input.emitters) ? input.emitters : [];
    this.widthMm = sanitizeNumber(input.widthMm, 500);
    this.depthMm = sanitizeNumber(input.depthMm, 300);
    this.ledCount = sanitizeInteger(input.ledCount, 288);
    this.columns = sanitizeInteger(input.columns, 24);
    this.rows = sanitizeInteger(input.rows, 12);
    const legacySpacing = sanitizeNumber(input.spacingMm, 18);
    this.spacingXMm = sanitizeNumber(input.spacingXMm, legacySpacing);
    this.spacingYMm = sanitizeNumber(input.spacingYMm, legacySpacing);
    this.voltageV = sanitizeNumber(input.voltageV, 48);
    this.currentA = sanitizeNumber(input.currentA, 2.1);
    this.temperatureC = sanitizeNumber(input.temperatureC, 32);
    this.seriesCount = sanitizeInteger(input.seriesCount, 0);
    this.parallelCount = sanitizeInteger(input.parallelCount, 0);
    this.distanceCm = sanitizeNumberRange(input.distanceCm, 35, 1, 100);
    this.roomWidthCm = sanitizeNumber(input.roomWidthCm, 120);
    this.roomDepthCm = sanitizeNumber(input.roomDepthCm, 120);
    this.photoperiodHours = sanitizeNumberRange(
      input.photoperiodHours,
      12,
      0,
      24,
    );
    this.boardCount = sanitizeInteger(input.boardCount, 1);
    this.boardSpacingCm = sanitizeNumberRange(input.boardSpacingCm, 20, 0, 300);

    // Explicit fixture grid (multi-board placement). When set, this overrides
    // the auto-square layout and the legacy boardCount/boardSpacingCm usage.
    this.fixtureColumns = sanitizeInteger(input.fixtureColumns, 0);
    this.fixtureRows = sanitizeInteger(input.fixtureRows, 0);
    const legacyFixtureSpacing = this.boardSpacingCm;
    this.fixtureSpacingXCm = sanitizeNumberRange(
      input.fixtureSpacingXCm,
      legacyFixtureSpacing,
      0,
      300,
    );
    this.fixtureSpacingYCm = sanitizeNumberRange(
      input.fixtureSpacingYCm,
      legacyFixtureSpacing,
      0,
      300,
    );
    this.boardSchemaVersion = input.boardSchemaVersion ?? "1.1";
    this.simulationContextVersion = input.simulationContextVersion ?? "1.1";

    if (this.fixtureColumns > 0 && this.fixtureRows > 0) {
      this.boardCount = Math.max(1, this.fixtureColumns * this.fixtureRows);
    }
  }

  toJSON(): BoardDefinition {
    return {
      id: this.id,
      name: this.name,
      ledType: this.ledType,
      emitters: this.emitters,
      widthMm: this.widthMm,
      depthMm: this.depthMm,
      ledCount: this.ledCount,
      columns: this.columns,
      rows: this.rows,
      spacingXMm: this.spacingXMm,
      spacingYMm: this.spacingYMm,
      voltageV: this.voltageV,
      currentA: this.currentA,
      temperatureC: this.temperatureC,
      seriesCount: this.seriesCount,
      parallelCount: this.parallelCount,
      distanceCm: this.distanceCm,
      roomWidthCm: this.roomWidthCm,
      roomDepthCm: this.roomDepthCm,
      photoperiodHours: this.photoperiodHours,
      boardCount: this.boardCount,
      boardSpacingCm: this.boardSpacingCm,
      fixtureColumns: this.fixtureColumns,
      fixtureRows: this.fixtureRows,
      fixtureSpacingXCm: this.fixtureSpacingXCm,
      fixtureSpacingYCm: this.fixtureSpacingYCm,
      boardSchemaVersion: this.boardSchemaVersion,
      simulationContextVersion: this.simulationContextVersion,
    };
  }

  /**
   * Uses explicit emitters when available, otherwise generates a regular grid.
   */
  generateEmitters(): LegacyBoardEmitter[] {
    if (this.emitters.length > 0) {
      return this.emitters.map((emitter) => ({
        xMm: sanitizeNumber(emitter.xMm, 0),
        yMm: sanitizeNumber(emitter.yMm, 0),
        type: emitter.ledType ?? emitter.type ?? this.ledType,
      }));
    }

    const layoutWidth = (this.columns - 1) * this.spacingXMm;
    const layoutDepth = (this.rows - 1) * this.spacingYMm;
    const offsetX = (this.widthMm - layoutWidth) / 2;
    const offsetY = (this.depthMm - layoutDepth) / 2;
    const emitters: LegacyBoardEmitter[] = [];

    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        emitters.push({
          xMm: offsetX + column * this.spacingXMm,
          yMm: offsetY + row * this.spacingYMm,
          type: this.ledType,
        });
      }
    }

    return emitters.slice(0, Math.max(1, this.ledCount));
  }
}

function sanitizeNumber(value: unknown, fallback: number) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function sanitizeInteger(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeNumberRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}
