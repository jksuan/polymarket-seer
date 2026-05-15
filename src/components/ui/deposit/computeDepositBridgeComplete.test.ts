import { describe, expect, it } from "vitest";
import { computeDepositBridgeComplete } from "./computeDepositBridgeComplete";

describe("computeDepositBridgeComplete", () => {
  it("匹配 txHash 且状态为 COMPLETED 时返回 true", () => {
    const result = computeDepositBridgeComplete({
      hasSubmittedTx: true,
      transferAddress: "0xaddr",
      executionTxHash: "0xabc",
      executionSubmittedAtMs: 1_000,
      transactions: [
        { txHash: "0xABC", status: "COMPLETED", createdTimeMs: 1_000 },
      ],
    });
    expect(result).toBe(true);
  });

  it("未提交或无收款地址时返回 false", () => {
    expect(
      computeDepositBridgeComplete({
        hasSubmittedTx: false,
        transferAddress: "0xaddr",
        executionTxHash: "",
        executionSubmittedAtMs: 0,
        transactions: [{ status: "COMPLETED" }],
      })
    ).toBe(false);
  });
});
