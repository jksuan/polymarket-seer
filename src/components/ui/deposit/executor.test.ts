import { describe, expect, it, vi } from "vitest";
import * as evmModule from "./evm";
import { executeConnectedOrder } from "./executor";
import type { ExecutionSnapshot } from "./types";

function makeSnapshot(engine: "evm" | "svm"): ExecutionSnapshot {
  return {
    executionEngine: engine,
    kind: "direct-transfer",
    asset: {
      id: "1-usdc",
      chainId: "1",
      chainName: "Ethereum",
      symbol: "USDC",
      name: "USD Coin",
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      decimals: 6,
      isNative: false,
    },
    amountUsd: 10,
    sourceAmountBaseUnit: "10000000",
    sendBaseUnit: "10000000",
    sendAmountFloat: 10,
    sendDisplay: "10 USDC",
    sendUsd: 10,
    receiveBaseUnit: "10000000",
    receiveDecimals: 6,
    receiveDisplay: "10.0000",
    receiveSymbol: "pUSD",
    receiveUsd: 10,
    recipientAddress: "0x1111111111111111111111111111111111111111",
    tx: { to: "0x1111111111111111111111111111111111111111", data: "0x", value: "0" },
    approveSpender: "0x2222222222222222222222222222222222222222",
    quotedAtMs: Date.now(),
    expiresAtMs: Date.now() + 30000,
  };
}

describe("executeConnectedOrder", () => {
  it("svm 当前返回引导改走 transfer 的占位错误", async () => {
    await expect(
      executeConnectedOrder({
        locale: "zh",
        snapshot: makeSnapshot("svm"),
        wallet: {},
        walletAddress: "0xabc",
      })
    ).rejects.toThrow("Solana 执行路径尚未开放");
  });

  it("evm 调用链切换、授权与发送交易", async () => {
    const getProviderSpy = vi
      .spyOn(evmModule, "getWalletEthereumProvider")
      .mockResolvedValue({ request: vi.fn() });
    const switchSpy = vi.spyOn(evmModule, "switchEvmChain").mockResolvedValue();
    const approveSpy = vi.spyOn(evmModule, "approveErc20IfNeeded").mockResolvedValue();
    const sendSpy = vi.spyOn(evmModule, "sendPreparedEvmTx").mockResolvedValue("0xtx");

    const result = await executeConnectedOrder({
      locale: "zh",
      snapshot: makeSnapshot("evm"),
      wallet: { id: "wallet" },
      walletAddress: "0x3333333333333333333333333333333333333333",
    });

    expect(result.txHash).toBe("0xtx");
    expect(getProviderSpy).toHaveBeenCalledTimes(1);
    expect(switchSpy).toHaveBeenCalledTimes(1);
    expect(approveSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    getProviderSpy.mockRestore();
    switchSpy.mockRestore();
    approveSpy.mockRestore();
    sendSpy.mockRestore();
  });
});
