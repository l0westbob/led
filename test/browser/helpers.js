import { expect } from "@playwright/test";

export async function openBoardPlanner(page) {
  const boardPlanner = page.getByRole("button", { name: "Board Planner" });
  await boardPlanner.click();
  await expect(boardPlanner).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Board Planner" }),
  ).toBeVisible();
}

export async function openLedLab(page) {
  await openBoardPlanner(page);
  await page.getByRole("heading", { name: "LED Lab" }).click();
  await expect(
    page.getByRole("img", { name: "Spectral comparison chart" }),
  ).toBeVisible();
}

export async function regenerateBoardGrid(page) {
  await page.getByRole("button", { name: "Regenerate Grid" }).click();
}
