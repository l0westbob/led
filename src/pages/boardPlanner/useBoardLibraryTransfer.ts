import { ref } from "vue";
import { downloadJsonPayload } from "@/utils/browserDownloads";
import type { AppIssueV11 } from "@/contracts/versioned/issues";
import type {
  BoardLibraryImportResult,
  BoardLibraryImportSummary,
  ImportMode,
} from "@/application/boardLibrary/boardLibraryImportExport";
import type { PlannerContextStore } from "@/stores/plannerContext";

type BoardLibraryTransferOptions = {
  download?: typeof downloadJsonPayload;
  now?: () => Date;
};

type IssueResult = {
  errors?: AppIssueV11[];
  warnings?: AppIssueV11[];
};

function collectResultIssues(result: IssueResult | null | undefined) {
  return [...(result?.errors ?? []), ...(result?.warnings ?? [])];
}

export function formatImportSummary(
  data: BoardLibraryImportSummary | undefined,
  fallbackMode: ImportMode,
): string {
  const mode = data?.mode ?? fallbackMode;
  const details = [];
  const skipped = Number(data?.skippedDuplicateCount) || 0;
  const overwritten = Number(data?.overwrittenCount) || 0;
  if (skipped > 0) {
    details.push(`skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}`);
  }
  if (overwritten > 0) {
    details.push(
      `overwrote ${overwritten} duplicate${overwritten === 1 ? "" : "s"}`,
    );
  }
  const suffix = details.length > 0 ? `; ${details.join(", ")}` : "";
  return `Imported ${data?.importedCount ?? 0} boards (${mode} mode${suffix}).`;
}

export function valueFromEvent(event: Event): string {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target.value;
  }
  return "";
}

export function useBoardLibraryTransfer(
  store: PlannerContextStore,
  options: BoardLibraryTransferOptions = {},
) {
  const importMode = ref<ImportMode>("merge");
  const importJson = ref("");
  const importExportMessages = ref<AppIssueV11[]>([]);
  const download = options.download ?? downloadJsonPayload;
  const now = options.now ?? (() => new Date());

  function handleExportBoardLibrary() {
    const exportResult = store.exportBoardLibraryPayload();
    if (!exportResult.ok || !exportResult.data) {
      importExportMessages.value = collectResultIssues(exportResult);
      return;
    }

    download({
      payload: exportResult.data,
      filename: `led-board-library-${now().toISOString().slice(0, 10)}.json`,
    });
    importExportMessages.value = [
      {
        code: "EXPORT_SUCCESS",
        message: `Exported ${exportResult.data.boardCount} custom boards.`,
        severity: "info",
      },
    ];
  }

  function handleImportBoardLibrary() {
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(importJson.value);
    } catch {
      importExportMessages.value = [
        {
          code: "IMPORT_JSON_INVALID",
          message: "Import JSON is invalid. Please paste a valid JSON payload.",
          severity: "error",
        },
      ];
      return;
    }

    const importResult: BoardLibraryImportResult =
      store.importBoardLibraryPayload(parsedPayload, importMode.value);
    importExportMessages.value = collectResultIssues(importResult);
    if (importResult.ok) {
      importExportMessages.value = [
        ...importResult.warnings,
        {
          code: "IMPORT_SUCCESS",
          message: formatImportSummary(importResult.data, importMode.value),
          severity: "info",
        },
      ];
    }
  }

  return {
    importMode,
    importJson,
    importExportMessages,
    handleExportBoardLibrary,
    handleImportBoardLibrary,
  };
}
