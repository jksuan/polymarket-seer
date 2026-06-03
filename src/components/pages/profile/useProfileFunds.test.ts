import { describe, expect, it, vi } from "vitest";
import type { FundsMovementListItem } from "@/types/funds";
import { deriveProfileFundsRows, loadProfileFundsRows } from "./useProfileFunds";

const labelsZh = { txDeposit: "充值", txWithdraw: "提现" };
const labelsEn = { txDeposit: "Deposit", txWithdraw: "Withdraw" };

const sampleDeposit: FundsMovementListItem = {
  movementType: "deposit",
  amountUsd: 25,
  occurredAt: "2025-06-01T10:00:00.000Z",
  status: "completed",
};

describe("deriveProfileFundsRows", () => {
  it("同一批 items 随 labels 切换而更新标签文案，无需重新请求", () => {
    const zh = deriveProfileFundsRows([sampleDeposit], labelsZh);
    const en = deriveProfileFundsRows([sampleDeposit], labelsEn);
    expect(zh[0]?.label).toBe("充值");
    expect(en[0]?.label).toBe("Deposit");
    expect(zh[0]?.amountDisplay).toBe(en[0]?.amountDisplay);
  });
});

describe("loadProfileFundsRows", () => {
  it("returns empty rows when API returns no movements", async () => {
    const rows = await loadProfileFundsRows(vi.fn().mockResolvedValue([]), labelsZh);
    expect(rows).toEqual([]);
  });

  it("maps deposit movements for funds tab display", async () => {
    const rows = await loadProfileFundsRows(
      vi.fn().mockResolvedValue([sampleDeposit]),
      labelsZh
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("充值");
    expect(rows[0]?.amountDisplay).toBe("+$25.00");
  });
});
