import { describe, expect, it } from "vitest";
import { getConnectedDefaultAmountUsd } from "./minimums";

describe("getConnectedDefaultAmountUsd", () => {
  const chainMinUsd = 1;
  const maxDepositBalanceRatio = 0.95;
  const singleTxCapUsd = 100000;

  it("余额 50% 后按 1 位有效数字四舍五入", () => {
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 2642.04,
        chainMinUsd,
        maxDepositBalanceRatio,
        singleTxCapUsd,
      })
    ).toBe(1000);
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 1113.3,
        chainMinUsd,
        maxDepositBalanceRatio,
        singleTxCapUsd,
      })
    ).toBe(600);
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 38.52,
        chainMinUsd,
        maxDepositBalanceRatio,
        singleTxCapUsd,
      })
    ).toBe(20);
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 2.2,
        chainMinUsd,
        maxDepositBalanceRatio,
        singleTxCapUsd,
      })
    ).toBe(1);
  });

  it("不可达链最低时显示 maxAllowed（两位小数）", () => {
    expect(
      getConnectedDefaultAmountUsd({
        walletUsdValue: 3,
        chainMinUsd: 5,
        maxDepositBalanceRatio,
        singleTxCapUsd,
      })
    ).toBe(2.85);
  });
});
