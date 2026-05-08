import { expect, test } from "@playwright/test";

test("transfer step happy path with mocked fixture", async ({ page }) => {
  await page.goto("/testing/deposit-transfer");

  await page.getByRole("button", { name: "进入转账步骤" }).click();
  await expect(page.getByText("代币")).toBeVisible();
  await expect(page.getByText("网络")).toBeVisible();

  await page.getByRole("button", { name: /Ethereum/ }).click();
  await page.getByRole("button", { name: /Polygon/ }).click();
  await expect(page.getByRole("button", { name: /Polygon/ })).toBeVisible();

  await page.getByRole("button", { name: "复制地址" }).click();
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();
});
