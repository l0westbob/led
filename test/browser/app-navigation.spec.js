import { expect, test } from "@playwright/test";
import { openBoardPlanner, openLedLab } from "./helpers.js";

test("app mounts on the Lamp Planner", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "Lamp Planner" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Board Setup" }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "PPFD heatmap" })).toBeVisible();
});

test("switches between Lamp Planner and Board Planner", async ({ page }) => {
  await page.goto("/");

  await openBoardPlanner(page);
  await page.getByRole("button", { name: "Lamp Planner" }).click();

  await expect(
    page.getByRole("button", { name: "Lamp Planner" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Board Setup" }),
  ).toBeVisible();
});

test("LED Lab renders the spectral chart", async ({ page }) => {
  await page.goto("/");
  await openLedLab(page);
});
