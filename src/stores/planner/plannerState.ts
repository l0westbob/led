import { reactive } from "vue";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { normalizeBoardPlannerEmitters } from "@/application/planner/boardPlannerEmitters";
import type {
  PlannerFormState,
  PlannerMutableState,
} from "@/application/planner/useCases/contracts";
import type { BoardDefinition } from "@/domain/contracts";

type PlannerStateFactoryInput = {
  migrateLedType: (ledType: string | null | undefined) => string;
};

export function createPlannerFormState(
  source: Partial<BoardDefinition>,
  input: PlannerStateFactoryInput,
): PlannerFormState {
  const board = normalizeBoardDefinition({
    ...source,
    ledType: input.migrateLedType(source.ledType),
  });

  return reactive({
    id: board.id,
    name: board.name,
    ledType: board.ledType,
    emitters: normalizeBoardPlannerEmitters(board),
    widthMm: board.widthMm,
    depthMm: board.depthMm,
    ledCount: board.ledCount,
    columns: board.columns,
    rows: board.rows,
    spacingXMm: board.spacingXMm,
    spacingYMm: board.spacingYMm,
    voltageV: board.voltageV,
    currentA: board.currentA,
    temperatureC: board.temperatureC,
    seriesCount: board.seriesCount,
    parallelCount: board.parallelCount,
    distanceCm: board.distanceCm,
    roomWidthCm: board.roomWidthCm,
    roomDepthCm: board.roomDepthCm,
    photoperiodHours: board.photoperiodHours,
    boardCount: board.boardCount,
    boardSpacingCm: board.boardSpacingCm,
    fixtureColumns: board.fixtureColumns,
    fixtureRows: board.fixtureRows,
    fixtureSpacingXCm: board.fixtureSpacingXCm,
    fixtureSpacingYCm: board.fixtureSpacingYCm,
  }) as PlannerFormState;
}

export function createPlannerState(
  input: PlannerStateFactoryInput,
): PlannerMutableState {
  return reactive({
    boardOptions: [],
    selectedBoardId: "",
    resolutionCm: 1,
    benchmarkRows: [],
    driveWiring: { seriesCount: 0, parallelCount: 0 },
    form: createPlannerFormState({}, input),
    boardInstances: [],
    selectedBoardInstanceId: "",
    boardConfigModal: {
      isOpen: false,
      draft: null,
    },
    selectedBoardPlannerEmitterId: "",
    selectedBoardPlannerEmitterIds: [],
    boardPlannerSelectionAnchorEmitterId: "",
    emitterConfigModal: {
      isOpen: false,
      draft: null,
    },
    boardPlannerDefaultEmitterDrive: {
      driveMode: "constantVoltage",
      voltageV: 2.7,
      currentA: 0.065,
      temperatureC: 25,
      seriesCount: 0,
      parallelCount: 0,
    },
    boardPlannerSpectrumMode: "relative",
    boardPlannerEmitterMoveLocked: true,
    issues: [],
    boardEditorIssues: [],
    boardMigrationWarnings: [],
    emitterDragState: {
      isDragging: false,
      emitterId: "",
    },
    bulkEmitterConfigModal: {
      isOpen: false,
      draft: null,
    },
  }) as PlannerMutableState;
}
