import { describe, expect, it } from "vitest";
import {
  buildDefaultIdempotencyKey,
  parseDepositBridgesBody,
  parseRecordMovementBody,
  parseUserWalletBody,
  parseWithdrawDestinationBody,
} from "./validation";

describe("funds validation", () => {
  it("parseUserWalletBody accepts valid addresses", () => {
    const result = parseUserWalletBody({
      signerAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
      sessionMode: "embedded",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.signerAddress).toBe(
        "0x1111111111111111111111111111111111111111"
      );
    }
  });

  it("parseWithdrawDestinationBody requires recipient", () => {
    const result = parseWithdrawDestinationBody({
      proxyAddress: "0x2222222222222222222222222222222222222222",
      toChainId: "137",
      toTokenAddress: "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB",
      recipientAddr: "0x3333333333333333333333333333333333333333",
    });
    expect(result.ok).toBe(true);
  });

  it("parseRecordMovementBody validates movement type", () => {
    const result = parseRecordMovementBody({
      proxyAddress: "0x2222222222222222222222222222222222222222",
      movementType: "deposit",
      status: "completed",
      amountUsd: 10.5,
      occurredAt: 1717200000,
      idempotencyKey: "dep:completed:0xabc:no-hash:2024-01-01T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
  });

  it("buildDefaultIdempotencyKey is stable", () => {
    const key = buildDefaultIdempotencyKey({
      movementType: "withdraw",
      status: "completed",
      bridgeStatusAddress: "0xAbC",
      txHash: "0xHash",
      occurredAt: "2024-06-01T00:00:00.000Z",
    });
    expect(key).toContain("withdraw");
    expect(key).toContain("0xabc");
  });

  it("parseDepositBridgesBody allows partial chain addresses", () => {
    const result = parseDepositBridgesBody({
      proxyAddress: "0x2222222222222222222222222222222222222222",
      evmAddress: "0xB7900fb0b889263F180852BE878Db0ff056Bf5f3",
    });
    expect(result.ok).toBe(true);
  });
});
