import { expect, test } from "@playwright/test";

test("connected confirm error can fallback to transfer", async ({ page }) => {
  await page.goto("/testing/connected-fallback");

  await expect(page.getByText("mock execute error")).toBeVisible();
  await page.getByRole("button", { name: "改走 Transfer Crypto" }).click();

  await expect(page.getByText("代币")).toBeVisible();
  await expect(page.getByText("网络")).toBeVisible();
});
