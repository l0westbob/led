import { describe, expect, it, vi } from "vitest";
import {
  formatImportSummary,
  useBoardLibraryTransfer,
} from "../../src/pages/boardPlanner/useBoardLibraryTransfer";
import type { PlannerContextStore } from "../../src/stores/plannerContext";

function createStore(
  overrides: Partial<PlannerContextStore> = {},
): PlannerContextStore {
  return {
    exportBoardLibraryPayload: vi.fn(() => ({
      ok: true,
      data: { boardCount: 2 },
      warnings: [],
      errors: [],
      contractVersion: "1.1",
    })),
    importBoardLibraryPayload: vi.fn(() => ({
      ok: true,
      data: {
        mode: "merge",
        conflictPolicy: "mergeOverwrite",
        importedCount: 3,
        skippedDuplicateCount: 0,
        overwrittenCount: 1,
        storedCount: 4,
      },
      warnings: [],
      errors: [],
      contractVersion: "1.1",
    })),
    ...overrides,
  } as unknown as PlannerContextStore;
}

describe("useBoardLibraryTransfer", () => {
  it("downloads exported board collections with deterministic filenames", () => {
    const download = vi.fn();
    const transfer = useBoardLibraryTransfer(createStore(), {
      download,
      now: () => new Date("2026-02-03T12:00:00.000Z"),
    });

    transfer.handleExportBoardLibrary();

    expect(download).toHaveBeenCalledWith({
      payload: { boardCount: 2 },
      filename: "led-board-library-2026-02-03.json",
    });
    expect(transfer.importExportMessages.value[0]).toMatchObject({
      code: "EXPORT_SUCCESS",
      severity: "info",
    });
  });

  it("parses imports and sends the selected conflict mode to the store", () => {
    const store = createStore();
    const transfer = useBoardLibraryTransfer(store);
    transfer.importJson.value = JSON.stringify({ boards: [] });
    transfer.importMode.value = "mergeSkipDuplicates";

    transfer.handleImportBoardLibrary();

    expect(store.importBoardLibraryPayload).toHaveBeenCalledWith(
      { boards: [] },
      "mergeSkipDuplicates",
    );
    expect(transfer.importExportMessages.value.at(-1)).toMatchObject({
      code: "IMPORT_SUCCESS",
      severity: "info",
    });
  });

  it("reports invalid JSON without calling the store", () => {
    const store = createStore();
    const transfer = useBoardLibraryTransfer(store);
    transfer.importJson.value = "{";

    transfer.handleImportBoardLibrary();

    expect(store.importBoardLibraryPayload).not.toHaveBeenCalled();
    expect(transfer.importExportMessages.value).toEqual([
      expect.objectContaining({
        code: "IMPORT_JSON_INVALID",
        severity: "error",
      }),
    ]);
  });
});

describe("formatImportSummary", () => {
  it("includes duplicate handling details", () => {
    expect(
      formatImportSummary(
        {
          mode: "merge",
          conflictPolicy: "mergeOverwrite",
          importedCount: 4,
          skippedDuplicateCount: 1,
          overwrittenCount: 2,
          storedCount: 6,
        },
        "replace",
      ),
    ).toBe(
      "Imported 4 boards (merge mode; skipped 1 duplicate, overwrote 2 duplicates).",
    );
  });
});
