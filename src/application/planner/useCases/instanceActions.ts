import type {
  BoardConfigDraft,
  BoardInstanceActionDependencies,
} from "@/application/planner/useCases/contracts";
import type { BoardEmitterDrive, BoardInstance } from "@/domain/contracts";

/**
 * Planner lamp-instance action bundle.
 *
 * @param {import("@/application/planner/useCases/contracts").BoardInstanceActionDependencies} input
 */
export function createBoardInstanceActions(
  input: BoardInstanceActionDependencies,
) {
  function defaultInstanceDriveFromForm(): BoardEmitterDrive {
    return {
      driveMode: "constantVoltage",
      voltageV: Number(input.state.form.voltageV) || 0,
      currentA: Number(input.state.form.currentA) || 0,
      temperatureC: Number(input.state.form.temperatureC) || 25,
      seriesCount: Math.max(
        0,
        Math.floor(Number(input.state.form.seriesCount) || 0),
      ),
      parallelCount: Math.max(
        0,
        Math.floor(Number(input.state.form.parallelCount) || 0),
      ),
    };
  }

  function isValidPlacement(next: BoardInstance, skipId = "") {
    return input.isBoardPlacementValid({
      boardInstance: next,
      boardInstances: input.state.boardInstances,
      roomWidthCm: input.state.form.roomWidthCm,
      roomDepthCm: input.state.form.roomDepthCm,
      skipInstanceId: skipId,
    });
  }

  function findInitialBoardPosition(widthCm: number, depthCm: number) {
    return input.findInitialBoardInstancePosition({
      widthCm,
      depthCm,
      roomWidthCm: Number(input.state.form.roomWidthCm) || 120,
      roomDepthCm: Number(input.state.form.roomDepthCm) || 120,
      boardInstances: input.state.boardInstances,
    });
  }

  function addBoardInstance() {
    const widthCm = (Number(input.state.form.widthMm) || 440) / 10;
    const depthCm = (Number(input.state.form.depthMm) || 285) / 10;
    const base = findInitialBoardPosition(widthCm, depthCm);
    const id = input.createBoardInstanceId();
    const instance: BoardInstance = {
      id,
      name: input.state.form.name || "Board",
      presetBoardId: input.state.selectedBoardId,
      ledType: input.state.form.ledType,
      widthMm: Number(input.state.form.widthMm) || 440,
      depthMm: Number(input.state.form.depthMm) || 285,
      ledCount: Number(input.state.form.ledCount) || 1,
      columns: Number(input.state.form.columns) || 1,
      rows: Number(input.state.form.rows) || 1,
      spacingXMm: Number(input.state.form.spacingXMm) || 18,
      spacingYMm: Number(input.state.form.spacingYMm) || 18,
      emitters: Array.isArray(input.state.form.emitters)
        ? input.state.form.emitters
        : [],
      xCm: base.xCm,
      yCm: base.yCm,
      rotationDeg: 0,
      drive: defaultInstanceDriveFromForm(),
    };
    input.state.boardInstances.push(instance);
    input.state.selectedBoardInstanceId = id;
    return { ok: true, data: { id } };
  }

  function removeBoardInstance(instanceId: string) {
    const beforeCount = input.state.boardInstances.length;
    input.state.boardInstances = input.state.boardInstances.filter(
      (item) => item.id !== instanceId,
    );
    if (input.state.boardInstances.length === beforeCount) {
      return {
        ok: false,
        errors: [
          { code: "INSTANCE_NOT_FOUND", message: "Board instance not found." },
        ],
      };
    }
    if (input.state.selectedBoardInstanceId === instanceId) {
      input.state.selectedBoardInstanceId =
        input.state.boardInstances[0]?.id ?? "";
    }
    return { ok: true };
  }

  function selectBoardInstance(instanceId: string) {
    input.state.selectedBoardInstanceId = instanceId;
  }

  function moveBoardInstance(instanceId: string, xCm: number, yCm: number) {
    const instance = input.state.boardInstances.find(
      (item) => item.id === instanceId,
    );
    if (!instance) {
      return { ok: false, reason: "not-found" };
    }
    const size = input.resolveBoardInstanceFootprintCm(instance);
    const halfW = size.widthCm * 0.5;
    const halfH = size.depthCm * 0.5;
    const next = {
      ...instance,
      xCm: input.clampToRange(
        xCm,
        halfW,
        Math.max(halfW, input.state.form.roomWidthCm - halfW),
      ),
      yCm: input.clampToRange(
        yCm,
        halfH,
        Math.max(halfH, input.state.form.roomDepthCm - halfH),
      ),
    };
    if (!isValidPlacement(next, instanceId)) {
      return { ok: false, reason: "collision" };
    }
    instance.xCm = next.xCm;
    instance.yCm = next.yCm;
    return { ok: true };
  }

  function rotateBoardInstance(
    instanceId: string,
    direction: "left" | "right",
  ) {
    const instance = input.state.boardInstances.find(
      (item) => item.id === instanceId,
    );
    if (!instance) return;
    input.applyBoardInstanceQuarterTurn({
      boardInstance: instance,
      boardInstances: input.state.boardInstances,
      roomWidthCm: input.state.form.roomWidthCm,
      roomDepthCm: input.state.form.roomDepthCm,
      direction,
    });
  }

  function rotateBoardInstanceLeft(instanceId: string) {
    rotateBoardInstance(instanceId, "left");
  }

  function rotateBoardInstanceRight(instanceId: string) {
    rotateBoardInstance(instanceId, "right");
  }

  function openBoardConfig(instanceId: string) {
    const instance = input.state.boardInstances.find(
      (item) => item.id === instanceId,
    );
    if (!instance) {
      return {
        ok: false,
        errors: [
          { code: "INSTANCE_NOT_FOUND", message: "Board instance not found." },
        ],
      };
    }
    input.state.selectedBoardInstanceId = instance.id;
    input.state.boardConfigModal.isOpen = true;
    input.state.boardConfigModal.draft = input.createBoardConfigDraft(instance);
    return { ok: true };
  }

  function closeBoardConfig() {
    input.state.boardConfigModal.isOpen = false;
    input.state.boardConfigModal.draft = null;
  }

  function resolveDraftDrive(preserveField: "voltageV" | "currentA") {
    const draft = input.state.boardConfigModal.draft;
    if (!draft) return;
    const instance = input.state.boardInstances.find(
      (item) => item.id === draft.instanceId,
    );
    if (!instance) return;
    const resolvedConfig = input.resolveBoardConfigDraft({
      boardInstance: instance,
      draft,
      preserveField,
    });
    Object.assign(draft, resolvedConfig.draftPatch);
  }

  function updateBoardConfigDraft(
    field: keyof BoardConfigDraft,
    value: BoardConfigDraft[keyof BoardConfigDraft],
  ) {
    const draft = input.state.boardConfigModal.draft;
    if (!draft) return;
    const draftRecord = draft as Record<string, unknown>;
    draftRecord[field] = value;
    const preserveField = input.resolveDraftPreserveField({
      changedField: field,
      draft,
    });
    resolveDraftDrive(preserveField);
  }

  function setBoardConfigMode(mode: string) {
    const draft = input.state.boardConfigModal.draft;
    if (!draft) return;
    draft.driveMode =
      mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";
    const preserveField =
      draft.driveMode === "constantCurrent" ? "currentA" : "voltageV";
    resolveDraftDrive(preserveField);
  }

  function saveBoardConfig() {
    const draft = input.state.boardConfigModal.draft;
    if (!draft) {
      return {
        ok: false,
        errors: [
          {
            code: "DRAFT_NOT_FOUND",
            message: "Board config draft is missing.",
          },
        ],
      };
    }
    const instance = input.state.boardInstances.find(
      (item) => item.id === draft.instanceId,
    );
    if (!instance) {
      return {
        ok: false,
        errors: [
          { code: "INSTANCE_NOT_FOUND", message: "Board instance not found." },
        ],
      };
    }

    const preserveField =
      draft.driveMode === "constantCurrent" ? "currentA" : "voltageV";
    const resolvedConfig = input.resolveBoardConfigDraft({
      boardInstance: instance,
      draft,
      preserveField,
    });
    instance.drive = resolvedConfig.resolvedDrive;
    closeBoardConfig();
    return { ok: true };
  }

  return {
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
  };
}
