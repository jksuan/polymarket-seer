import { describe, expect, it } from "vitest";
import { isWithdrawStatusPollTimedOut } from "./withdrawStatusPoll";
import { WITHDRAW_STATUS_POLL_TIMEOUT_MS } from "./constants";

describe("isWithdrawStatusPollTimedOut", () => {
  it("returns false when poll has not started", () => {
    expect(
      isWithdrawStatusPollTimedOut(null, false, Date.now(), WITHDRAW_STATUS_POLL_TIMEOUT_MS)
    ).toBe(false);
  });

  it("returns false before timeout elapses", () => {
    const now = 1_000_000;
    expect(
      isWithdrawStatusPollTimedOut(
        now - WITHDRAW_STATUS_POLL_TIMEOUT_MS + 1,
        false,
        now,
        WITHDRAW_STATUS_POLL_TIMEOUT_MS
      )
    ).toBe(false);
  });

  it("returns true after timeout when not final", () => {
    const now = 1_000_000;
    expect(
      isWithdrawStatusPollTimedOut(
        now - WITHDRAW_STATUS_POLL_TIMEOUT_MS - 1,
        false,
        now,
        WITHDRAW_STATUS_POLL_TIMEOUT_MS
      )
    ).toBe(true);
  });

  it("returns false when bridge status is final", () => {
    const now = 1_000_000;
    expect(
      isWithdrawStatusPollTimedOut(
        now - WITHDRAW_STATUS_POLL_TIMEOUT_MS - 1,
        true,
        now,
        WITHDRAW_STATUS_POLL_TIMEOUT_MS
      )
    ).toBe(false);
  });
});
