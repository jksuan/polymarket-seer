import { expect, test } from "@playwright/test";

test("connected minimum label aligns with transfer chain-level minimum", async ({ page }) => {
  await page.goto("/testing/connected-minimum");

  await page.getByRole("button", { name: "选择 ETH" }).click();
  await expect(page.getByText("最低充值金额$5.00")).toBeVisible();
  await expect(page.getByRole("button", { name: "继续" })).toBeDisabled();

  await page.getByRole("button", { name: "选择 POL" }).click();
  await expect(page.getByText("最低充值金额$3.00")).toBeVisible();
});
