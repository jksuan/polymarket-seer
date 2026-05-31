import { describe, expect, it, vi, beforeEach } from "vitest";

const { getDeployed, deployDepositWallet, wait } = vi.hoisted(() => ({
  getDeployed: vi.fn(),
  deployDepositWallet: vi.fn(),
  wait: vi.fn(),
}));

vi.mock("@/auth/vault/relayClientFactory", () => ({
  createTradingRelayClient: vi.fn(() => ({
    getDeployed,
    deployDepositWallet,
  })),
}));

import { ensureTradingVaultDeployed } from "./ensureTradingVaultDeployed";

const TEST_VAULT = "0xAf4baFAFb78259e48d502abC9c480fAc070b3e6d";
const mockSigner = {} as import("ethers").Signer;

describe("ensureTradingVaultDeployed", () => {
  beforeEach(() => {
    getDeployed.mockReset();
    deployDepositWallet.mockReset();
    wait.mockReset();
    deployDepositWallet.mockReturnValue({ wait });
  });

  it("Deposit Wallet 已部署时跳过 deploy", async () => {
    getDeployed.mockResolvedValue(true);

    await ensureTradingVaultDeployed(mockSigner, TEST_VAULT);

    expect(getDeployed).toHaveBeenCalledWith(TEST_VAULT, "WALLET");
    expect(deployDepositWallet).not.toHaveBeenCalled();
  });

  it("Deposit Wallet 未部署时调用 deployDepositWallet 并等待确认", async () => {
    getDeployed.mockResolvedValue(false);

    await ensureTradingVaultDeployed(mockSigner, TEST_VAULT);

    expect(deployDepositWallet).toHaveBeenCalledOnce();
    expect(wait).toHaveBeenCalledOnce();
  });
});
