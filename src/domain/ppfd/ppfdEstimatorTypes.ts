import type { BoardDefinition } from "@/domain/contracts";

export type PpfdBoard = Pick<
  BoardDefinition,
  | "widthMm"
  | "depthMm"
  | "voltageV"
  | "currentA"
  | "distanceCm"
  | "roomWidthCm"
  | "roomDepthCm"
  | "boardCount"
  | "boardSpacingCm"
  | "fixtureColumns"
  | "fixtureRows"
  | "fixtureSpacingXCm"
  | "fixtureSpacingYCm"
>;

export type PpfdEmitter = {
  xMm: number;
  yMm: number;
  type?: string;
  ledType?: string;
};

export type EstimatorOptions = {
  boardPhotonFlux?: number;
  inputPowerW?: number;
  fixtureOffsetsMm?: Array<{ xMm: number; yMm: number }>;
};

export type SourceBins = {
  xCell: Float32Array;
  yCell: Float32Array;
  weight: Uint32Array;
  count: number;
  sourceBinCells: number;
};

export type SourceCache = {
  emitters: PpfdEmitter[];
  key: string;
  result: SourceBins;
};

export type PpfdGeometryEstimate = {
  values: Float32Array;
  valuesUnits: Uint32Array;
  valueScale: number;
  averageUnits: number;
  minUnits: number;
  maxUnits: number;
  gridWidth: number;
  gridDepth: number;
  average: number;
  min: number;
  max: number;
  inputPower: number;
  boardPhotonFlux: number;
  fixtureCount: number;
  cellCount: number;
  sourceCount: number;
  sourceBinCells: number;
};
