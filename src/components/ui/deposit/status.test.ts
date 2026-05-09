import { describe, expect, it } from "vitest";
import type { BridgeTransaction } from "@/types/bridge";
import {
  getTransferTransactionsSinceAddressCreated,
  getTransferStatusSinceAddressCreated,
  isBridgeCompletedStatus,
} from "./status";

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

describe("getTransferTransactionsSinceAddressCreated", () => {
  it("返回创建后可用于展示判定的交易集合", () => {
    const createdAtMs = 2_000_000;
    const txs = getTransferTransactionsSinceAddressCreated([
      makeTx({ status: "COMPLETED", createdTimeMs: 1_000_000 }),
      makeTx({ status: "DEPOSIT_DETECTED", createdTimeMs: 2_000_500 }),
      makeTx({ status: "COMPLETED", createdTimeMs: 2_004_000 }),
    ], createdAtMs);
    expect(txs.map((tx) => tx.status)).toEqual(["DEPOSIT_DETECTED", "COMPLETED"]);
  });

  it("保留无 createdTimeMs 的 DEPOSIT_DETECTED 以支持中间态补显", () => {
    const createdAtMs = 2_000_000;
    const txs = getTransferTransactionsSinceAddressCreated([
      makeTx({ status: "DEPOSIT_DETECTED", createdTimeMs: undefined }),
      makeTx({ status: "COMPLETED", createdTimeMs: 2_005_000 }),
    ], createdAtMs);
    expect(txs.map((tx) => tx.status)).toEqual(["DEPOSIT_DETECTED", "COMPLETED"]);
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

