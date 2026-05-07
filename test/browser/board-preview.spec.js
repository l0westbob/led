import { expect, test } from "@playwright/test";
import { openBoardPlanner, regenerateBoardGrid } from "./helpers.js";

test("Board Preview exposes emitter selection", async ({ page }) => {
  await page.goto("/");
  await openBoardPlanner(page);

  await regenerateBoardGrid(page);

  const firstEmitter = page.getByRole("button", {
    name: "Emitter 1",
    exact: true,
  });
  await firstEmitter.click();

  await expect(firstEmitter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
});

test("PPFD heatmap canvas paints nonblank pixels", async ({ page }) => {
  await page.goto("/");

  const heatmap = page.getByRole("img", { name: "PPFD heatmap" });
  await expect(heatmap).toBeVisible();

  await expect
    .poll(async () =>
      heatmap.evaluate((canvas) => {
        const context = canvas.getContext("2d");
        if (!context || canvas.width <= 1 || canvas.height <= 1) {
          return 0;
        }
        const { data } = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        let paintedPixels = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (
            data[index] !== 0 ||
            data[index + 1] !== 0 ||
            data[index + 2] !== 0 ||
            data[index + 3] !== 0
          ) {
            paintedPixels += 1;
          }
        }
        return paintedPixels;
      }),
    )
    .toBeGreaterThan(1_000);
});

test("core controls expose stable labels and button names", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByLabel("Distance to Slice (cm)")).toBeVisible();
  await expect(page.getByLabel("Room Width (cm)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Board" })).toBeVisible();

  await openBoardPlanner(page);

  await page.getByText("Library Import / Export", { exact: true }).click();

  await expect(page.getByLabel("Import Mode")).toBeVisible();
  await expect(page.getByLabel("Import JSON")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Regenerate Grid" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Constant Voltage" }).first(),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("heading", { name: "LED Lab" }).click();
  await expect(
    page
      .getByLabel("LED Lab SPD mode")
      .getByRole("button", { name: "Relative" }),
  ).toHaveAttribute("aria-pressed", "true");
});
