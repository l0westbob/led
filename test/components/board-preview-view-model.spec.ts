import { describe, expect, it, vi } from "vitest";
import { useBoardPreviewViewModel } from "../../src/components/boardPreview/useBoardPreviewViewModel";
import type { PlannerContextStore } from "../../src/stores/plannerContext";

function createStore(isBulkModalOpen: boolean): PlannerContextStore {
  return {
    form: {},
    selectedBoardPlannerEmitterId: "",
    selectedBoardPlannerEmitterIds: [],
    bulkEmitterConfigModal: { isOpen: isBulkModalOpen },
    closeBulkEmitterConfig: vi.fn(),
    clearBoardPlannerEmitterSelection: vi.fn(),
  } as unknown as PlannerContextStore;
}

describe("useBoardPreviewViewModel", () => {
  it("closes the bulk editor before clearing selection on Escape", () => {
    const store = createStore(true);
    const { handleEscapeKey } = useBoardPreviewViewModel(store);

    handleEscapeKey(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(store.closeBulkEmitterConfig).toHaveBeenCalledOnce();
    expect(store.clearBoardPlannerEmitterSelection).not.toHaveBeenCalled();
  });

  it("clears emitter selection on Escape when no bulk editor is open", () => {
    const store = createStore(false);
    const { handleEscapeKey } = useBoardPreviewViewModel(store);

    handleEscapeKey(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(store.closeBulkEmitterConfig).not.toHaveBeenCalled();
    expect(store.clearBoardPlannerEmitterSelection).toHaveBeenCalledOnce();
  });

  it("ignores non-Escape keyboard events", () => {
    const store = createStore(false);
    const { handleEscapeKey } = useBoardPreviewViewModel(store);

    handleEscapeKey(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(store.closeBulkEmitterConfig).not.toHaveBeenCalled();
    expect(store.clearBoardPlannerEmitterSelection).not.toHaveBeenCalled();
  });
});
