import type {
  AppIssue,
  BoardDefinition,
  BoardEmitter,
  BoardEmitterDrive,
  BoardInstance,
  OperationResult,
} from "@/domain/contracts";
import type { BenchmarkRow } from "@/application/planner/buildBenchmarkRows";

export type PlannerFormState = Omit<BoardDefinition, "emitters"> & {
  emitters: BoardEmitter[];
};

export type BoardConfigDraft = {
  instanceId: string;
  driveMode: "constantVoltage" | "constantCurrent";
  voltageV: number;
  currentA: number;
  temperatureC: number;
  seriesCount: number;
  parallelCount: number;
};

export type EmitterConfigDraft = {
  emitterId: string;
  ledType: string;
  driveMode: "constantVoltage" | "constantCurrent";
  voltageV: number;
  currentA: number;
  temperatureC: number;
  seriesCount: number;
  parallelCount: number;
};

export type BulkEmitterConfigDraft = {
  ledType: string;
  driveMode: "constantVoltage" | "constantCurrent";
  voltageV: number;
  currentA: number;
  temperatureC: number;
  seriesCount?: number;
  parallelCount?: number;
  applyLedType: boolean;
  applyDriveMode: boolean;
  applyVoltageV: boolean;
  applyCurrentA: boolean;
  applyTemperatureC: boolean;
};

export type BoardOption = Partial<BoardDefinition> & {
  id: string;
  name: string;
  ledType: string;
  isPreset?: boolean;
};

export type PlannerMutableState = {
  boardOptions: BoardOption[];
  selectedBoardId: string;
  resolutionCm: number;
  benchmarkRows: BenchmarkRow[];
  driveWiring: { seriesCount: number; parallelCount: number };
  form: PlannerFormState;
  boardInstances: BoardInstance[];
  selectedBoardInstanceId: string;
  boardConfigModal: { isOpen: boolean; draft: BoardConfigDraft | null };
  selectedBoardPlannerEmitterId: string;
  selectedBoardPlannerEmitterIds: string[];
  boardPlannerSelectionAnchorEmitterId: string;
  emitterConfigModal: { isOpen: boolean; draft: EmitterConfigDraft | null };
  boardPlannerDefaultEmitterDrive: BoardEmitterDrive;
  boardPlannerSpectrumMode: "relative" | "photon";
  boardPlannerEmitterMoveLocked: boolean;
  issues: AppIssue[];
  boardEditorIssues: AppIssue[];
  boardMigrationWarnings: AppIssue[];
  emitterDragState: { isDragging: boolean; emitterId: string };
  bulkEmitterConfigModal: {
    isOpen: boolean;
    draft: BulkEmitterConfigDraft | null;
  };
};

export type BoardConfigResolution = {
  draftPatch: Partial<BoardConfigDraft>;
  resolvedDrive: BoardEmitterDrive;
};

export type BoardOptionsLoadReport = {
  boards: BoardOption[];
  warnings: AppIssue[];
};

export type BoardDefinitionMutationResult = {
  ok: boolean;
  data?: BoardOption;
  warnings?: AppIssue[];
  errors?: AppIssue[];
};

export type BoardStorageAdapter = {
  loadSavedBoards: (storageKey: string) => object[];
  loadSavedBoardsWithReport?: (storageKey: string) => {
    boards: object[];
    warnings?: unknown;
    errors?: unknown;
  };
  saveBoardCollection: (storageKey: string, boards: object[]) => void;
  saveBoardCollectionWithReport?: (
    storageKey: string,
    boards: object[],
  ) => { ok: boolean; warnings?: unknown; errors?: unknown };
};

export type BoardInstanceActionDependencies = {
  state: PlannerMutableState;
  clampToRange: (value: number, min: number, max: number) => number;
  isBoardPlacementValid: (input: {
    boardInstance: BoardInstance;
    boardInstances: BoardInstance[];
    roomWidthCm: number;
    roomDepthCm: number;
    skipInstanceId?: string;
  }) => boolean;
  resolveBoardInstanceFootprintCm: (boardInstance: BoardInstance) => {
    widthCm: number;
    depthCm: number;
  };
  findInitialBoardInstancePosition: (input: {
    widthCm: number;
    depthCm: number;
    roomWidthCm: number;
    roomDepthCm: number;
    boardInstances: BoardInstance[];
  }) => { xCm: number; yCm: number };
  createBoardInstanceId: () => string;
  applyBoardInstanceQuarterTurn: (input: {
    boardInstance: BoardInstance;
    boardInstances: BoardInstance[];
    roomWidthCm: number;
    roomDepthCm: number;
    direction: "left" | "right";
  }) => unknown;
  createBoardConfigDraft: (boardInstance: BoardInstance) => BoardConfigDraft;
  resolveBoardConfigDraft: (input: {
    boardInstance: BoardInstance;
    draft: Partial<BoardConfigDraft>;
    preserveField: "voltageV" | "currentA";
  }) => BoardConfigResolution;
  resolveDraftPreserveField: (input: {
    changedField: string;
    draft: Partial<BoardConfigDraft>;
  }) => "voltageV" | "currentA";
};

export type BoardLibraryActionDependencies = {
  state: PlannerMutableState;
  storageKey: string;
  storageAdapter: BoardStorageAdapter;
  migrateLedType: (ledType: string) => string;
  loadBoardOptionsWithReport: (input: {
    storageKey: string;
    storageAdapter: BoardStorageAdapter;
    migrateLedType: (ledType: string) => string;
  }) => BoardOptionsLoadReport;
  createBoardDefinitionWithValidation: (input: {
    storageKey: string;
    storageAdapter: BoardStorageAdapter;
    draft: PlannerFormState;
    migrateLedType: (ledType: string) => string;
  }) => BoardDefinitionMutationResult;
  updateBoardDefinitionWithValidation: (input: {
    storageKey: string;
    storageAdapter: BoardStorageAdapter;
    boardId: string;
    draft: PlannerFormState;
    migrateLedType: (ledType: string) => string;
  }) => BoardDefinitionMutationResult;
  duplicateBoardDefinitionWithValidation: (input: {
    storageKey: string;
    storageAdapter: BoardStorageAdapter;
    draft: PlannerFormState;
    migrateLedType: (ledType: string) => string;
  }) => BoardDefinitionMutationResult;
  deleteBoardDefinitionWithValidation: (input: {
    storageKey: string;
    storageAdapter: BoardStorageAdapter;
    boardId: string;
  }) => OperationResult;
  overwriteForm: (source: BoardOption | BoardDefinition) => void;
};

export type EmitterSelectionActionDependencies = {
  state: PlannerMutableState;
};

export type DefaultEmitterDriveActionDependencies = {
  state: PlannerMutableState;
  roundToTwoDecimals: (value: number) => number;
  resolveDefaultEmitterDriveDraft: (input: {
    board: PlannerFormState;
    draft: BoardEmitterDrive;
    preserveField: "voltageV" | "currentA";
    roundToTwoDecimals: (value: number) => number;
  }) => BoardEmitterDrive;
  resolveDraftPreserveField: (input: {
    changedField: string;
    draft: Partial<BoardEmitterDrive>;
  }) => "voltageV" | "currentA";
};

export type EmitterConfigActionDependencies = {
  state: PlannerMutableState;
  roundToTwoDecimals: (value: number) => number;
  resolveBoardConfigDraft: (input: {
    boardInstance: BoardInstance | BoardDefinition;
    draft: Partial<EmitterConfigDraft>;
    preserveField: "voltageV" | "currentA";
  }) => BoardConfigResolution;
  resolveDraftPreserveField: (input: {
    changedField: string;
    draft: Partial<EmitterConfigDraft>;
  }) => "voltageV" | "currentA";
};

export type BulkEmitterConfigActionDependencies = {
  state: PlannerMutableState;
  roundToTwoDecimals: (value: number) => number;
  resolveBoardConfigDraft: (input: {
    boardInstance: BoardInstance | BoardDefinition;
    draft: Partial<BulkEmitterConfigDraft>;
    preserveField: "voltageV" | "currentA";
  }) => BoardConfigResolution;
  resolveDraftPreserveField: (input: {
    changedField: string;
    draft: Partial<BulkEmitterConfigDraft>;
  }) => "voltageV" | "currentA";
  applyBulkEmitterConfiguration: (input: {
    emitters: BoardEmitter[];
    selectedEmitterIds: string[];
    apply: {
      ledType: boolean;
      driveMode: boolean;
      voltageV: boolean;
      currentA: boolean;
      temperatureC: boolean;
    };
    values: {
      ledType: string;
      driveMode: "constantVoltage" | "constantCurrent";
      voltageV: number;
      currentA: number;
      temperatureC: number;
    };
    roundToTwoDecimals: (value: number) => number;
  }) => {
    ok: boolean;
    data?: { emitters: BoardEmitter[]; changedCount: number };
    errors?: AppIssue[];
  };
};

export type EmitterDragActionDependencies = {
  state: PlannerMutableState;
};

export type BoardPreviewEmitterActionsInput = {
  state: PlannerMutableState;
  roundToTwoDecimals: (value: number) => number;
  regenerateBoardPlannerEmitters: (form: PlannerFormState) => BoardEmitter[];
  resetBoardPlannerEmittersToDefault: (
    form: PlannerFormState,
  ) => BoardEmitter[];
  applyDefaultDriveToMatchingEmitters: (input: {
    emitters: BoardEmitter[];
    boardDefaultLedType: string;
    defaultDrive: BoardEmitterDrive;
    roundToTwoDecimals: (value: number) => number;
  }) => BoardEmitter[];
  resolveDefaultEmitterDriveDraft: (
    input: Parameters<
      DefaultEmitterDriveActionDependencies["resolveDefaultEmitterDriveDraft"]
    >[0],
  ) => BoardEmitterDrive;
  resolveDraftPreserveField: (input: {
    changedField: string;
    draft: Partial<
      BoardEmitterDrive | EmitterConfigDraft | BulkEmitterConfigDraft
    >;
  }) => "voltageV" | "currentA";
  resolveBoardConfigDraft: (input: {
    boardInstance: BoardInstance | BoardDefinition;
    draft: Partial<
      BoardConfigDraft | EmitterConfigDraft | BulkEmitterConfigDraft
    >;
    preserveField: "voltageV" | "currentA";
  }) => BoardConfigResolution;
  applyBulkEmitterConfiguration: BulkEmitterConfigActionDependencies["applyBulkEmitterConfiguration"];
};

export type PlannerUseCaseDependencies = {
  state: PlannerMutableState;
  storageKey: string;
  storageAdapter: BoardStorageAdapter;
  migrateLedType: (ledType: string) => string;
  overwriteForm: (source: BoardOption | BoardDefinition) => void;
  roundToTwoDecimals: (value: number) => number;
  dependencies?: {
    clock?: { now: () => number };
    random?: { next: () => number };
    idGenerator?: () => string;
    featureFlags?: Record<string, boolean>;
  };
};
