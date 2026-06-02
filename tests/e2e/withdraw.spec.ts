import { expect, test } from "@playwright/test";

const EVM_RECIPIENT = "0x4EB15202AAe85EA5924fA40bCED6b4Fd0533F8C1";

test.beforeEach(async ({ page }) => {
  await page.goto("/testing/withdraw");
  await page.getByTestId("enter-withdraw-fixture").click();
});

test("shows minimum amount error below $3", async ({ page }) => {
  await page.getByTestId("withdraw-recipient").fill(EVM_RECIPIENT);
  await page.getByTestId("withdraw-amount").fill("2");
  await expect(page.getByText(/Minimum Amount is \$3\.00/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter amount" })).toBeDisabled();
});

test("shows fixed Polygon PUSD destination and Uniswap hint", async ({ page }) => {
  await expect(page.getByText("Polygon")).toBeVisible();
  await expect(page.getByText("PUSD")).toBeVisible();
  await expect(page.getByRole("link", { name: "Uniswap" })).toHaveAttribute(
    "href",
    "https://app.uniswap.org/"
  );
});

test("enables withdraw after valid form without quote", async ({ page }) => {
  await page.getByTestId("withdraw-recipient").fill(EVM_RECIPIENT);
  await page.getByTestId("withdraw-amount").fill("3");
  await expect(page.getByRole("button", { name: "Withdraw" })).toBeEnabled();
});
