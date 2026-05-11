import { describe, expect, it } from "vitest";
import { normalizeSupportedAssets } from "./assets";

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
});
