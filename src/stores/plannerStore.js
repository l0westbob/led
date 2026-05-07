import { computed, reactive, watch } from "vue";
import { normalizeBoardDefinition } from "@/catalog/boardCatalog";
import { listLedDefinitions } from "@/catalog/ledCatalog";
import { loadSavedBoards, saveBoardCollection } from "@/utils/storage";
import { buildPlannerSnapshot } from "@/application/planner/buildPlannerSnapshot";
import { syncDriveState } from "@/application/planner/syncDriveState";
import { buildBenchmarkRows } from "@/application/planner/buildBenchmarkRows";
import {
  createBoardDefinitionWithValidation,
  deleteBoardDefinitionWithValidation,
  duplicateBoardDefinitionWithValidation,
  loadBoardOptions,
  updateBoardDefinitionWithValidation,
} from "@/application/planner/boardLibraryState";
import {
  applyBoardSelection,
  preserveFieldForElectricalRecompute,
} from "@/application/planner/mutations";
import {
  applyBoardInstanceQuarterTurn,
  clampToRange,
  createBoardInstanceId,
  findInitialBoardInstancePosition,
  isBoardPlacementValid,
  resolveBoardInstanceFootprintCm,
} from "@/application/planner/placementState";
import {
  createBoardConfigDraft,
  resolveBoardConfigDraft,
  resolveDraftPreserveField,
} from "@/application/planner/boardConfigState";
import {
  normalizeBoardPlannerEmitters,
  regenerateBoardPlannerEmitters,
  resetBoardPlannerEmittersToDefault,
} from "@/application/planner/boardPlannerEmitters";
import { buildBoardPlannerPreviewSnapshot } from "@/application/planner/buildBoardPlannerPreviewSnapshot";
import { clampEmitterPosition } from "@/application/planner/emitterPlacement";
import {
  applyDefaultDriveToMatchingEmitters,
  resolveDefaultEmitterDriveDraft,
} from "@/application/planner/boardPlannerEmitterState";

const STORAGE_KEY = "led-ppfd-planner.boards";
const boardStorageAdapter = {
  loadSavedBoards,
  saveBoardCollection,
};

function roundToTwoDecimals(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

const state = reactive({
  boardOptions: [],
  selectedBoardId: "",
  resolutionCm: 1,
  benchmarkRows: [],
  driveWiring: { seriesCount: 0, parallelCount: 0 },
  form: createFormState({}),
  boardInstances: [],
  selectedBoardInstanceId: "",
  boardConfigModal: {
    isOpen: false,
    draft: null,
  },
  selectedBoardPlannerEmitterId: "",
  emitterConfigModal: {
    isOpen: false,
    draft: null,
  },
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
  emitterDragState: {
    isDragging: false,
    emitterId: "",
  },
});

let initialized = false;

/**
 * Planner store for the "real version" architecture.
 *
 * Responsibilities:
 * - Own form and selection state
 * - Persist/load custom boards
 * - Delegate all electrical/photon/PPFD work to application services
 * - Keep Vue watchers thin and deterministic
 */
export function usePlannerStore() {
  if (!initialized) {
    initializeStore();
  }

  const plannerSnapshot = computed(() => {
    const snapshot = buildPlannerSnapshot({
      board: state.form,
      boardInstances: state.boardInstances,
      resolutionCm: state.resolutionCm,
    });
    state.issues = snapshot.issues ?? [];
    return snapshot;
  });

  const board = computed(() => plannerSnapshot.value.board);
  const emitters = computed(() => plannerSnapshot.value.emitters);
  const ppfdSummary = computed(() => plannerSnapshot.value.summary);
  const boardPlannerPreviewSnapshot = computed(() =>
    buildBoardPlannerPreviewSnapshot({
      board: state.form,
      selectedEmitterId: state.selectedBoardPlannerEmitterId,
    }),
  );

  const stats = computed(() => [
    {
      label: "LED Positions",
      value: `${emitters.value.length} emitters`,
    },
    {
      label: "Board Instances",
      value: `${state.boardInstances.length}`,
    },
    {
      label: "Input Power",
      value: `${ppfdSummary.value.electrical.inputPowerW.toFixed(1)} W`,
    },
    {
      label: "Photon Flux",
      value: `${ppfdSummary.value.photon.boardPpfUmolS.toFixed(1)} umol/s est.`,
    },
    {
      label: "Average PPFD",
      value: `${ppfdSummary.value.average.toFixed(0)} umol/m²/s est.`,
    },
    {
      label: "Min PPFD",
      value: `${ppfdSummary.value.min.toFixed(0)} umol/m²/s est.`,
    },
    {
      label: "Max PPFD",
      value: `${ppfdSummary.value.max.toFixed(0)} umol/m²/s est.`,
    },
    {
      label: "Grid Size",
      value: `${ppfdSummary.value.gridWidth} x ${ppfdSummary.value.gridDepth}`,
    },
  ]);

  return {
    state,
    form: state.form,
    boardOptions: computed(() => state.boardOptions),
    ledTypes: listLedDefinitions(),
    board,
    emitters,
    ppfdSummary,
    stats,
    benchmarkRows: computed(() => state.benchmarkRows),
    boardInstances: computed(() => state.boardInstances),
    selectedBoardInstanceId: computed(() => state.selectedBoardInstanceId),
    boardConfigModal: computed(() => state.boardConfigModal),
    boardPlannerPreviewSnapshot,
    selectedBoardPlannerEmitterId: computed(() => state.selectedBoardPlannerEmitterId),
    emitterConfigModal: computed(() => state.emitterConfigModal),
    boardPlannerDefaultEmitterDrive: computed(() => state.boardPlannerDefaultEmitterDrive),
    boardEditorIssues: computed(() => state.boardEditorIssues),
    boardPlannerSpectrumMode: computed(() => state.boardPlannerSpectrumMode),
    boardPlannerEmitterMoveLocked: computed(() => state.boardPlannerEmitterMoveLocked),
    emitterDragState: computed(() => state.emitterDragState),
    createBoardDefinition,
    updateBoardDefinition,
    deleteBoardDefinition,
    duplicateBoardDefinition,
    selectBoardDefinition,
    resetBoardDefinitionDraft,
    selectBoard,
    addBoardInstance,
    removeBoardInstance,
    selectBoardInstance,
    moveBoardInstance,
    rotateBoardInstanceLeft,
    rotateBoardInstanceRight,
    openBoardConfig,
    closeBoardConfig,
    updateBoardConfigDraft,
    setBoardConfigMode,
    saveBoardConfig,
    setResolution,
    runPerformanceBenchmark,
    selectBoardPlannerEmitter,
    regenerateBoardPlannerEmittersFromGrid,
    resetBoardPlannerEmittersToDefaultLed,
    updateBoardPlannerDefaultEmitterDrive,
    setBoardPlannerDefaultEmitterDriveMode,
    openEmitterConfig,
    closeEmitterConfig,
    updateEmitterConfigDraft,
    setEmitterConfigMode,
    saveEmitterConfig,
    startEmitterDrag,
    previewEmitterPosition,
    commitEmitterPosition,
    cancelEmitterDrag,
    setBoardPlannerSpectrumMode,
    setBoardPlannerEmitterMoveLocked,
  };
}

function initializeStore() {
  initialized = true;

  state.boardOptions = loadBoardOptions({
    storageKey: STORAGE_KEY,
    storageAdapter: boardStorageAdapter,
    migrateLedType,
  });
  state.selectedBoardId = state.boardOptions[0]?.id ?? "";
  state.form = createFormState(state.boardOptions[0] ?? {});

  let syncing = false;
  let lastEdited = "voltageV";

  function applyDriveResolution(preserveField) {
    const result = syncDriveState({
      ledId: state.form.ledType,
      board: state.form,
      preserveField,
      driveWiring: state.driveWiring,
    });

    state.driveWiring.seriesCount = result.wiringPatch.seriesCount;
    state.driveWiring.parallelCount = result.wiringPatch.parallelCount;

    if (Object.hasOwn(result.formPatch, "voltageV")) {
      const roundedVoltage = result.formPatch.voltageV;
      if (Math.abs(roundedVoltage - state.form.voltageV) > 1e-6) {
        state.form.voltageV = roundedVoltage;
      }
    }

    if (Object.hasOwn(result.formPatch, "currentA")) {
      const roundedCurrent = result.formPatch.currentA;
      if (Math.abs(roundedCurrent - state.form.currentA) > 1e-9) {
        state.form.currentA = roundedCurrent;
      }
    }
  }

  function safeApplyDriveResolution(preserveField) {
    if (syncing) return;
    syncing = true;
    try {
      applyDriveResolution(preserveField);
      state.issues = [];
    } catch (error) {
      state.issues = [error instanceof Error ? error.message : String(error)];
    } finally {
      syncing = false;
    }
  }

  watch(
    () => state.selectedBoardId,
    (selectedId) => {
      const boardOption = state.boardOptions.find((item) => item.id === selectedId);
      if (!boardOption) return;
      overwriteForm(boardOption);
      state.form.emitters = normalizeBoardPlannerEmitters(state.form);
      state.selectedBoardPlannerEmitterId = state.form.emitters[0]?.id ?? "";
      state.boardEditorIssues = [];
      refreshDerivedState("voltageV");
    },
    { immediate: true },
  );

  watch(
    () => state.form.currentA,
    () => {
      if (syncing) return;
      lastEdited = "currentA";
      refreshDerivedState("currentA");
    },
  );

  watch(
    () => state.form.voltageV,
    () => {
      if (syncing) return;
      lastEdited = "voltageV";
      refreshDerivedState("voltageV");
    },
  );

  watch(
    () => [
      state.form.ledType,
      state.form.ledCount,
      state.form.temperatureC,
      state.form.seriesCount,
      state.form.parallelCount,
    ],
    () => {
      if (syncing) return;
      const defaultPreserveField =
        state.boardPlannerDefaultEmitterDrive.driveMode === "constantCurrent"
          ? "currentA"
          : "voltageV";
      resolveBoardPlannerDefaultEmitterDrive(defaultPreserveField);
      const preserveField = preserveFieldForElectricalRecompute({
        driveMode: "constantVoltage",
        lastEdited,
      });
      refreshDerivedState(preserveField);
    },
  );

  function refreshDerivedState(preserveField) {
    safeApplyDriveResolution(preserveField);
  }
}

function createFormState(source) {
  const board = normalizeBoardDefinition({
    ...source,
    ledType: migrateLedType(source.ledType),
  });

  return reactive({
    id: board.id,
    name: board.name,
    ledType: board.ledType,
    emitters: board.emitters,
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
  });
}

function overwriteForm(source) {
  const normalized = applyBoardSelection(source, migrateLedType);
  Object.assign(state.form, normalized);
  state.form.emitters = normalizeBoardPlannerEmitters(state.form);
  if (!state.selectedBoardPlannerEmitterId && state.form.emitters.length > 0) {
    state.selectedBoardPlannerEmitterId = state.form.emitters[0].id;
  }
}

function selectBoard(boardId) {
  state.selectedBoardId = boardId;
}

function selectBoardDefinition(boardId) {
  selectBoard(boardId);
}

function setResolution(resolutionCm) {
  state.resolutionCm = resolutionCm;
}

function selectBoardPlannerEmitter(emitterId) {
  state.selectedBoardPlannerEmitterId = emitterId;
}

function regenerateBoardPlannerEmittersFromGrid() {
  const regeneratedEmitters = regenerateBoardPlannerEmitters(state.form);
  state.form.emitters = applyDefaultDriveToMatchingEmitters({
    emitters: regeneratedEmitters,
    boardDefaultLedType: state.form.ledType,
    defaultDrive: state.boardPlannerDefaultEmitterDrive,
    roundToTwoDecimals,
  });
  if (!state.form.emitters.some((emitter) => emitter.id === state.selectedBoardPlannerEmitterId)) {
    state.selectedBoardPlannerEmitterId = state.form.emitters[0]?.id ?? "";
  }
}

function resetBoardPlannerEmittersToDefaultLed() {
  state.form.emitters = applyDefaultDriveToMatchingEmitters({
    emitters: resetBoardPlannerEmittersToDefault(state.form),
    boardDefaultLedType: state.form.ledType,
    defaultDrive: state.boardPlannerDefaultEmitterDrive,
    roundToTwoDecimals,
  });
  if (!state.form.emitters.some((emitter) => emitter.id === state.selectedBoardPlannerEmitterId)) {
    state.selectedBoardPlannerEmitterId = state.form.emitters[0]?.id ?? "";
  }
}

function updateBoardPlannerDefaultEmitterDrive(field, value) {
  if (!["voltageV", "currentA", "temperatureC"].includes(field)) return;
  state.boardPlannerDefaultEmitterDrive[field] =
    field === "temperatureC"
      ? Number(value) || 25
      : roundToTwoDecimals(Number(value) || 0);

  const preserveField = resolveDraftPreserveField({
    changedField: field,
    draft: state.boardPlannerDefaultEmitterDrive,
  });
  resolveBoardPlannerDefaultEmitterDrive(preserveField);
}

function setBoardPlannerDefaultEmitterDriveMode(mode) {
  state.boardPlannerDefaultEmitterDrive.driveMode =
    mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";
  const preserveField =
    state.boardPlannerDefaultEmitterDrive.driveMode === "constantCurrent"
      ? "currentA"
      : "voltageV";
  resolveBoardPlannerDefaultEmitterDrive(preserveField);
}

function resolveBoardPlannerDefaultEmitterDrive(preserveField) {
  const nextDefaultDrive = resolveDefaultEmitterDriveDraft({
    board: state.form,
    draft: state.boardPlannerDefaultEmitterDrive,
    preserveField,
    roundToTwoDecimals,
  });
  Object.assign(state.boardPlannerDefaultEmitterDrive, nextDefaultDrive);
}

function refreshBoardOptions(nextSelectedId = "") {
  state.boardOptions = loadBoardOptions({
    storageKey: STORAGE_KEY,
    storageAdapter: boardStorageAdapter,
    migrateLedType,
  });
  const fallbackId = state.boardOptions[0]?.id ?? "";
  const exists = state.boardOptions.some((option) => option.id === nextSelectedId);
  state.selectedBoardId = exists ? nextSelectedId : fallbackId;
}

function reselectBoardAfterLibraryMutation(selectedId = "") {
  refreshBoardOptions(selectedId);
  const selected = state.boardOptions.find((option) => option.id === state.selectedBoardId);
  if (selected) {
    overwriteForm(selected);
  }
}

function resetBoardDefinitionDraft() {
  const selected = state.boardOptions.find((option) => option.id === state.selectedBoardId);
  if (selected) {
    overwriteForm(selected);
  } else if (state.boardOptions[0]) {
    overwriteForm(state.boardOptions[0]);
  }
  state.boardEditorIssues = [];
}

function createBoardDefinition() {
  const result = createBoardDefinitionWithValidation({
    storageKey: STORAGE_KEY,
    storageAdapter: boardStorageAdapter,
    draft: state.form,
    migrateLedType,
  });
  if (!result.ok || !result.data) {
    state.boardEditorIssues = [
      ...(result.errors ?? []),
      ...(result.warnings ?? []),
    ];
    return {
      ok: false,
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
    };
  }
  reselectBoardAfterLibraryMutation(result.data.id);
  state.boardEditorIssues = [];
  return { ok: true, data: result.data };
}

function updateBoardDefinition() {
  const selected = state.boardOptions.find((option) => option.id === state.selectedBoardId);
  if (!selected) return { ok: false, errors: [{ code: "BOARD_NOT_FOUND", message: "Selected board not found." }] };

  if (selected.isPreset) {
    return duplicateBoardDefinition();
  }

  const result = updateBoardDefinitionWithValidation({
    storageKey: STORAGE_KEY,
    storageAdapter: boardStorageAdapter,
    boardId: selected.id,
    draft: state.form,
    migrateLedType,
  });
  if (!result.ok || !result.data) {
    state.boardEditorIssues = [
      ...(result.errors ?? []),
      ...(result.warnings ?? []),
    ];
    return {
      ok: false,
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
    };
  }
  reselectBoardAfterLibraryMutation(result.data.id);
  state.boardEditorIssues = [];
  return { ok: true, data: result.data };
}

function duplicateBoardDefinition() {
  const result = duplicateBoardDefinitionWithValidation({
    storageKey: STORAGE_KEY,
    storageAdapter: boardStorageAdapter,
    draft: state.form,
    migrateLedType,
  });
  if (!result.ok || !result.data) {
    state.boardEditorIssues = [
      ...(result.errors ?? []),
      ...(result.warnings ?? []),
    ];
    return {
      ok: false,
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
    };
  }
  reselectBoardAfterLibraryMutation(result.data.id);
  state.boardEditorIssues = [];
  return { ok: true, data: result.data };
}

function deleteBoardDefinition(boardId = state.selectedBoardId) {
  const selected = state.boardOptions.find((option) => option.id === boardId);
  if (!selected || selected.isPreset) {
    return {
      ok: false,
      errors: [{ code: "DELETE_NOT_ALLOWED", message: "Preset boards cannot be deleted." }],
    };
  }

  const result = deleteBoardDefinitionWithValidation({
    storageKey: STORAGE_KEY,
    storageAdapter: boardStorageAdapter,
    boardId,
  });
  if (!result.ok) {
    state.boardEditorIssues = [
      ...(result.errors ?? []),
      ...(result.warnings ?? []),
    ];
    return {
      ok: false,
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
    };
  }
  const fallbackBoardId =
    state.boardOptions.find((option) => option.id !== boardId)?.id ?? "";
  reselectBoardAfterLibraryMutation(fallbackBoardId);
  state.boardEditorIssues = [];
  return { ok: true };
}

function defaultInstanceDriveFromForm() {
  return {
    driveMode: "constantVoltage",
    voltageV: Number(state.form.voltageV) || 0,
    currentA: Number(state.form.currentA) || 0,
    temperatureC: Number(state.form.temperatureC) || 25,
    seriesCount: Math.max(0, Math.floor(Number(state.form.seriesCount) || 0)),
    parallelCount: Math.max(
      0,
      Math.floor(Number(state.form.parallelCount) || 0),
    ),
  };
}

function isValidPlacement(next, skipId = "") {
  return isBoardPlacementValid({
    boardInstance: next,
    boardInstances: state.boardInstances,
    roomWidthCm: state.form.roomWidthCm,
    roomDepthCm: state.form.roomDepthCm,
    skipInstanceId: skipId,
  });
}

function findInitialBoardPosition(widthCm, depthCm) {
  return findInitialBoardInstancePosition({
    widthCm,
    depthCm,
    roomWidthCm: Number(state.form.roomWidthCm) || 120,
    roomDepthCm: Number(state.form.roomDepthCm) || 120,
    boardInstances: state.boardInstances,
  });
}

function addBoardInstance() {
  const widthCm = (Number(state.form.widthMm) || 440) / 10;
  const depthCm = (Number(state.form.depthMm) || 285) / 10;
  const base = findInitialBoardPosition(widthCm, depthCm);
  const id = createBoardInstanceId();
  const instance = {
    id,
    name: state.form.name || "Board",
    presetBoardId: state.selectedBoardId,
    ledType: state.form.ledType,
    widthMm: Number(state.form.widthMm) || 440,
    depthMm: Number(state.form.depthMm) || 285,
    ledCount: Number(state.form.ledCount) || 1,
    columns: Number(state.form.columns) || 1,
    rows: Number(state.form.rows) || 1,
    spacingXMm: Number(state.form.spacingXMm) || 18,
    spacingYMm: Number(state.form.spacingYMm) || 18,
    emitters: Array.isArray(state.form.emitters) ? state.form.emitters : [],
    xCm: base.xCm,
    yCm: base.yCm,
    rotationDeg: 0,
    drive: defaultInstanceDriveFromForm(),
  };
  state.boardInstances.push(instance);
  state.selectedBoardInstanceId = id;
  return { ok: true, data: { id } };
}

function removeBoardInstance(instanceId) {
  const beforeCount = state.boardInstances.length;
  state.boardInstances = state.boardInstances.filter((item) => item.id !== instanceId);
  if (state.boardInstances.length === beforeCount) {
    return { ok: false, errors: [{ code: "INSTANCE_NOT_FOUND", message: "Board instance not found." }] };
  }
  if (state.selectedBoardInstanceId === instanceId) {
    state.selectedBoardInstanceId = state.boardInstances[0]?.id ?? "";
  }
  return { ok: true };
}

function selectBoardInstance(instanceId) {
  state.selectedBoardInstanceId = instanceId;
}

function moveBoardInstance(instanceId, xCm, yCm) {
  const instance = state.boardInstances.find((item) => item.id === instanceId);
  if (!instance) {
    return { ok: false, reason: "not-found" };
  }
  const size = resolveBoardInstanceFootprintCm(instance);
  const halfW = size.widthCm * 0.5;
  const halfH = size.depthCm * 0.5;
  const next = {
    ...instance,
    xCm: clampToRange(
      xCm,
      halfW,
      Math.max(halfW, state.form.roomWidthCm - halfW),
    ),
    yCm: clampToRange(
      yCm,
      halfH,
      Math.max(halfH, state.form.roomDepthCm - halfH),
    ),
  };
  if (!isValidPlacement(next, instanceId)) {
    return { ok: false, reason: "collision" };
  }
  instance.xCm = next.xCm;
  instance.yCm = next.yCm;
  return { ok: true };
}

function rotateBoardInstance(instanceId, direction) {
  const instance = state.boardInstances.find((item) => item.id === instanceId);
  if (!instance) return;
  applyBoardInstanceQuarterTurn({
    boardInstance: instance,
    boardInstances: state.boardInstances,
    roomWidthCm: state.form.roomWidthCm,
    roomDepthCm: state.form.roomDepthCm,
    direction,
  });
}

function rotateBoardInstanceLeft(instanceId) {
  rotateBoardInstance(instanceId, "left");
}

function rotateBoardInstanceRight(instanceId) {
  rotateBoardInstance(instanceId, "right");
}

function openBoardConfig(instanceId) {
  const instance = state.boardInstances.find((item) => item.id === instanceId);
  if (!instance) {
    return { ok: false, errors: [{ code: "INSTANCE_NOT_FOUND", message: "Board instance not found." }] };
  }
  state.selectedBoardInstanceId = instance.id;
  state.boardConfigModal.isOpen = true;
  state.boardConfigModal.draft = createBoardConfigDraft(instance);
  return { ok: true };
}

function closeBoardConfig() {
  state.boardConfigModal.isOpen = false;
  state.boardConfigModal.draft = null;
}

function saveBoardConfig() {
  const draft = state.boardConfigModal.draft;
  if (!draft) return { ok: false, errors: [{ code: "DRAFT_NOT_FOUND", message: "Board config draft is missing." }] };
  const instance = state.boardInstances.find((item) => item.id === draft.instanceId);
  if (!instance) return { ok: false, errors: [{ code: "INSTANCE_NOT_FOUND", message: "Board instance not found." }] };

  const preserveField = draft.driveMode === "constantCurrent" ? "currentA" : "voltageV";
  const resolvedConfig = resolveBoardConfigDraft({
    boardInstance: instance,
    draft,
    preserveField,
  });

  instance.drive = resolvedConfig.resolvedDrive;

  closeBoardConfig();
  return { ok: true };
}

function resolveDraftDrive(preserveField) {
  const draft = state.boardConfigModal.draft;
  if (!draft) return;
  const instance = state.boardInstances.find((item) => item.id === draft.instanceId);
  if (!instance) return;

  const resolvedConfig = resolveBoardConfigDraft({
    boardInstance: instance,
    draft,
    preserveField,
  });
  Object.assign(draft, resolvedConfig.draftPatch);
}

function updateBoardConfigDraft(field, value) {
  const draft = state.boardConfigModal.draft;
  if (!draft) return;
  draft[field] = value;

  const preserveField = resolveDraftPreserveField({
    changedField: field,
    draft,
  });
  resolveDraftDrive(preserveField);
}

function setBoardConfigMode(mode) {
  const draft = state.boardConfigModal.draft;
  if (!draft) return;
  draft.driveMode =
    mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";
  const preserveField = draft.driveMode === "constantCurrent" ? "currentA" : "voltageV";
  resolveDraftDrive(preserveField);
}

function migrateLedType(ledType) {
  const known = new Set(listLedDefinitions().map((led) => led.id));
  if (known.has(ledType)) return ledType;

  const legacyMap = {
    lm301h: "lm301h_cri80_5000k",
    osram3030: "lm301h_cri80_5000k",
    creexpe2: "lm301h_cri80_5000k",
  };

  return legacyMap[ledType] ?? "lm301h_cri80_5000k";
}

function runPerformanceBenchmark() {
  state.benchmarkRows = buildBenchmarkRows({
    board: state.form,
    boardInstances: state.boardInstances,
    resolutionCm: state.resolutionCm,
    driveMode: "constantVoltage",
  });
}

function openEmitterConfig(emitterId) {
  const emitter = state.form.emitters.find((item) => item.id === emitterId);
  if (!emitter) {
    return { ok: false, errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }] };
  }
  state.selectedBoardPlannerEmitterId = emitterId;
  const boardSeriesCount = Math.max(1, Math.floor(Number(state.form.seriesCount) || 1));
  const boardParallelCount = Math.max(1, Math.floor(Number(state.form.parallelCount) || 1));
  const defaultLedVoltageV = roundToTwoDecimals(
    (Number(state.form.voltageV) || 0) / boardSeriesCount,
  );
  const defaultLedCurrentA = roundToTwoDecimals(
    (Number(state.form.currentA) || 0) / boardParallelCount,
  );

  state.emitterConfigModal.isOpen = true;
  state.emitterConfigModal.draft = {
    emitterId,
    ledType: emitter.ledType,
    ...emitter.drive,
    voltageV: roundToTwoDecimals(
      Number(emitter.drive?.voltageV ?? defaultLedVoltageV) || defaultLedVoltageV,
    ),
    currentA: roundToTwoDecimals(
      Number(emitter.drive?.currentA ?? defaultLedCurrentA) || defaultLedCurrentA,
    ),
    seriesCount: 1,
    parallelCount: 1,
  };
  return { ok: true };
}

function closeEmitterConfig() {
  state.emitterConfigModal.isOpen = false;
  state.emitterConfigModal.draft = null;
}

function resolveEmitterDraftDrive(preserveField) {
  const draft = state.emitterConfigModal.draft;
  if (!draft) return;
  const emitter = state.form.emitters.find((item) => item.id === draft.emitterId);
  if (!emitter) return;

  const draftForResolve = {
    ...draft,
    seriesCount: 1,
    parallelCount: 1,
  };

  const resolved = resolveBoardConfigDraft({
    boardInstance: {
      ...state.form,
      ledType: draftForResolve.ledType ?? emitter.ledType,
      voltageV: Number(draftForResolve.voltageV) || 0,
      currentA: Number(draftForResolve.currentA) || 0,
      seriesCount: 1,
      parallelCount: 1,
      drive: {
        driveMode: draftForResolve.driveMode,
        voltageV: Number(draftForResolve.voltageV) || 0,
        currentA: Number(draftForResolve.currentA) || 0,
        temperatureC: Number(draftForResolve.temperatureC) || 25,
        seriesCount: 1,
        parallelCount: 1,
      },
      ledCount: 1,
    },
    draft: draftForResolve,
    preserveField,
  });
  Object.assign(draft, resolved.draftPatch);
  if (Object.hasOwn(draft, "voltageV")) {
    draft.voltageV = roundToTwoDecimals(draft.voltageV);
  }
  if (Object.hasOwn(draft, "currentA")) {
    draft.currentA = roundToTwoDecimals(draft.currentA);
  }
}

function updateEmitterConfigDraft(field, value) {
  const draft = state.emitterConfigModal.draft;
  if (!draft) return;
  draft[field] = value;
  const preserveField = resolveDraftPreserveField({
    changedField: field,
    draft,
  });
  resolveEmitterDraftDrive(preserveField);
}

function setEmitterConfigMode(mode) {
  const draft = state.emitterConfigModal.draft;
  if (!draft) return;
  draft.driveMode = mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";
  const preserveField = draft.driveMode === "constantCurrent" ? "currentA" : "voltageV";
  resolveEmitterDraftDrive(preserveField);
}

function saveEmitterConfig() {
  const draft = state.emitterConfigModal.draft;
  if (!draft) return { ok: false, errors: [{ code: "DRAFT_NOT_FOUND", message: "Emitter config draft is missing." }] };
  const emitter = state.form.emitters.find((item) => item.id === draft.emitterId);
  if (!emitter) return { ok: false, errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }] };

  emitter.ledType = draft.ledType;
  emitter.drive = {
    driveMode: draft.driveMode === "constantCurrent" ? "constantCurrent" : "constantVoltage",
    voltageV: roundToTwoDecimals(Number(draft.voltageV) || 0),
    currentA: roundToTwoDecimals(Number(draft.currentA) || 0),
    temperatureC: Number(draft.temperatureC) || 25,
    seriesCount: 1,
    parallelCount: 1,
  };
  closeEmitterConfig();
  return { ok: true };
}

function startEmitterDrag(emitterId) {
  if (!state.form.emitters.some((emitter) => emitter.id === emitterId)) {
    return { ok: false, errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }] };
  }
  state.emitterDragState.isDragging = true;
  state.emitterDragState.emitterId = emitterId;
  state.selectedBoardPlannerEmitterId = emitterId;
  return { ok: true };
}

function previewEmitterPosition(emitterId, xMm, yMm) {
  const activeEmitterId = state.emitterDragState.emitterId || emitterId;
  const emitter = state.form.emitters.find((item) => item.id === activeEmitterId);
  if (!emitter) {
    return { ok: false, errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }] };
  }
  const clampedPosition = clampEmitterPosition({
    xMm,
    yMm,
    boardWidthMm: state.form.widthMm,
    boardDepthMm: state.form.depthMm,
    snapStepMm: 1,
  });
  emitter.xMm = clampedPosition.xMm;
  emitter.yMm = clampedPosition.yMm;
  return { ok: true, data: clampedPosition };
}

function commitEmitterPosition(emitterId, xMm, yMm) {
  const previewResult = previewEmitterPosition(emitterId, xMm, yMm);
  state.emitterDragState.isDragging = false;
  state.emitterDragState.emitterId = "";
  return previewResult?.ok === false ? previewResult : { ok: true };
}

function cancelEmitterDrag() {
  state.emitterDragState.isDragging = false;
  state.emitterDragState.emitterId = "";
}

function setBoardPlannerSpectrumMode(mode) {
  state.boardPlannerSpectrumMode = mode === "photon" ? "photon" : "relative";
}

function setBoardPlannerEmitterMoveLocked(isLocked) {
  state.boardPlannerEmitterMoveLocked = Boolean(isLocked);
  if (state.boardPlannerEmitterMoveLocked) {
    cancelEmitterDrag();
  }
}
