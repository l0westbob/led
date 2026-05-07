import { expect, test } from "@playwright/test";

test("Board config modal supports dialog keyboard behavior", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add Board" }).click();
  const configButton = page.getByRole("button", { name: "Config" });
  await configButton.click();

  const dialog = page.getByRole("dialog", { name: "Board Drive Config" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Constant Voltage" }),
  ).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: "Constant Voltage" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(configButton).toBeFocused();

  await configButton.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(configButton).toBeFocused();
});
