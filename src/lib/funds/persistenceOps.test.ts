import { describe, expect, it } from "vitest";
import {
  buildCompletedMovementPayload,
  buildDepositBridgesPayload,
} from "./persistenceOps";

describe("buildCompletedMovementPayload", () => {
  it("builds stable idempotency key for same bridge completion", () => {
    const occurredAt = "2025-06-01T12:00:00.000Z";
    const a = buildCompletedMovementPayload({
      proxyAddress: "0xAbCdEf0123456789012345678901234567890AbCd",
      movementType: "deposit",
      amountUsd: 10,
      bridgeStatusAddress: "0x1111111111111111111111111111111111111111",
      occurredAt,
    });
    const b = buildCompletedMovementPayload({
      proxyAddress: "0xabcdef0123456789012345678901234567890abcd",
      movementType: "deposit",
      amountUsd: 10,
      bridgeStatusAddress: "0x1111111111111111111111111111111111111111",
      occurredAt,
    });
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.movementType).toBe("deposit");
    expect(a.status).toBe("completed");
    expect(a.amountUsd).toBe(10);
  });
});

describe("buildDepositBridgesPayload", () => {
  it("maps four chain addresses from deposit response", () => {
    const payload = buildDepositBridgesPayload("0xabcdef0123456789012345678901234567890abcd", {
      depositAddresses: {
        evm: "0xEvm1111111111111111111111111111111111111111",
        svm: "So111111111111111111111111111111111111111",
        tron: "TTron111111111111111111111111111111111",
        btc: "bc1qtestaddressxxxxxxxxxxxxxxxxxxxx",
      },
    });
    expect(payload.evmAddress).toBe("0xEvm1111111111111111111111111111111111111111");
    expect(payload.svmAddress).toBe("So111111111111111111111111111111111111111");
    expect(payload.tronAddress).toBe("TTron111111111111111111111111111111111");
    expect(payload.btcAddress).toBe("bc1qtestaddressxxxxxxxxxxxxxxxxxxxx");
  });
});
