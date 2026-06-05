import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADDRESSES } from "@/lib/constants";

const { executeDepositWalletBatch, wait } = vi.hoisted(() => ({
  executeDepositWalletBatch: vi.fn(),
  wait: vi.fn(),
}));

const mockRelayClient = {
  executeDepositWalletBatch,
} as unknown as import("@polymarket/builder-relayer-client").RelayClient;

vi.mock("@/auth/collateralBalance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/collateralBalance")>();
  return {
    ...actual,
    findMissingPusdAllowances: vi.fn(),
    findMissingErc1155Operators: vi.fn(),
    buildPusdApprovalRelayBatchForSpenders: vi.fn((spenders: string[]) =>
      spenders.map((s) => ({ to: ADDRESSES.pUSD, data: `approve-${s}`, value: "0" }))
    ),
    buildErc1155ApprovalRelayBatchForOperators: vi.fn((ops: string[]) =>
      ops.map((o) => ({ to: ADDRESSES.CTF, data: `setApproval-${o}`, value: "0" }))
    ),
  };
});

import {
  findMissingErc1155Operators,
  findMissingPusdAllowances,
} from "@/auth/collateralBalance";
import {
  ensureDepositErc1155ApprovalsForMarket,
  ensureDepositTradingApprovalsForMarket,
  executeDepositWalletRelayBatches,
  MARKET_MINIMAL_SINGLE_BATCH_MAX,
} from "./depositVaultOps";

const VAULT = "0xVault0000000000000000000000000000000001";
const provider = {} as import("ethers").providers.Provider;

describe("executeDepositWalletRelayBatches", () => {
  beforeEach(() => {
    executeDepositWalletBatch.mockReset();
    wait.mockReset();
    executeDepositWalletBatch.mockReturnValue({ wait });
    wait.mockResolvedValue(undefined);
  });

  it("普市 1 笔 approve 只调用一次 executeDepositWalletBatch", async () => {
    const txs = [{ to: ADDRESSES.pUSD, data: "0x", value: "0" }];
    await executeDepositWalletRelayBatches(mockRelayClient, VAULT, txs);
    expect(executeDepositWalletBatch).toHaveBeenCalledOnce();
  });

  it("Neg Risk 2 笔 approve 仍只签一批", async () => {
    const txs = [
      { to: ADDRESSES.pUSD, data: "0x1", value: "0" },
      { to: ADDRESSES.pUSD, data: "0x2", value: "0" },
    ];
    expect(txs.length).toBeLessThanOrEqual(MARKET_MINIMAL_SINGLE_BATCH_MAX);
    await executeDepositWalletRelayBatches(mockRelayClient, VAULT, txs);
    expect(executeDepositWalletBatch).toHaveBeenCalledOnce();
  });

  it("超过 MARKET_MINIMAL_SINGLE_BATCH_MAX 时分多批", async () => {
    const txs = Array.from({ length: 5 }, (_, i) => ({
      to: ADDRESSES.pUSD,
      data: `0x${i}`,
      value: "0",
    }));
    await executeDepositWalletRelayBatches(mockRelayClient, VAULT, txs);
    expect(executeDepositWalletBatch).toHaveBeenCalledTimes(2);
  });
});

describe("ensureDepositTradingApprovalsForMarket", () => {
  beforeEach(() => {
    executeDepositWalletBatch.mockReset();
    wait.mockReset();
    executeDepositWalletBatch.mockReturnValue({ wait });
    wait.mockResolvedValue(undefined);
    vi.mocked(findMissingPusdAllowances).mockReset();
  });

  it("普通市场仅补 Exchange V2 一次 batch", async () => {
    vi.mocked(findMissingPusdAllowances)
      .mockResolvedValueOnce([ADDRESSES.CTF_EXCHANGE_V2])
      .mockResolvedValueOnce([]);

    await ensureDepositTradingApprovalsForMarket(
      mockRelayClient,
      VAULT,
      provider,
      false
    );

    expect(findMissingPusdAllowances).toHaveBeenCalledTimes(2);
    expect(executeDepositWalletBatch).toHaveBeenCalledOnce();
  });

  it("Neg Risk 一次 batch 含 Adapter 与 Exchange V2", async () => {
    vi.mocked(findMissingPusdAllowances)
      .mockResolvedValueOnce([
        ADDRESSES.NEG_RISK_ADAPTER,
        ADDRESSES.NEG_RISK_CTF_EXCHANGE_V2,
      ])
      .mockResolvedValueOnce([]);

    await ensureDepositTradingApprovalsForMarket(
      mockRelayClient,
      VAULT,
      provider,
      true
    );

    expect(executeDepositWalletBatch).toHaveBeenCalledOnce();
    const calls = executeDepositWalletBatch.mock.calls[0][0];
    expect(calls).toHaveLength(2);
  });
});

describe("ensureDepositErc1155ApprovalsForMarket", () => {
  beforeEach(() => {
    executeDepositWalletBatch.mockReset();
    wait.mockReset();
    executeDepositWalletBatch.mockReturnValue({ wait });
    wait.mockResolvedValue(undefined);
    vi.mocked(findMissingErc1155Operators).mockReset();
  });

  it("卖出普通市场仅补一个 operator", async () => {
    vi.mocked(findMissingErc1155Operators)
      .mockResolvedValueOnce([ADDRESSES.CTF_EXCHANGE_V2])
      .mockResolvedValueOnce([]);

    await ensureDepositErc1155ApprovalsForMarket(
      mockRelayClient,
      VAULT,
      provider,
      false
    );

    expect(executeDepositWalletBatch).toHaveBeenCalledOnce();
  });
});
