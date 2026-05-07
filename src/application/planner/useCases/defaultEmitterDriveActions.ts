import type { DefaultEmitterDriveActionDependencies } from "@/application/planner/useCases/contracts";
import type { BoardEmitterDrive } from "@/domain/contracts";

/**
 * Board-preview default emitter drive actions.
 *
 * @param {import("@/application/planner/useCases/contracts").DefaultEmitterDriveActionDependencies} input
 */
export function createDefaultEmitterDriveActions(
  input: DefaultEmitterDriveActionDependencies,
) {
  function resolveBoardPlannerDefaultEmitterDrive(
    preserveField: "voltageV" | "currentA",
  ) {
    const nextDefaultDrive = input.resolveDefaultEmitterDriveDraft({
      board: input.state.form,
      draft: input.state.boardPlannerDefaultEmitterDrive,
      preserveField,
      roundToTwoDecimals: input.roundToTwoDecimals,
    });
    Object.assign(
      input.state.boardPlannerDefaultEmitterDrive,
      nextDefaultDrive,
    );
  }

  function updateBoardPlannerDefaultEmitterDrive(
    field: keyof Pick<
      BoardEmitterDrive,
      "voltageV" | "currentA" | "temperatureC"
    >,
    value: unknown,
  ) {
    if (!["voltageV", "currentA", "temperatureC"].includes(field)) {
      return { ok: false };
    }
    input.state.boardPlannerDefaultEmitterDrive[field] =
      field === "temperatureC"
        ? Number(value) || 25
        : input.roundToTwoDecimals(Number(value) || 0);

    const preserveField = input.resolveDraftPreserveField({
      changedField: field,
      draft: input.state.boardPlannerDefaultEmitterDrive,
    });
    resolveBoardPlannerDefaultEmitterDrive(preserveField);
    return { ok: true };
  }

  function setBoardPlannerDefaultEmitterDriveMode(mode: string) {
    input.state.boardPlannerDefaultEmitterDrive.driveMode =
      mode === "constantCurrent" ? "constantCurrent" : "constantVoltage";
    const preserveField =
      input.state.boardPlannerDefaultEmitterDrive.driveMode ===
      "constantCurrent"
        ? "currentA"
        : "voltageV";
    resolveBoardPlannerDefaultEmitterDrive(preserveField);
    return { ok: true };
  }

  return {
    updateBoardPlannerDefaultEmitterDrive,
    setBoardPlannerDefaultEmitterDriveMode,
    resolveBoardPlannerDefaultEmitterDrive,
  };
}
