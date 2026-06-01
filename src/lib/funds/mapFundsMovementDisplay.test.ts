import { describe, expect, it } from "vitest";
import {
  formatFundsOccurredAt,
  mapFundsMovementDisplay,
} from "./mapFundsMovementDisplay";

const labels = { txDeposit: "充值", txWithdraw: "提现" };

describe("mapFundsMovementDisplay", () => {
  it("shows deposit as positive green amount with localized label", () => {
    const row = mapFundsMovementDisplay(
      {
        movementType: "deposit",
        amountUsd: 12.5,
        occurredAt: "2025-06-01T12:00:00.000Z",
        status: "completed",
      },
      labels,
      0
    );
    expect(row.label).toBe("充值");
    expect(row.amountDisplay).toBe("+$12.50");
    expect(row.amtColor).toBe("#6bff8f");
    expect(row.timeStr).toMatch(/^2025\/06\/01 \d{2}:\d{2}$/);
  });

  it("shows withdraw as negative red amount", () => {
    const row = mapFundsMovementDisplay(
      {
        movementType: "withdraw",
        amountUsd: 5,
        occurredAt: "2025-01-15T08:30:00.000Z",
        status: "completed",
      },
      labels,
      1
    );
    expect(row.label).toBe("提现");
    expect(row.amountDisplay).toBe("-$5.00");
    expect(row.amtColor).toBe("#ff6b6b");
  });
});

describe("formatFundsOccurredAt", () => {
  it("returns empty string for invalid iso", () => {
    expect(formatFundsOccurredAt("not-a-date")).toBe("");
  });
});
