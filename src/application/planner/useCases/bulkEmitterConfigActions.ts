import type {
  BulkEmitterConfigActionDependencies,
  BulkEmitterConfigDraft,
} from "@/application/planner/useCases/contracts";

/**
 * Bulk emitter configuration modal actions.
 *
 * @param {import("@/application/planner/useCases/contracts").BulkEmitterConfigActionDependencies} input
 */
export function createBulkEmitterConfigActions(
  input: BulkEmitterConfigActionDependencies,
) {
  function resolveBulkEmitterDraftDrive(
    preserveField: "voltageV" | "currentA",
  ) {
    const draft = input.state.bulkEmitterConfigModal.draft;
    if (!draft) return;
    const primaryEmitter = input.state.form.emitters.find((emitter) =>
      input.state.selectedBoardPlannerEmitterIds.includes(emitter.id),
    );
    if (!primaryEmitter) return;
    const resolvedDraft = input.resolveBoardConfigDraft({
      boardInstance: {
        ...input.state.form,
        ledType: draft.ledType ?? primaryEmitter.ledType,
        voltageV: Number(draft.voltageV) || 0,
        currentA: Number(draft.currentA) || 0,
        seriesCount: 1,
        parallelCount: 1,
        drive: {
          driveMode: draft.driveMode,
          voltageV: Number(draft.voltageV) || 0,
          currentA: Number(draft.currentA) || 0,
          temperatureC: Number(draft.temperatureC) || 25,
          seriesCount: 1,
          parallelCount: 1,
        },
        ledCount: 1,
      },
      draft: {
        ...draft,
        seriesCount: 1,
        parallelCount: 1,
      },
      preserveField,
    });
    Object.assign(draft, resolvedDraft.draftPatch);
    draft.voltageV = input.roundToTwoDecimals(Number(draft.voltageV) || 0);
    draft.currentA = input.roundToTwoDecimals(Number(draft.currentA) || 0);
  }

  function openBulkEmitterConfig() {
    if (!input.state.selectedBoardPlannerEmitterIds.length) {
      return {
        ok: false,
        errors: [
          {
            code: "NO_EMITTER_SELECTION",
            message: "Select at least one emitter for bulk configuration.",
          },
        ],
      };
    }
    const primaryEmitter = input.state.form.emitters.find((emitter) =>
      input.state.selectedBoardPlannerEmitterIds.includes(emitter.id),
    );
    if (!primaryEmitter) {
      return {
        ok: false,
        errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }],
      };
    }
    input.state.bulkEmitterConfigModal.isOpen = true;
    input.state.bulkEmitterConfigModal.draft = {
      ledType: primaryEmitter.ledType,
      driveMode: primaryEmitter.drive.driveMode,
      voltageV: input.roundToTwoDecimals(
        Number(primaryEmitter.drive.voltageV) || 0,
      ),
      currentA: input.roundToTwoDecimals(
        Number(primaryEmitter.drive.currentA) || 0,
      ),
      temperatureC: Number(primaryEmitter.drive.temperatureC) || 25,
      applyLedType: true,
      applyDriveMode: true,
      applyVoltageV: true,
      applyCurrentA: true,
      applyTemperatureC: true,
    };
    return { ok: true };
  }

  function closeBulkEmitterConfig() {
    input.state.bulkEmitterConfigModal.isOpen = false;
    input.state.bulkEmitterConfigModal.draft = null;
    return { ok: true };
  }

  function updateBulkEmitterConfigDraft(
    field: keyof BulkEmitterConfigDraft,
    value: BulkEmitterConfigDraft[keyof BulkEmitterConfigDraft],
  ) {
    const draft = input.state.bulkEmitterConfigModal.draft;
    if (!draft) return { ok: false };
    const draftRecord = draft as Record<string, unknown>;
    draftRecord[field] = value;
    if (
      [
        "ledType",
        "applyLedType",
        "applyDriveMode",
        "applyVoltageV",
        "applyCurrentA",
        "applyTemperatureC",
      ].includes(field)
    ) {
      return { ok: true };
    }
    const preserveField = input.resolveDraftPreserveField({
      changedField: field,
      draft,
    });
    resolveBulkEmitterDraftDrive(preserveField);
    return { ok: true };
  }

  function setBulkEmitterConfigMode(mode: string) {
    const draft = input.state.bulkEmitterConfigModal.draft;
    if (!draft) return { ok: false };
    draft.driveMode =
      mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";
    resolveBulkEmitterDraftDrive(
      draft.driveMode === "constantCurrent" ? "currentA" : "voltageV",
    );
    return { ok: true };
  }

  function saveBulkEmitterConfig() {
    const draft = input.state.bulkEmitterConfigModal.draft;
    if (!draft) {
      return {
        ok: false,
        errors: [
          {
            code: "DRAFT_NOT_FOUND",
            message: "Bulk config draft is missing.",
          },
        ],
      };
    }
    const result = input.applyBulkEmitterConfiguration({
      emitters: input.state.form.emitters,
      selectedEmitterIds: input.state.selectedBoardPlannerEmitterIds,
      apply: {
        ledType: Boolean(draft.applyLedType),
        driveMode: Boolean(draft.applyDriveMode),
        voltageV: Boolean(draft.applyVoltageV),
        currentA: Boolean(draft.applyCurrentA),
        temperatureC: Boolean(draft.applyTemperatureC),
      },
      values: {
        ledType: draft.ledType,
        driveMode: draft.driveMode,
        voltageV: draft.voltageV,
        currentA: draft.currentA,
        temperatureC: draft.temperatureC,
      },
      roundToTwoDecimals: input.roundToTwoDecimals,
    });
    if (!result.ok || !result.data) {
      return result;
    }
    input.state.form.emitters = result.data.emitters;
    closeBulkEmitterConfig();
    return result;
  }

  return {
    openBulkEmitterConfig,
    closeBulkEmitterConfig,
    updateBulkEmitterConfigDraft,
    setBulkEmitterConfigMode,
    saveBulkEmitterConfig,
    resolveBulkEmitterDraftDrive,
  };
}
