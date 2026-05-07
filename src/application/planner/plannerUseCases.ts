import {
  exportBoardLibrary,
  importBoardLibrary,
  type ImportMode,
} from "@/application/boardLibrary/boardLibraryImportExport";
import { applyBulkEmitterConfiguration } from "@/application/planner/applyBulkEmitterConfiguration";
import {
  createBoardDefinitionWithValidation,
  deleteBoardDefinitionWithValidation,
  duplicateBoardDefinitionWithValidation,
  loadBoardOptionsWithReport as loadBoardOptionsWithMigrationReport,
  updateBoardDefinitionWithValidation,
} from "@/application/planner/boardLibraryState";
import {
  createBoardConfigDraft,
  resolveBoardConfigDraft,
  resolveDraftPreserveField,
} from "@/application/planner/boardConfigState";
import {
  applyDefaultDriveToMatchingEmitters,
  resolveDefaultEmitterDriveDraft,
} from "@/application/planner/boardPlannerEmitterState";
import {
  regenerateBoardPlannerEmitters,
  resetBoardPlannerEmittersToDefault,
} from "@/application/planner/boardPlannerEmitters";
import { buildBenchmarkRows } from "@/application/planner/buildBenchmarkRows";
import {
  applyBoardInstanceQuarterTurn,
  clampToRange,
  createBoardInstanceId,
  findInitialBoardInstancePosition,
  isBoardPlacementValid,
  resolveBoardInstanceFootprintCm,
} from "@/application/planner/placementState";
import { syncDriveState } from "@/application/planner/syncDriveState";
import { createBoardPreviewEmitterActions } from "@/application/planner/useCases/emitterActions";
import { createBoardInstanceActions } from "@/application/planner/useCases/instanceActions";
import { createBoardLibraryActions } from "@/application/planner/useCases/libraryActions";
import { systemClock, systemRandom } from "@/utils/runtime";
import type {
  PlannerFormState,
  PlannerUseCaseDependencies,
} from "@/application/planner/useCases/contracts";

type PlannerFormField = keyof PlannerFormState;
type ElectricalPreserveField = "voltageV" | "currentA";

const NUMERIC_FORM_FIELDS = new Set<PlannerFormField>([
  "widthMm",
  "depthMm",
  "ledCount",
  "columns",
  "rows",
  "spacingXMm",
  "spacingYMm",
  "voltageV",
  "currentA",
  "temperatureC",
  "seriesCount",
  "parallelCount",
  "distanceCm",
  "roomWidthCm",
  "roomDepthCm",
  "photoperiodHours",
  "boardCount",
  "boardSpacingCm",
  "fixtureColumns",
  "fixtureRows",
  "fixtureSpacingXCm",
  "fixtureSpacingYCm",
]);

/**
 * Build planner use cases around a mutable plain state object.
 *
 * The Vue store owns reactivity, while this module owns planner policy,
 * storage orchestration, injected runtime dependencies, and state transitions.
 *
 * @param {import("@/application/planner/useCases/contracts").PlannerUseCaseDependencies} input
 */
export function createPlannerUseCases(input: PlannerUseCaseDependencies) {
  const clock = input.dependencies?.clock ?? systemClock;
  const random = input.dependencies?.random ?? systemRandom;
  const idGenerator =
    input.dependencies?.idGenerator ??
    (() =>
      createBoardInstanceId({
        clock,
        random,
      }));

  let lastEditedElectricalField: ElectricalPreserveField = "voltageV";

  const libraryActions = createBoardLibraryActions({
    state: input.state,
    storageKey: input.storageKey,
    storageAdapter: input.storageAdapter,
    migrateLedType: input.migrateLedType,
    loadBoardOptionsWithReport: loadBoardOptionsWithMigrationReport,
    createBoardDefinitionWithValidation: (args) =>
      createBoardDefinitionWithValidation({ ...args, clock }),
    updateBoardDefinitionWithValidation,
    duplicateBoardDefinitionWithValidation: (args) =>
      duplicateBoardDefinitionWithValidation({ ...args, clock }),
    deleteBoardDefinitionWithValidation,
    overwriteForm: input.overwriteForm,
  });

  const instanceActions = createBoardInstanceActions({
    state: input.state,
    clampToRange,
    isBoardPlacementValid,
    resolveBoardInstanceFootprintCm,
    findInitialBoardInstancePosition,
    createBoardInstanceId: idGenerator,
    applyBoardInstanceQuarterTurn,
    createBoardConfigDraft,
    resolveBoardConfigDraft,
    resolveDraftPreserveField,
  });

  const emitterActions = createBoardPreviewEmitterActions({
    state: input.state,
    roundToTwoDecimals: input.roundToTwoDecimals,
    regenerateBoardPlannerEmitters,
    resetBoardPlannerEmittersToDefault,
    applyDefaultDriveToMatchingEmitters,
    resolveDefaultEmitterDriveDraft,
    resolveDraftPreserveField,
    resolveBoardConfigDraft,
    applyBulkEmitterConfiguration,
  });

  function loadBoardOptionsWithReport() {
    return loadBoardOptionsWithMigrationReport({
      storageKey: input.storageKey,
      storageAdapter: input.storageAdapter,
      migrateLedType: input.migrateLedType,
    });
  }

  function resolveDefaultDrivePreserveField() {
    return input.state.boardPlannerDefaultEmitterDrive.driveMode ===
      "constantCurrent"
      ? "currentA"
      : "voltageV";
  }

  function normalizeFormFieldValue(field: PlannerFormField, value: unknown) {
    if (!NUMERIC_FORM_FIELDS.has(field)) {
      return value;
    }
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return input.state.form[field];
    }
    if (field === "currentA" || field === "voltageV") {
      return input.roundToTwoDecimals(parsedValue);
    }
    return parsedValue;
  }

  function syncPlannerElectricalState(preserveField: ElectricalPreserveField) {
    try {
      const result = syncDriveState({
        ledId: input.state.form.ledType,
        board: input.state.form,
        preserveField,
        driveWiring: input.state.driveWiring,
      });

      input.state.driveWiring.seriesCount = result.wiringPatch.seriesCount;
      input.state.driveWiring.parallelCount = result.wiringPatch.parallelCount;

      if (Object.hasOwn(result.formPatch, "voltageV")) {
        input.state.form.voltageV = input.roundToTwoDecimals(
          Number(result.formPatch.voltageV) || 0,
        );
      }
      if (Object.hasOwn(result.formPatch, "currentA")) {
        input.state.form.currentA = input.roundToTwoDecimals(
          Number(result.formPatch.currentA) || 0,
        );
      }
      input.state.issues = [];
      return { ok: true, warnings: [], errors: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const issue = {
        code: "ELECTRICAL_SYNC_FAILED",
        message,
        severity: "error" as const,
        field: preserveField,
      };
      input.state.issues = [issue];
      return { ok: false, warnings: [], errors: [issue] };
    }
  }

  function applyUserEdit(field: PlannerFormField, value: unknown) {
    if (!Object.hasOwn(input.state.form, field)) {
      return {
        ok: false,
        errors: [
          {
            code: "UNKNOWN_FORM_FIELD",
            message: `Unknown planner field: ${field}`,
            severity: "error",
            field,
          },
        ],
      };
    }

    const formRecord = input.state.form as Record<string, unknown>;
    formRecord[field] = normalizeFormFieldValue(field, value);

    const shouldRecomputeElectrical = [
      "ledType",
      "ledCount",
      "temperatureC",
      "seriesCount",
      "parallelCount",
      "currentA",
      "voltageV",
    ].includes(field);

    if (field === "currentA" || field === "voltageV") {
      lastEditedElectricalField = field;
    }

    if (
      [
        "ledType",
        "ledCount",
        "temperatureC",
        "seriesCount",
        "parallelCount",
      ].includes(field)
    ) {
      emitterActions.resolveBoardPlannerDefaultEmitterDrive(
        resolveDefaultDrivePreserveField(),
      );
    }

    if (shouldRecomputeElectrical) {
      const preserveField =
        field === "currentA" || field === "voltageV"
          ? field
          : lastEditedElectricalField;
      return syncPlannerElectricalState(preserveField);
    }

    return { ok: true, warnings: [], errors: [] };
  }

  function reselectBoardAfterLibraryMutation(selectedId = "") {
    libraryActions.reselectBoardAfterLibraryMutation(selectedId);
    syncPlannerElectricalState("voltageV");
    emitterActions.resolveBoardPlannerDefaultEmitterDrive("voltageV");
    return { ok: true, warnings: [], errors: [] };
  }

  function resetBoardDefinitionDraft() {
    const result = libraryActions.resetBoardDefinitionDraft();
    syncPlannerElectricalState("voltageV");
    emitterActions.resolveBoardPlannerDefaultEmitterDrive("voltageV");
    return result ?? { ok: true, warnings: [], errors: [] };
  }

  function createBoardDefinition() {
    const result = libraryActions.createBoardDefinition();
    if (result?.ok) {
      syncPlannerElectricalState("voltageV");
      emitterActions.resolveBoardPlannerDefaultEmitterDrive("voltageV");
    }
    return result;
  }

  function updateBoardDefinition() {
    const result = libraryActions.updateBoardDefinition();
    if (result?.ok) {
      syncPlannerElectricalState("voltageV");
      emitterActions.resolveBoardPlannerDefaultEmitterDrive("voltageV");
    }
    return result;
  }

  function duplicateBoardDefinition() {
    const result = libraryActions.duplicateBoardDefinition();
    if (result?.ok) {
      syncPlannerElectricalState("voltageV");
      emitterActions.resolveBoardPlannerDefaultEmitterDrive("voltageV");
    }
    return result;
  }

  function deleteBoardDefinition(boardId = input.state.selectedBoardId) {
    const result = libraryActions.deleteBoardDefinition(boardId);
    if (result?.ok) {
      syncPlannerElectricalState("voltageV");
      emitterActions.resolveBoardPlannerDefaultEmitterDrive("voltageV");
    }
    return result;
  }

  function runPerformanceBenchmark() {
    input.state.benchmarkRows = buildBenchmarkRows({
      board: input.state.form,
      boardInstances: input.state.boardInstances,
      resolutionCm: input.state.resolutionCm,
      driveMode: "constantVoltage",
    });
  }

  function exportBoardLibraryPayload() {
    const result = exportBoardLibrary({
      storageKey: input.storageKey,
      storageAdapter: input.storageAdapter,
      clock,
    });
    if (!result.ok) {
      input.state.boardEditorIssues = [
        ...(result.errors ?? []),
        ...(result.warnings ?? []),
      ];
    }
    return result;
  }

  function importBoardLibraryPayload(
    payload: unknown,
    mode: ImportMode = "merge",
  ) {
    const result = importBoardLibrary({
      storageKey: input.storageKey,
      storageAdapter: input.storageAdapter,
      payload,
      mode,
    });
    if (result.ok) {
      reselectBoardAfterLibraryMutation(input.state.selectedBoardId);
      input.state.boardEditorIssues = [...(result.warnings ?? [])];
    } else {
      input.state.boardEditorIssues = [
        ...(result.errors ?? []),
        ...(result.warnings ?? []),
      ];
    }
    return result;
  }

  return {
    loadBoardOptionsWithReport,
    syncPlannerElectricalState,
    applyUserEdit,
    selectBoard: libraryActions.selectBoard,
    selectBoardDefinition: libraryActions.selectBoardDefinition,
    reselectBoardAfterLibraryMutation,
    resetBoardDefinitionDraft,
    createBoardDefinition,
    updateBoardDefinition,
    duplicateBoardDefinition,
    deleteBoardDefinition,
    addBoardInstance: instanceActions.addBoardInstance,
    removeBoardInstance: instanceActions.removeBoardInstance,
    selectBoardInstance: instanceActions.selectBoardInstance,
    moveBoardInstance: instanceActions.moveBoardInstance,
    rotateBoardInstanceLeft: instanceActions.rotateBoardInstanceLeft,
    rotateBoardInstanceRight: instanceActions.rotateBoardInstanceRight,
    openBoardConfig: instanceActions.openBoardConfig,
    closeBoardConfig: instanceActions.closeBoardConfig,
    updateBoardConfigDraft: instanceActions.updateBoardConfigDraft,
    setBoardConfigMode: instanceActions.setBoardConfigMode,
    saveBoardConfig: instanceActions.saveBoardConfig,
    sanitizeEmitterSelection: emitterActions.sanitizeEmitterSelection,
    selectBoardPlannerEmitter: emitterActions.selectBoardPlannerEmitter,
    setBoardPlannerEmitterSelection:
      emitterActions.setBoardPlannerEmitterSelection,
    toggleBoardPlannerEmitterSelection:
      emitterActions.toggleBoardPlannerEmitterSelection,
    selectAllBoardPlannerEmitters: emitterActions.selectAllBoardPlannerEmitters,
    clearBoardPlannerEmitterSelection:
      emitterActions.clearBoardPlannerEmitterSelection,
    regenerateBoardPlannerEmittersFromGrid:
      emitterActions.regenerateBoardPlannerEmittersFromGrid,
    resetBoardPlannerEmittersToDefaultLed:
      emitterActions.resetBoardPlannerEmittersToDefaultLed,
    updateBoardPlannerDefaultEmitterDrive:
      emitterActions.updateBoardPlannerDefaultEmitterDrive,
    setBoardPlannerDefaultEmitterDriveMode:
      emitterActions.setBoardPlannerDefaultEmitterDriveMode,
    resolveBoardPlannerDefaultEmitterDrive:
      emitterActions.resolveBoardPlannerDefaultEmitterDrive,
    openEmitterConfig: emitterActions.openEmitterConfig,
    closeEmitterConfig: emitterActions.closeEmitterConfig,
    updateEmitterConfigDraft: emitterActions.updateEmitterConfigDraft,
    setEmitterConfigMode: emitterActions.setEmitterConfigMode,
    saveEmitterConfig: emitterActions.saveEmitterConfig,
    openBulkEmitterConfig: emitterActions.openBulkEmitterConfig,
    closeBulkEmitterConfig: emitterActions.closeBulkEmitterConfig,
    updateBulkEmitterConfigDraft: emitterActions.updateBulkEmitterConfigDraft,
    setBulkEmitterConfigMode: emitterActions.setBulkEmitterConfigMode,
    saveBulkEmitterConfig: emitterActions.saveBulkEmitterConfig,
    startEmitterDrag: emitterActions.startEmitterDrag,
    previewEmitterPosition: emitterActions.previewEmitterPosition,
    commitEmitterPosition: emitterActions.commitEmitterPosition,
    cancelEmitterDrag: emitterActions.cancelEmitterDrag,
    setBoardPlannerSpectrumMode: emitterActions.setBoardPlannerSpectrumMode,
    setBoardPlannerEmitterMoveLocked:
      emitterActions.setBoardPlannerEmitterMoveLocked,
    runPerformanceBenchmark,
    exportBoardLibraryPayload,
    importBoardLibraryPayload,
  };
}
