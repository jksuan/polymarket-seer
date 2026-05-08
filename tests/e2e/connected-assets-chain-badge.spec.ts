import { expect, test } from "@playwright/test";

test("connected assets show chain badges for multi-chain ETH", async ({ page }) => {
  await page.goto("/testing/connected-assets");

  await expect(page.getByLabel("Chain 10")).toBeVisible();
  await expect(page.getByLabel("Chain 8453")).toBeVisible();
  await expect(page.getByLabel("Chain 42161")).toBeVisible();
});
