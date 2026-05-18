import { describe, expect, it } from "vitest";
import { formatWithdrawExecutionError, getWithdrawFlowMessages } from "./withdrawMessages";

describe("formatWithdrawExecutionError", () => {
  it("maps user rejected to Chinese copy", () => {
    expect(formatWithdrawExecutionError("zh", "User rejected the request")).toBe("提现请求被取消");
  });

  it("maps user rejected to English copy", () => {
    expect(formatWithdrawExecutionError("en", "User rejected the request")).toBe(
      "Withdrawal request cancelled"
    );
  });

  it("uses initiated copy for submitted status in zh", () => {
    expect(getWithdrawFlowMessages("zh").submitted).toBe("已发起提现");
  });

  it("keeps unrelated errors", () => {
    expect(formatWithdrawExecutionError("zh", "network timeout")).toBe("network timeout");
  });
});
