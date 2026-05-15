import { describe, expect, it } from "vitest";
import { isHighWalletMismatchRisk } from "./risk";
import type { ExecutionSnapshot } from "./types";

function snapshot(partial: Partial<ExecutionSnapshot>): ExecutionSnapshot {
  return {
    executionEngine: "evm",
    kind: "cross-chain",
    asset: {
      id: "1-usdc",
      chainId: "1",
      chainName: "Ethereum",
      symbol: "USDC",
      name: "USD Coin",
      tokenAddress: "0x1",
      decimals: 6,
    },
    amountUsd: 100,
    sourceAmountBaseUnit: "0",
    sendBaseUnit: "0",
    sendAmountFloat: 0,
    sendDisplay: "0",
    receiveBaseUnit: "0",
    receiveDecimals: 6,
    receiveDisplay: "0",
    recipientAddress: "0x2",
    tx: { to: "0x3", data: "0x", value: "0" },
    quotedAtMs: 0,
    expiresAtMs: 0,
    ...partial,
  };
}

describe("isHighWalletMismatchRisk", () => {
  it("直转入金路径不提示", () => {
    expect(
      isHighWalletMismatchRisk(
        snapshot({ kind: "direct-transfer", sendUsd: 100, receiveUsd: 50 })
      )
    ).toBe(false);
  });

  it("发送与到账美元偏差超过 20% 时提示", () => {
    expect(
      isHighWalletMismatchRisk(snapshot({ sendUsd: 100, receiveUsd: 70 }))
    ).toBe(true);
  });

  it("小额或偏差在阈值内不提示", () => {
    expect(
      isHighWalletMismatchRisk(snapshot({ sendUsd: 4, receiveUsd: 1 }))
    ).toBe(false);
    expect(
      isHighWalletMismatchRisk(snapshot({ sendUsd: 100, receiveUsd: 85 }))
    ).toBe(false);
  });
});
