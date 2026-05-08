import { describe, expect, it } from "vitest";
import { getConnectedDefaultAmountUsd, getConnectedMaxAllowedUsd } from "./minimums";

describe("getConnectedDefaultAmountUsd", () => {
  const chainMinUsd = 1;
  const singleTxCapUsd = 100000;
  const maxBufferUsd = 1;

  it("余额 50% 后按 1 位有效数字四舍五入", () => {
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 2642.04,
        chainMinUsd,
        singleTxCapUsd,
        maxBufferUsd,
      })
    ).toBe(1000);
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 1113.3,
        chainMinUsd,
        singleTxCapUsd,
        maxBufferUsd,
      })
    ).toBe(600);
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 38.52,
        chainMinUsd,
        singleTxCapUsd,
        maxBufferUsd,
      })
    ).toBe(20);
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 2.2,
        chainMinUsd,
        singleTxCapUsd,
        maxBufferUsd,
      })
    ).toBe(1);
  });

  it("不可达链最低时显示 maxAllowed（余额减 buffer 后两位小数）", () => {
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 3,
        chainMinUsd: 5,
        singleTxCapUsd,
        maxBufferUsd,
      })
    ).toBe(2);
  });

  it("Max 按钮金额使用余额减 buffer，并对 0 做下限保护", () => {
    expect(
      getConnectedMaxAllowedUsd({
        walletUsdValue: 36.13,
        singleTxCapUsd,
        maxBufferUsd,
      })
    ).toBe(35.13);

    expect(
      getConnectedMaxAllowedUsd({
        walletUsdValue: 0.8,
        singleTxCapUsd,
        maxBufferUsd,
      })
    ).toBe(0);
  });
});
