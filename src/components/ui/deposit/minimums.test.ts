import { describe, expect, it } from "vitest";
import {
  getConnectedDefaultAmountUsd,
  getConnectedMaxAllowedUsd,
  getConnectedMaxAllowedUsdForAsset,
} from "./minimums";

describe("getConnectedDefaultAmountUsd", () => {
  const chainMinUsd = 1;
  const singleTxCapUsd = 100000;
  const maxBufferUsd = 1;

  it("余额 50% 后按 1 位有效数字四舍五入", () => {
    expect(
      getConnectedDefaultAmountUsd({
        asset: { isNative: false, chainId: "1", usdValue: 2642.04 },
        chainMinUsd,
        singleTxCapUsd,
      })
    ).toBe(1000);
    expect(
      getConnectedDefaultAmountUsd({
        asset: { isNative: false, chainId: "1", usdValue: 1113.3 },
        chainMinUsd,
        singleTxCapUsd,
      })
    ).toBe(600);
    expect(
      getConnectedDefaultAmountUsd({
        asset: { isNative: false, chainId: "1", usdValue: 38.52 },
        chainMinUsd,
        singleTxCapUsd,
      })
    ).toBe(20);
    expect(
      getConnectedDefaultAmountUsd({
        asset: { isNative: false, chainId: "1", usdValue: 2.2 },
        chainMinUsd,
        singleTxCapUsd,
      })
    ).toBe(1);
  });

  it("不可达链最低时显示 maxAllowed（余额减 buffer 后两位小数）", () => {
    expect(
      getConnectedDefaultAmountUsd({
        asset: { isNative: false, chainId: "1", usdValue: 3 },
        chainMinUsd: 5,
        singleTxCapUsd,
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

describe("getConnectedMaxAllowedUsdForAsset", () => {
  it("原生 POL：$4.23 余额充 $3 应允许（仅预留约 0.05 POL 作 gas）", () => {
    const max = getConnectedMaxAllowedUsdForAsset(
      {
        isNative: true,
        chainId: "137",
        usdValue: 4.23,
        balance: "47",
      },
      100_000
    );
    expect(max).toBeGreaterThanOrEqual(3);
    expect(max).toBeLessThanOrEqual(4.23);
  });

  it("ERC20 仍使用 USD 缓冲", () => {
    expect(
      getConnectedMaxAllowedUsdForAsset(
        { isNative: false, chainId: "1", usdValue: 36.13 },
        100_000
      )
    ).toBe(35.13);
  });
});
