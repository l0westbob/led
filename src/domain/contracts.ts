/**
 * Shared public contracts for the LED planner's domain and application
 * boundaries. These are compile-time-only shapes; runtime validation stays in
 * the versioned contract and board-library modules.
 */

export type SpectralSeries = {
  id: string;
  wavelengthNm: number[];
  intensityRel: number[];
  stepNm: 1 | 5;
  normalization: string;
  source: string;
};

export type SpectrumCalibration = {
  currentMA: number;
  solderPointTempC: number;
  luminousFluxLm?: number;
  ppfUmolS?: number;
  source: string;
  note?: string;
};

export type NumericCurvePoint = [number, number];

export type NumericCurve = {
  xUnit: string;
  yUnit: string;
  source: string;
  notes?: string;
  normalizedAt?: { x: number; y: number };
  points: NumericCurvePoint[];
};

export type LedDeratingCurve = {
  thermalResistanceJunctionToAmbientCW: number;
  points: NumericCurvePoint[];
};

export type LedDeratingCurveSet = {
  xUnit: string;
  yUnit: string;
  source: string;
  notes?: string;
  curves: LedDeratingCurve[];
};

export type LedCurveSet = {
  forwardCurrentMAByForwardVoltageV: NumericCurve;
  relativePpfByCurrentMA: NumericCurve;
  relativePpfBySolderPointTempC: NumericCurve;
  relativeForwardVoltageBySolderPointTempC: NumericCurve;
};

export type LedAbsoluteMaximum = {
  ambientOperatingTempC: { min: number; max: number };
  storageTempC: { min: number; max: number };
  junctionTempCMax: number;
  forwardCurrentMAMax: number;
  pulseForwardCurrentMAMax: number;
  pulseCondition: string;
  esdHbmKV: number;
};

export type LedReference = {
  currentMA: number;
  solderPointTempC: number;
  forwardVoltageV: number;
  source: string;
  note?: string;
  ppfUmolS?: number;
  ppeUmolJ?: number;
  ppfRangeUmolS?: {
    minPpfUmolS: number;
    maxPpfUmolS: number;
    typicalPpfUmolS: number;
  };
};

export type LedDefinition = {
  id: string;
  name: string;
  family: string;
  manufacturer?: string;
  package?: string;
  packageSizeMm?: number[];
  criMin?: number;
  cri?: number;
  cctK?: number;
  colorName?: string;
  colorCode?: string;
  productCodeTemplate?: string;
  chromaticityRank?: string;
  chromaticityBins?: string[];
  macAdamEllipse?: Record<string, unknown>;
  chromaticityQuad?: Record<string, unknown>;
  chromaticityQuads?: Record<string, Record<string, unknown>>;
  ppfBin?: {
    minPpfUmolS: number;
    maxPpfUmolS: number;
    typicalPpfUmolS: number;
  };
  beamAngleDeg: number;
  curveSetId: string;
  systemEfficiency: number;
  spectrumCalibration?: SpectrumCalibration;
  spectralSeriesId?: string | null;
  reference?: LedReference;
  manufacturerHomepageTypical?: Omit<LedReference, "source"> & {
    cctK?: number;
    cri?: number;
    nominalWattageW?: number;
  };
  luminousFluxBinCodes?: string[];
  luminousFluxBinsLm?: Record<
    string,
    { minLm: number; maxLm: number; typicalLm: number }
  >;
  voltageBins?: Record<
    string,
    { minV: number; maxV: number; typicalV: number }
  >;
  deratingCurves: LedDeratingCurveSet;
  absoluteMaximum: LedAbsoluteMaximum;
  thermalResistanceJunctionToSolderPointCW?: number;
  sourceDocuments?: string[];
};

export type BoardEmitterDrive = {
  driveMode: "constantVoltage" | "constantCurrent";
  voltageV: number;
  currentA: number;
  temperatureC: number;
  seriesCount: number;
  parallelCount: number;
};

export type BoardEmitter = {
  id: string;
  xMm: number;
  yMm: number;
  ledType: string;
  type?: string;
  drive: BoardEmitterDrive;
};

export type LegacyBoardEmitter = {
  id?: string;
  xMm: number;
  yMm: number;
  ledType?: string;
  type?: string;
  drive?: Partial<BoardEmitterDrive>;
};

export type BoardDefinition = {
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
  boardSchemaVersion?: string;
  simulationContextVersion?: string;
};

export type BoardInstance = Pick<
  BoardDefinition,
  | "id"
  | "name"
  | "ledType"
  | "widthMm"
  | "depthMm"
  | "ledCount"
  | "columns"
  | "rows"
  | "spacingXMm"
  | "spacingYMm"
> &
  Partial<
    Pick<
      BoardDefinition,
      | "voltageV"
      | "currentA"
      | "temperatureC"
      | "seriesCount"
      | "parallelCount"
      | "distanceCm"
      | "roomWidthCm"
      | "roomDepthCm"
      | "photoperiodHours"
      | "boardCount"
      | "boardSpacingCm"
      | "fixtureColumns"
      | "fixtureRows"
      | "fixtureSpacingXCm"
      | "fixtureSpacingYCm"
      | "boardSchemaVersion"
      | "simulationContextVersion"
    >
  > & {
    presetBoardId: string;
    emitters: BoardEmitter[];
    xCm: number;
    yCm: number;
    rotationDeg: number;
    drive: BoardEmitterDrive;
  };

export type AppIssue = {
  code: string;
  message: string;
  severity?: "info" | "warning" | "error";
  field?: string;
};

export type OperationResult<TData = unknown> = {
  ok: boolean;
  data?: TData;
  warnings?: AppIssue[];
  errors?: AppIssue[];
};

export type CctEstimate = {
  valueK: number | null;
  method: string;
  confidence?: "low" | "medium" | "high";
  warningCode?: string | null;
};

export type BoardPlacementMoveResult = {
  ok: boolean;
  reason?: "not-found" | "collision";
};

export type LedComparisonColumn = {
  key: string;
  label: string;
  color: string;
  stats: Record<string, number>;
  photonFlux: number | null;
};

export type ElectricalOperatingPoint = {
  boardVoltageV: number;
  boardCurrentA: number;
  seriesCount: number;
  parallelCount: number;
  perStringCurrentA: number;
  perEmitterCurrentMA: number;
  perEmitterForwardVoltageV: number;
  inputPowerW: number;
  usedExplicitWiring: boolean;
  usedInferredWiring: boolean;
  fallbackReason: string | null;
  provenance?: {
    mode: string;
    source: string;
    wiringPolicy?: string;
  };
  violations?: AppIssue[];
};

export type PhotonOutputEstimate = {
  perEmitterPpfUmolS: number;
  boardPpfUmolS: number;
  isEstimated: boolean;
  calibrationSource: string;
  note: string;
};

export type PpfdMapResult = {
  values: Float32Array;
  valuesUnits: Uint32Array;
  valueScale: number;
  average: number;
  min: number;
  max: number;
  averageUnits: number;
  minUnits: number;
  maxUnits: number;
  gridWidth: number;
  gridDepth: number;
  inputPower: number;
  boardPhotonFlux: number;
  fixtureCount: number;
  cellCount: number;
  sourceCount: number;
  sourceBinCells: number;
  calculationMs?: number;
  electrical?: ElectricalOperatingPoint;
  photon?: PhotonOutputEstimate;
};

export type PpfdEngineName = "fast-preview" | "reference";

export type PpfdEmitter = {
  xMm: number;
  yMm: number;
  type?: string;
  ledType?: string;
};

export type PpfdEstimateInput = {
  board: BoardDefinition;
  emitters: PpfdEmitter[];
  resolutionCm: number;
  options?: {
    boardPhotonFlux: number;
    inputPowerW?: number;
    fixtureOffsetsMm?: Array<{ xMm: number; yMm: number }>;
  };
  engine?: PpfdEngineName;
};
