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

  it("返回过滤后列表首条状态（约定为新到旧排序下最新一笔）", () => {
    const createdAtMs = 2_000_000;
    const status = getTransferStatusSinceAddressCreated(
      [
        makeTx({ status: "PROCESSING", createdTimeMs: 2_005_000 }),
        makeTx({ status: "DEPOSIT_DETECTED", createdTimeMs: 2_001_000 }),
      ],
      createdAtMs
    );
    expect(status).toBe("PROCESSING");
  });

  it("首条为无时间戳 DEPOSIT_DETECTED 时不被其后更大时间戳的旧行覆盖", () => {
    const createdAtMs = 2_000_000;
    const status = getTransferStatusSinceAddressCreated(
      [
        makeTx({ status: "DEPOSIT_DETECTED", createdTimeMs: undefined }),
        makeTx({ status: "COMPLETED", createdTimeMs: 9_999_999 }),
      ],
      createdAtMs
    );
    expect(status).toBe("DEPOSIT_DETECTED");
  });

  it("过滤后首条优先，不按 createdTimeMs 最大值反推最新状态", () => {
    const createdAtMs = 2_000_000;
    const status = getTransferStatusSinceAddressCreated(
      [
        makeTx({ status: "PROCESSING", createdTimeMs: 2_100_000 }),
        makeTx({ status: "COMPLETED", createdTimeMs: 2_900_000 }),
      ],
      createdAtMs
    );
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

  it("较高阈值下旧 COMPLETED 被过滤后仍保留无时间戳的 DEPOSIT_DETECTED（新一轮检测）", () => {
    const baselineMs = 3_000_000;
    const txs = getTransferTransactionsSinceAddressCreated(
      [
        makeTx({ status: "COMPLETED", createdTimeMs: 1_000_000 }),
        makeTx({ status: "DEPOSIT_DETECTED", createdTimeMs: undefined }),
      ],
      baselineMs
    );
    expect(txs.map((tx) => tx.status)).toEqual(["DEPOSIT_DETECTED"]);
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

