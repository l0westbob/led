import type { EmitterSelectionActionDependencies } from "@/application/planner/useCases/contracts";

/**
 * Board-preview emitter selection actions.
 *
 * @param {import("@/application/planner/useCases/contracts").EmitterSelectionActionDependencies} input
 */
export function createEmitterSelectionActions(
  input: EmitterSelectionActionDependencies,
) {
  function sanitizeEmitterSelection() {
    const allowedEmitterIds = new Set(
      input.state.form.emitters.map((emitter) => emitter.id),
    );
    input.state.selectedBoardPlannerEmitterIds =
      input.state.selectedBoardPlannerEmitterIds.filter((emitterId) =>
        allowedEmitterIds.has(emitterId),
      );
    if (
      input.state.selectedBoardPlannerEmitterIds.length === 0 &&
      input.state.form.emitters.length > 0
    ) {
      input.state.selectedBoardPlannerEmitterIds = [
        input.state.form.emitters[0].id,
      ];
    }
    if (
      input.state.selectedBoardPlannerEmitterId &&
      !allowedEmitterIds.has(input.state.selectedBoardPlannerEmitterId)
    ) {
      input.state.selectedBoardPlannerEmitterId =
        input.state.selectedBoardPlannerEmitterIds[0] ?? "";
    }
    if (
      input.state.boardPlannerSelectionAnchorEmitterId &&
      !allowedEmitterIds.has(input.state.boardPlannerSelectionAnchorEmitterId)
    ) {
      input.state.boardPlannerSelectionAnchorEmitterId = "";
    }
  }

  function selectBoardPlannerEmitter(emitterId: string) {
    input.state.selectedBoardPlannerEmitterId = emitterId;
    input.state.selectedBoardPlannerEmitterIds = [emitterId];
    input.state.boardPlannerSelectionAnchorEmitterId = emitterId;
    return { ok: true };
  }

  function setBoardPlannerEmitterSelection(emitterIds: string[]) {
    const allowedEmitterIds = new Set(
      input.state.form.emitters.map((emitter) => emitter.id),
    );
    const normalizedEmitterIds = [
      ...new Set(
        (emitterIds ?? []).filter((emitterId) =>
          allowedEmitterIds.has(emitterId),
        ),
      ),
    ];
    input.state.selectedBoardPlannerEmitterIds = normalizedEmitterIds;
    input.state.selectedBoardPlannerEmitterId =
      normalizedEmitterIds[normalizedEmitterIds.length - 1] ?? "";
    input.state.boardPlannerSelectionAnchorEmitterId =
      input.state.selectedBoardPlannerEmitterId;
    return { ok: true, data: { selectedEmitterIds: normalizedEmitterIds } };
  }

  function toggleBoardPlannerEmitterSelection(
    emitterId: string,
    options: { additive?: boolean; range?: boolean } = {},
  ) {
    const emitterOrder = input.state.form.emitters.map((emitter) => emitter.id);
    if (!emitterOrder.includes(emitterId)) {
      return {
        ok: false,
        errors: [{ code: "EMITTER_NOT_FOUND", message: "Emitter not found." }],
      };
    }

    const { additive = false, range = false } = options;
    let nextSelection = [...input.state.selectedBoardPlannerEmitterIds];
    if (range && input.state.boardPlannerSelectionAnchorEmitterId) {
      const startIndex = emitterOrder.indexOf(
        input.state.boardPlannerSelectionAnchorEmitterId,
      );
      const endIndex = emitterOrder.indexOf(emitterId);
      if (startIndex >= 0 && endIndex >= 0) {
        const firstIndex = Math.min(startIndex, endIndex);
        const lastIndex = Math.max(startIndex, endIndex);
        const rangeEmitterIds = emitterOrder.slice(firstIndex, lastIndex + 1);
        nextSelection = additive
          ? [...new Set([...nextSelection, ...rangeEmitterIds])]
          : rangeEmitterIds;
      }
    } else if (additive) {
      nextSelection = nextSelection.includes(emitterId)
        ? nextSelection.filter((selectedId) => selectedId !== emitterId)
        : [...nextSelection, emitterId];
    } else {
      nextSelection = [emitterId];
    }

    input.state.selectedBoardPlannerEmitterIds = nextSelection;
    input.state.selectedBoardPlannerEmitterId = emitterId;
    input.state.boardPlannerSelectionAnchorEmitterId = emitterId;
    return { ok: true, data: { selectedEmitterIds: nextSelection } };
  }

  function selectAllBoardPlannerEmitters() {
    return setBoardPlannerEmitterSelection(
      input.state.form.emitters.map((emitter) => emitter.id),
    );
  }

  function clearBoardPlannerEmitterSelection() {
    input.state.selectedBoardPlannerEmitterIds = [];
    input.state.selectedBoardPlannerEmitterId = "";
    input.state.boardPlannerSelectionAnchorEmitterId = "";
    return { ok: true };
  }

  return {
    sanitizeEmitterSelection,
    selectBoardPlannerEmitter,
    setBoardPlannerEmitterSelection,
    toggleBoardPlannerEmitterSelection,
    selectAllBoardPlannerEmitters,
    clearBoardPlannerEmitterSelection,
  };
}
