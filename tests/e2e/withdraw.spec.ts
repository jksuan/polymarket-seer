import { expect, test } from "@playwright/test";

const EVM_RECIPIENT = "0x4EB15202AAe85EA5924fA40bCED6b4Fd0533F8C1";
const SOL_RECIPIENT = "CrvTBvzryYxBHbWu2TiQpcqD5M7Le7iBKzVmEj3f36Jb";
const BTC_RECIPIENT = "bc1q8eau83qffxcj8ht4hsjdza3lha9r3egfqysj3g";
const TRON_RECIPIENT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

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

test("rejects EVM address when receive chain is Solana", async ({ page }) => {
  await page.getByTestId("withdraw-chain").selectOption({ label: "Solana" });
  await page.getByTestId("withdraw-recipient").fill(EVM_RECIPIENT);
  await expect(page.getByText(/valid Solana recipient/i)).toBeVisible();
});

test("accepts Solana address on Solana chain", async ({ page }) => {
  await page.getByTestId("withdraw-chain").selectOption({ label: "Solana" });
  await page.getByTestId("withdraw-recipient").fill(SOL_RECIPIENT);
  await expect(page.getByText(/valid Solana recipient/i)).not.toBeVisible();
});

test("accepts Bitcoin address on Bitcoin chain", async ({ page }) => {
  await page.getByTestId("withdraw-chain").selectOption({ label: "Bitcoin" });
  await page.getByTestId("withdraw-recipient").fill(BTC_RECIPIENT);
  await expect(page.getByText(/valid Bitcoin recipient/i)).not.toBeVisible();
});

test("accepts Tron address on Tron chain", async ({ page }) => {
  await page.getByTestId("withdraw-chain").selectOption({ label: "Tron" });
  await page.getByTestId("withdraw-recipient").fill(TRON_RECIPIENT);
  await expect(page.getByText(/valid Tron recipient/i)).not.toBeVisible();
});

test("enables withdraw after valid form and mock quote", async ({ page }) => {
  await page.getByTestId("withdraw-recipient").fill(EVM_RECIPIENT);
  await page.getByTestId("withdraw-amount").fill("3");
  await page.getByTestId("refresh-quote").click();
  await expect(page.getByRole("button", { name: "Withdraw" })).toBeEnabled();
});
