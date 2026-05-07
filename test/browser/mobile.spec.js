import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile viewport keeps core planner controls visible without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "Lamp Planner" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Board Planner" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Board" })).toBeVisible();
  await expect(page.getByRole("img", { name: "PPFD heatmap" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
