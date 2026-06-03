import { describe, expect, it } from "vitest";

import { formatTradingExecutionError } from "./tradingErrors";

describe("formatTradingExecutionError", () => {
  it("受限地区统一返回下单交易不可用", () => {
    const msg = formatTradingExecutionError(new Error("Network Error"), "zh", true);
    expect(msg).toBe("当前地区暂不支持下单交易");
  });

  it("非受限地区的 Network Error 保持通用网络提示", () => {
    const msg = formatTradingExecutionError(new Error("Network Error"), "zh", false);
    expect(msg).toContain("网络");
  });
});
