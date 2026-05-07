import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBoardDefinition } from "../src/catalog/boardCatalog";
import { createPlannerUseCases } from "../src/application/planner/plannerUseCases";

function createPlannerState() {
  const form = normalizeBoardDefinition({
    id: "test-board",
    name: "Use Case Board",
    ledType: "lm301h_cri80_5000k",
    widthMm: 100,
    depthMm: 100,
    ledCount: 4,
    columns: 2,
    rows: 2,
    spacingXMm: 20,
    spacingYMm: 20,
    voltageV: 5.4,
    currentA: 0.13,
    temperatureC: 25,
    seriesCount: 2,
    parallelCount: 2,
    roomWidthCm: 120,
    roomDepthCm: 120,
  });
  return {
    boardOptions: [{ ...form, isPreset: true }],
    selectedBoardId: form.id,
    resolutionCm: 2,
    benchmarkRows: [],
    driveWiring: { seriesCount: 0, parallelCount: 0 },
    form,
    boardInstances: [],
    selectedBoardInstanceId: "",
    boardConfigModal: { isOpen: false, draft: null },
    selectedBoardPlannerEmitterId: "",
    selectedBoardPlannerEmitterIds: [],
    boardPlannerSelectionAnchorEmitterId: "",
    emitterConfigModal: { isOpen: false, draft: null },
    boardPlannerDefaultEmitterDrive: {
      driveMode: "constantVoltage",
      voltageV: 2.7,
      currentA: 0.065,
      temperatureC: 25,
    },
    boardPlannerSpectrumMode: "relative",
    boardPlannerEmitterMoveLocked: true,
    issues: [],
    boardEditorIssues: [],
    boardMigrationWarnings: [],
    emitterDragState: { isDragging: false, emitterId: "" },
    bulkEmitterConfigModal: { isOpen: false, draft: null },
  };
}

test("planner use cases accept deterministic id generator injection", () => {
  const state = createPlannerState();
  const storageAdapter = {
    loadSavedBoards() {
      return [];
    },
    saveBoardCollection() {},
  };
  const useCases = createPlannerUseCases({
    state,
    storageKey: "planner-use-cases",
    storageAdapter,
    migrateLedType: (ledType) => ledType,
    overwriteForm(source) {
      Object.assign(state.form, source);
    },
    roundToTwoDecimals(value) {
      return Math.round(value * 100) / 100;
    },
    dependencies: {
      idGenerator: () => "instance-fixed",
    },
  });

  const result = useCases.addBoardInstance();

  assert.equal(result.ok, true);
  assert.equal(result.data.id, "instance-fixed");
  assert.equal(state.boardInstances[0].id, "instance-fixed");
  assert.equal(state.selectedBoardInstanceId, "instance-fixed");
});
