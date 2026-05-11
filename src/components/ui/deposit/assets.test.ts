import { describe, expect, it } from "vitest";
import type { DepositAsset } from "./types";
import { normalizeSupportedAssets, sortVisibleAssets } from "./assets";

describe("normalizeSupportedAssets", () => {
  it("将 Polygon 上 bridge 返回的 USDT0 规范为 USDT，以便 Transfer 白名单与网络列表一致", () => {
    const data = {
      supportedAssets: [
        {
          chainId: "137",
          chainName: "Polygon",
          minCheckoutUsd: 2,
          token: {
            name: "USDT0",
            symbol: "USDT0",
            address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            decimals: 6,
          },
        },
      ],
    };

    const assets = normalizeSupportedAssets(data);
    expect(assets).toHaveLength(1);
    expect(assets[0]?.symbol).toBe("USDT");
    expect(assets[0]?.chainId).toBe("137");
    expect(assets[0]?.tokenAddress.toLowerCase()).toBe(
      "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    );
  });

  it("其他链上的 USDT0 保持原符号", () => {
    const data = {
      supportedAssets: [
        {
          chainId: "143",
          chainName: "Monad",
          minCheckoutUsd: 2,
          token: {
            name: "USDT0",
            symbol: "USDT0",
            address: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
            decimals: 6,
          },
        },
      ],
    };

    const assets = normalizeSupportedAssets(data);
    expect(assets[0]?.symbol).toBe("USDT0");
  });

  it("将 Polygon 上 0x1010 的 MATIC 规范为 POL（与 POL@0xeee 同键去重后展示 POL）", () => {
    const data = {
      supportedAssets: [
        {
          chainId: "137",
          chainName: "Polygon",
          minCheckoutUsd: 2,
          token: {
            name: "POL",
            symbol: "MATIC",
            address: "0x0000000000000000000000000000000000001010",
            decimals: 18,
          },
        },
      ],
    };

    const assets = normalizeSupportedAssets(data);
    expect(assets.find((a) => a.tokenAddress.toLowerCase().endsWith("1010"))?.symbol).toBe(
      "POL"
    );
  });

  it("Connected 可见列表去重 137:native 时 USD 相同优先保留 0xeee 的 POL", () => {
    const list: DepositAsset[] = [
      {
        id: "137-1010-matic",
        chainId: "137",
        chainName: "Polygon",
        symbol: "MATIC",
        name: "POL",
        tokenAddress: "0x0000000000000000000000000000000000001010",
        decimals: 18,
        isNative: true,
        balance: "10",
        usdValue: 2,
      },
      {
        id: "137-eee-pol",
        chainId: "137",
        chainName: "Polygon",
        symbol: "POL",
        name: "Polygon",
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        decimals: 18,
        isNative: true,
        balance: "10",
        usdValue: 2,
      },
    ];

    const visible = sortVisibleAssets(list);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.symbol).toBe("POL");
    expect(visible[0]?.tokenAddress.toLowerCase()).toBe(
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    );
  });
});
