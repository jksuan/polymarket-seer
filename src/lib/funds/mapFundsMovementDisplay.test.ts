import { describe, expect, it } from "vitest";
import { mapFundsMovementList } from "./mapFundsMovementDisplay";

describe("mapFundsMovementList", () => {
  it("formats deposit and withdraw rows", () => {
    const rows = mapFundsMovementList(
      [
        {
          movementType: "deposit",
          amountUsd: 10,
          occurredAt: "2025-06-01T12:00:00.000Z",
          status: "completed",
        },
        {
          movementType: "withdraw",
          amountUsd: 3.5,
          occurredAt: "2025-06-02T08:30:00.000Z",
          status: "completed",
        },
      ],
      { txDeposit: "充值", txWithdraw: "提现" }
    );

    expect(rows[0]?.amountDisplay).toBe("+$10.00");
    expect(rows[1]?.amountDisplay).toBe("-$3.50");
  });
});
