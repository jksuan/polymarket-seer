import { expect, test } from "@playwright/test";

const EVM_RECIPIENT = "0x4EB15202AAe85EA5924fA40bCED6b4Fd0533F8C1";
const SOL_RECIPIENT = "CrvTBvzryYxBHbWu2TiQpcqD5M7Le7iBKzVmEj3f36Jb";

async function selectWithdrawToken(page: import("@playwright/test").Page, symbol: string) {
  await page.getByTestId("withdraw-token-trigger").click();
  await page
    .getByTestId("withdraw-token-menu")
    .getByTestId("withdraw-token-option")
    .filter({ hasText: symbol })
    .first()
    .click();
}

async function selectWithdrawChain(page: import("@playwright/test").Page, chainName: string) {
  await page.getByTestId("withdraw-chain-trigger").click();
  await page
    .getByTestId("withdraw-chain-menu")
    .getByTestId("withdraw-chain-option")
    .filter({ hasText: chainName })
    .first()
    .click();
}

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
  await selectWithdrawChain(page, "Solana");
  await page.getByTestId("withdraw-recipient").fill(EVM_RECIPIENT);
  await expect(page.getByText(/valid Solana recipient/i)).toBeVisible();
});

test("accepts Solana address on Solana chain", async ({ page }) => {
  await selectWithdrawChain(page, "Solana");
  await page.getByTestId("withdraw-recipient").fill(SOL_RECIPIENT);
  await expect(page.getByText(/valid Solana recipient/i)).not.toBeVisible();
});

test("token selection filters receive chains for that token", async ({ page }) => {
  await selectWithdrawToken(page, "ETH");
  await page.getByTestId("withdraw-chain-trigger").click();
  const chainMenu = page.getByTestId("withdraw-chain-menu");
  await expect(chainMenu.getByTestId("withdraw-chain-option")).toHaveCount(1);
  await expect(chainMenu.getByTestId("withdraw-chain-option").filter({ hasText: "Ethereum" })).toHaveCount(1);
  await page.keyboard.press("Escape");

  await selectWithdrawToken(page, "USDC");
  await page.getByTestId("withdraw-chain-trigger").click();
  await expect(chainMenu.getByTestId("withdraw-chain-option")).toHaveCount(3);
  await expect(chainMenu.getByTestId("withdraw-chain-option").filter({ hasText: "Polygon" })).toHaveCount(1);
  await expect(chainMenu.getByTestId("withdraw-chain-option").filter({ hasText: "Arbitrum" })).toHaveCount(1);
  await expect(chainMenu.getByTestId("withdraw-chain-option").filter({ hasText: "Solana" })).toHaveCount(1);
});

test("enables withdraw after valid form and mock quote", async ({ page }) => {
  await page.getByTestId("withdraw-recipient").fill(EVM_RECIPIENT);
  await page.getByTestId("withdraw-amount").fill("3");
  await page.getByTestId("refresh-quote").click();
  await expect(page.getByRole("button", { name: "Withdraw" })).toBeEnabled();
});
