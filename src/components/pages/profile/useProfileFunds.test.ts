import { describe, expect, it, vi } from "vitest";
import { loadProfileFundsRows } from "./useProfileFunds";

const labels = { txDeposit: "充值", txWithdraw: "提现" };

describe("loadProfileFundsRows", () => {
  it("returns empty rows when API returns no movements", async () => {
    const rows = await loadProfileFundsRows(vi.fn().mockResolvedValue([]), labels);
    expect(rows).toEqual([]);
  });

  it("maps deposit movements for funds tab display", async () => {
    const rows = await loadProfileFundsRows(
      vi.fn().mockResolvedValue([
        {
          movementType: "deposit",
          amountUsd: 25,
          occurredAt: "2025-06-01T10:00:00.000Z",
          status: "completed",
        },
      ]),
      labels
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("充值");
    expect(rows[0]?.amountDisplay).toBe("+$25.00");
  });
});
