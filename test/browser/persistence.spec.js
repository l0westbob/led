import { expect, test } from "@playwright/test";
import { openBoardPlanner } from "./helpers.js";

const STORAGE_KEY = "led-ppfd-planner.boards";

function createLegacyBoardPayload() {
  return {
    id: "browser-import-board",
    name: "Browser Import Board",
    ledType: "lm301h_cri80_5000k",
    widthMm: 200,
    depthMm: 160,
    ledCount: 12,
    columns: 4,
    rows: 3,
    spacingXMm: 20,
    spacingYMm: 20,
    voltageV: 5.4,
    currentA: 0.78,
    temperatureC: 25,
    seriesCount: 2,
    parallelCount: 6,
    distanceCm: 30,
    roomWidthCm: 120,
    roomDepthCm: 120,
    photoperiodHours: 12,
    boardCount: 1,
    boardSpacingCm: 20,
    fixtureColumns: 1,
    fixtureRows: 1,
    fixtureSpacingXCm: 20,
    fixtureSpacingYCm: 20,
  };
}

async function openImportExportPanel(page) {
  await openBoardPlanner(page);
  await page.getByText("Library Import / Export", { exact: true }).click();
  await expect(page.getByLabel("Import JSON")).toBeVisible();
}

test("library import reports malformed JSON without writing storage", async ({
  page,
}) => {
  await page.goto("/");
  await openImportExportPanel(page);

  await page.getByLabel("Import JSON").fill("{not-json");
  await page.getByRole("button", { name: "Import Library" }).click();

  await expect(page.getByText("Import JSON is invalid.")).toBeVisible();
});

test("library import merge-skip reports duplicate skips", async ({ page }) => {
  const duplicateBoard = createLegacyBoardPayload();
  await page.addInitScript(
    ({ storageKey, board }) => {
      window.localStorage.setItem(storageKey, JSON.stringify([board]));
    },
    { storageKey: STORAGE_KEY, board: duplicateBoard },
  );

  await page.goto("/");
  await openImportExportPanel(page);

  await page.getByLabel("Import Mode").selectOption("mergeSkipDuplicates");
  await page
    .getByLabel("Import JSON")
    .fill(JSON.stringify({ boards: [duplicateBoard] }));
  await page.getByRole("button", { name: "Import Library" }).click();

  await expect(
    page.getByText(/Imported 1 boards .*skipped 1 duplicate/),
  ).toBeVisible();
});
