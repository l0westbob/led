import type { BoardLibraryActionDependencies } from "@/application/planner/useCases/contracts";

/**
 * Planner board-library action bundle.
 *
 * @param {import("@/application/planner/useCases/contracts").BoardLibraryActionDependencies} input
 */
export function createBoardLibraryActions(
  input: BoardLibraryActionDependencies,
) {
  function selectBoard(boardId: string) {
    input.state.selectedBoardId = boardId;
  }

  function selectBoardDefinition(boardId: string) {
    selectBoard(boardId);
  }

  function refreshBoardOptions(nextSelectedId = "") {
    const optionsWithReport = input.loadBoardOptionsWithReport({
      storageKey: input.storageKey,
      storageAdapter: input.storageAdapter,
      migrateLedType: input.migrateLedType,
    });
    input.state.boardOptions = optionsWithReport.boards;
    input.state.boardMigrationWarnings = optionsWithReport.warnings;
    const fallbackId = input.state.boardOptions[0]?.id ?? "";
    const exists = input.state.boardOptions.some(
      (option) => option.id === nextSelectedId,
    );
    input.state.selectedBoardId = exists ? nextSelectedId : fallbackId;
  }

  function reselectBoardAfterLibraryMutation(selectedId = "") {
    refreshBoardOptions(selectedId);
    const selected = input.state.boardOptions.find(
      (option) => option.id === input.state.selectedBoardId,
    );
    if (selected) {
      input.overwriteForm(selected);
    }
  }

  function resetBoardDefinitionDraft() {
    const selected = input.state.boardOptions.find(
      (option) => option.id === input.state.selectedBoardId,
    );
    if (selected) {
      input.overwriteForm(selected);
    } else if (input.state.boardOptions[0]) {
      input.overwriteForm(input.state.boardOptions[0]);
    }
    input.state.boardEditorIssues = [];
  }

  function createBoardDefinition() {
    const result = input.createBoardDefinitionWithValidation({
      storageKey: input.storageKey,
      storageAdapter: input.storageAdapter,
      draft: input.state.form,
      migrateLedType: input.migrateLedType,
    });
    if (!result.ok || !result.data) {
      input.state.boardEditorIssues = [
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
    input.state.boardEditorIssues = [];
    return { ok: true, data: result.data };
  }

  function updateBoardDefinition() {
    const selected = input.state.boardOptions.find(
      (option) => option.id === input.state.selectedBoardId,
    );
    if (!selected) {
      return {
        ok: false,
        errors: [
          { code: "BOARD_NOT_FOUND", message: "Selected board not found." },
        ],
      };
    }
    if (selected.isPreset) {
      return duplicateBoardDefinition();
    }

    const result = input.updateBoardDefinitionWithValidation({
      storageKey: input.storageKey,
      storageAdapter: input.storageAdapter,
      boardId: selected.id,
      draft: input.state.form,
      migrateLedType: input.migrateLedType,
    });
    if (!result.ok || !result.data) {
      input.state.boardEditorIssues = [
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
    input.state.boardEditorIssues = [];
    return { ok: true, data: result.data };
  }

  function duplicateBoardDefinition() {
    const result = input.duplicateBoardDefinitionWithValidation({
      storageKey: input.storageKey,
      storageAdapter: input.storageAdapter,
      draft: input.state.form,
      migrateLedType: input.migrateLedType,
    });
    if (!result.ok || !result.data) {
      input.state.boardEditorIssues = [
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
    input.state.boardEditorIssues = [];
    return { ok: true, data: result.data };
  }

  function deleteBoardDefinition(boardId = input.state.selectedBoardId) {
    const selected = input.state.boardOptions.find(
      (option) => option.id === boardId,
    );
    if (!selected || selected.isPreset) {
      return {
        ok: false,
        errors: [
          {
            code: "DELETE_NOT_ALLOWED",
            message: "Preset boards cannot be deleted.",
          },
        ],
      };
    }

    const result = input.deleteBoardDefinitionWithValidation({
      storageKey: input.storageKey,
      storageAdapter: input.storageAdapter,
      boardId,
    });
    if (!result.ok) {
      input.state.boardEditorIssues = [
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
      input.state.boardOptions.find((option) => option.id !== boardId)?.id ??
      "";
    reselectBoardAfterLibraryMutation(fallbackBoardId);
    input.state.boardEditorIssues = [];
    return { ok: true };
  }

  return {
    selectBoard,
    selectBoardDefinition,
    refreshBoardOptions,
    reselectBoardAfterLibraryMutation,
    resetBoardDefinitionDraft,
    createBoardDefinition,
    updateBoardDefinition,
    duplicateBoardDefinition,
    deleteBoardDefinition,
  };
}
