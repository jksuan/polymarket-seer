import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  buildLegacyUsdcWrapRelayBatch,
  buildPusdTradingApprovalRelayBatch,
  ensureProxyCollateralSynced,
  formatCollateralBalanceFromAtomicUnits,
  getExchangeSpenderForMarket,
  getRequiredPusdSpendersForMarket,
  parseCollateralAtomicUnits,
  resetCollateralWrapStateForTests,
  syncAndGetClobCollateralAllowance,
  TRADING_APPROVAL_SPENDERS,
} from "./collateralBalance";

import { ADDRESSES } from "@/lib/constants";



const TEST_PROXY = "0xAf4baFAFb78259e48d502abC9c480fAc070b3e6d";

describe("collateralBalance", () => {

  beforeEach(() => {

    resetCollateralWrapStateForTests();

  });



  it("parseCollateralAtomicUnits 解析 6 位小数 atomic", () => {

    expect(parseCollateralAtomicUnits("550000")).toBe(550000n);

    expect(parseCollateralAtomicUnits(null)).toBe(0n);

  });



  it("formatCollateralBalanceFromAtomicUnits 格式化为两位小数", () => {

    expect(formatCollateralBalanceFromAtomicUnits(550000n)).toBe("0.55");

  });



  it("syncAndGetClobCollateralAllowance 先 update 再 get", async () => {

    const updateBalanceAllowance = vi.fn(async () => {});

    const getBalanceAllowance = vi.fn(async () => ({ balance: "550000" }));

    const client = { updateBalanceAllowance, getBalanceAllowance };



    const result = await syncAndGetClobCollateralAllowance(client);



    expect(updateBalanceAllowance).toHaveBeenCalledBefore(getBalanceAllowance);

    expect(updateBalanceAllowance).toHaveBeenCalledWith({ asset_type: "COLLATERAL" });

    expect(result?.balance).toBe("550000");

  });



  it("buildLegacyUsdcWrapRelayBatch 包含 approve 与 wrap", () => {

    const batch = buildLegacyUsdcWrapRelayBatch(TEST_PROXY, 550000n);

    expect(batch).toHaveLength(2);

    expect(batch[0].to).toMatch(/^0x/i);

    expect(batch[1].to).toMatch(/^0x/i);

  });



  it("CLOB=0 且 proxy 有 USDC.e 时经 relayer wrap 后返回 sync 余额", async () => {

    let clobBalance = "0";

    const updateBalanceAllowance = vi.fn(async () => {});

    const getBalanceAllowance = vi.fn(async () => ({ balance: clobBalance }));

    const clobClient = { updateBalanceAllowance, getBalanceAllowance };



    const execute = vi.fn(async () => {

      clobBalance = "550000";

    });



    const result = await ensureProxyCollateralSynced({

      clobClient,

      provider: {} as any,

      proxyAddress: TEST_PROXY,

      relayExecutor: { execute },

      readUsdcEAtomic: async () => 550000n,

    });



    expect(execute).toHaveBeenCalledOnce();

    expect(result.balanceAtomic).toBe(550000n);

  });



  it("CLOB=0 且 proxy 有 pUSD 时经 relayer approve 后返回 sync 余额", async () => {
    let clobBalance = "0";
    const updateBalanceAllowance = vi.fn(async () => {});
    const getBalanceAllowance = vi.fn(async () => ({ balance: clobBalance }));
    const clobClient = { updateBalanceAllowance, getBalanceAllowance };

    const execute = vi.fn(async () => {
      clobBalance = "3000000";
    });

    const result = await ensureProxyCollateralSynced({
      clobClient,
      provider: {} as any,
      proxyAddress: TEST_PROXY,
      relayExecutor: { execute },
      readUsdcEAtomic: async () => 0n,
      readPusdAtomic: async () => 3_000_000n,
    });

    expect(execute).toHaveBeenCalledOnce();
    expect(result.balanceAtomic).toBe(3000000n);
  });

  it("buildPusdTradingApprovalRelayBatch 包含 CTF Exchange V2 spenders", () => {
    const batch = buildPusdTradingApprovalRelayBatch();
    expect(batch).toHaveLength(TRADING_APPROVAL_SPENDERS.length);
    expect(TRADING_APPROVAL_SPENDERS).toContain(ADDRESSES.CTF_EXCHANGE_V2);
    expect(batch.every((tx) => tx.to === ADDRESSES.pUSD)).toBe(true);
  });

  it("getExchangeSpenderForMarket 返回 CLOB 实际校验的 spender", () => {
    expect(getExchangeSpenderForMarket(false)).toBe(ADDRESSES.CTF_EXCHANGE_V2);
    expect(getExchangeSpenderForMarket(true)).toBe(ADDRESSES.NEG_RISK_ADAPTER);
  });

  it("getRequiredPusdSpendersForMarket Neg Risk 含 Adapter 与 Exchange V2", () => {
    expect(getRequiredPusdSpendersForMarket(true)).toEqual([
      ADDRESSES.NEG_RISK_ADAPTER,
      ADDRESSES.NEG_RISK_CTF_EXCHANGE_V2,
    ]);
  });

  it("CLOB 已有余额时不触发 wrap", async () => {

    const updateBalanceAllowance = vi.fn(async () => {});

    const getBalanceAllowance = vi.fn(async () => ({ balance: "3000000" }));

    const clobClient = { updateBalanceAllowance, getBalanceAllowance };

    const execute = vi.fn(async () => {});



    const result = await ensureProxyCollateralSynced({

      clobClient,

      provider: {} as any,

      proxyAddress: TEST_PROXY,

      relayExecutor: { execute },

      readUsdcEAtomic: async () => 550000n,

    });



    expect(execute).not.toHaveBeenCalled();

    expect(result.balanceAtomic).toBe(3000000n);

  });

});


