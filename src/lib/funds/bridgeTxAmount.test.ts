import { describe, expect, it } from "vitest";
import {
  readAmountUsdFromBaseUnit,
  resolveBridgeDepositAmountUsd,
} from "./bridgeTxAmount";

describe("resolveBridgeDepositAmountUsd", () => {
  it("parses USDC amount from fromAmountBaseUnit when usd field is absent", () => {
    const usd = resolveBridgeDepositAmountUsd({
      status: "COMPLETED",
      fromAmountBaseUnit: "25000000",
      fromChainId: "1",
    });
    expect(usd).toBe(25);
  });

  it("prefers explicit amountUsd when present", () => {
    const usd = resolveBridgeDepositAmountUsd({
      status: "COMPLETED",
      amountUsd: 12.34,
      fromAmountBaseUnit: "1000000",
    });
    expect(usd).toBe(12.34);
  });
});

describe("readAmountUsdFromBaseUnit", () => {
  it("uses token decimals when provided", () => {
    expect(readAmountUsdFromBaseUnit("1000000000000000000", 18, "ETH")).toBe(1);
  });
});
