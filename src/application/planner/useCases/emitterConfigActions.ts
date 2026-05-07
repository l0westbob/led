import type {
  EmitterConfigActionDependencies,
  EmitterConfigDraft,
} from "@/application/planner/useCases/contracts";

/**
 * Single-emitter configuration modal actions.
 *
 * @param {import("@/application/planner/useCases/contracts").EmitterConfigActionDependencies} input
 */
export function createEmitterConfigActions(
  input: EmitterConfigActionDependencies,
) {
  function resolveEmitterDraftDrive(preserveField: "voltageV" | "currentA") {
    const draft = input.state.emitterConfigModal.draft;
    if (!draft) return;
    const emitter = input.state.form.emitters.find(
      (candidateEmitter) => candidateEmitter.id === draft.emitterId,
    );
    if (!emitter) return;

    const draftForResolve = {
      ...draft,
      seriesCount: 1,
      parallelCount: 1,
    };

    const resolvedDraft = input.resolveBoardConfigDraft({
      boardInstance: {
        ...input.state.form,
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
    Object.assign(draft, resolvedDraft.draftPatch);
    if (Object.hasOwn(draft, "voltageV")) {
      draft.voltageV = input.roundToTwoDecimals(Number(draft.voltageV) || 0);
    }
    if (Object.hasOwn(draft, "currentA")) {
      draft.currentA = input.roundToTwoDecimals(Number(draft.currentA) || 0);
    }
  }

  function openEmitterConfig(emitterId: string) {
    const emitter = input.state.form.emitters.find(
      (item) => item.id === emitterId,
    );
    if (!emitter) {
      return {
        ok: false,
        errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }],
      };
    }
    input.state.selectedBoardPlannerEmitterId = emitterId;
    const boardSeriesCount = Math.max(
      1,
      Math.floor(Number(input.state.form.seriesCount) || 1),
    );
    const boardParallelCount = Math.max(
      1,
      Math.floor(Number(input.state.form.parallelCount) || 1),
    );
    const fallbackEmitterVoltage = input.roundToTwoDecimals(
      (Number(input.state.form.voltageV) || 0) / boardSeriesCount,
    );
    const fallbackEmitterCurrent = input.roundToTwoDecimals(
      (Number(input.state.form.currentA) || 0) / boardParallelCount,
    );

    input.state.emitterConfigModal.isOpen = true;
    input.state.emitterConfigModal.draft = {
      emitterId,
      ledType: emitter.ledType,
      ...emitter.drive,
      voltageV: input.roundToTwoDecimals(
        Number(emitter.drive?.voltageV ?? fallbackEmitterVoltage) ||
          fallbackEmitterVoltage,
      ),
      currentA: input.roundToTwoDecimals(
        Number(emitter.drive?.currentA ?? fallbackEmitterCurrent) ||
          fallbackEmitterCurrent,
      ),
      seriesCount: 1,
      parallelCount: 1,
    };
    return { ok: true };
  }

  function closeEmitterConfig() {
    input.state.emitterConfigModal.isOpen = false;
    input.state.emitterConfigModal.draft = null;
    return { ok: true };
  }

  function updateEmitterConfigDraft(
    field: keyof EmitterConfigDraft,
    value: EmitterConfigDraft[keyof EmitterConfigDraft],
  ) {
    const draft = input.state.emitterConfigModal.draft;
    if (!draft) return { ok: false };
    const draftRecord = draft as Record<string, unknown>;
    draftRecord[field] = value;
    const preserveField = input.resolveDraftPreserveField({
      changedField: field,
      draft,
    });
    resolveEmitterDraftDrive(preserveField);
    return { ok: true };
  }

  function setEmitterConfigMode(mode: string) {
    const draft = input.state.emitterConfigModal.draft;
    if (!draft) return { ok: false };
    draft.driveMode =
      mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";
    const preserveField =
      draft.driveMode === "constantCurrent" ? "currentA" : "voltageV";
    resolveEmitterDraftDrive(preserveField);
    return { ok: true };
  }

  function saveEmitterConfig() {
    const draft = input.state.emitterConfigModal.draft;
    if (!draft) {
      return {
        ok: false,
        errors: [
          {
            code: "DRAFT_NOT_FOUND",
            message: "Emitter config draft is missing.",
          },
        ],
      };
    }
    const emitter = input.state.form.emitters.find(
      (item) => item.id === draft.emitterId,
    );
    if (!emitter) {
      return {
        ok: false,
        errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }],
      };
    }
    emitter.ledType = draft.ledType;
    emitter.drive = {
      driveMode:
        draft.driveMode === "constantCurrent"
          ? "constantCurrent"
          : "constantVoltage",
      voltageV: input.roundToTwoDecimals(Number(draft.voltageV) || 0),
      currentA: input.roundToTwoDecimals(Number(draft.currentA) || 0),
      temperatureC: Number(draft.temperatureC) || 25,
      seriesCount: 1,
      parallelCount: 1,
    };
    closeEmitterConfig();
    return { ok: true };
  }

  return {
    openEmitterConfig,
    closeEmitterConfig,
    updateEmitterConfigDraft,
    setEmitterConfigMode,
    saveEmitterConfig,
    resolveEmitterDraftDrive,
  };
}
