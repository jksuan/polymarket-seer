import { describe, expect, it } from "vitest";
import type { BridgeTransaction } from "@/types/bridge";
import { getTransferStatusSinceAddressCreated, isBridgeCompletedStatus } from "./status";

function makeTx(partial: Partial<BridgeTransaction>): BridgeTransaction {
  return {
    status: "PROCESSING",
    createdTimeMs: 0,
    ...partial,
  };
}

describe("getTransferStatusSinceAddressCreated", () => {
  it("忽略地址创建之前的历史完成单", () => {
    const createdAtMs = 2_000_000;
    const status = getTransferStatusSinceAddressCreated([
      makeTx({ status: "COMPLETED", createdTimeMs: 1_000_000 }),
    ], createdAtMs);
    expect(status).toBeUndefined();
  });

  it("返回地址创建之后最新一笔的状态", () => {
    const createdAtMs = 2_000_000;
    const status = getTransferStatusSinceAddressCreated([
      makeTx({ status: "DEPOSIT_DETECTED", createdTimeMs: 2_001_000 }),
      makeTx({ status: "PROCESSING", createdTimeMs: 2_005_000 }),
    ], createdAtMs);
    expect(status).toBe("PROCESSING");
  });
});

describe("isBridgeCompletedStatus", () => {
  it("仅在状态为 COMPLETED 时返回 true", () => {
    expect(isBridgeCompletedStatus("COMPLETED")).toBe(true);
    expect(isBridgeCompletedStatus("completed")).toBe(true);
    expect(isBridgeCompletedStatus("PROCESSING")).toBe(false);
    expect(isBridgeCompletedStatus(undefined)).toBe(false);
  });
});
