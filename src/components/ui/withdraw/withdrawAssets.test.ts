import { describe, expect, it } from "vitest";
import { PUSD_ADDRESS, POLYGON_CHAIN_ID } from "./constants";
import {
  buildWithdrawDestinationAssets,
  getDefaultWithdrawAsset,
  getPolygonPusdWithdrawAsset,
} from "./withdrawAssets";

describe("buildWithdrawDestinationAssets", () => {
  it("仅返回 Polygon pUSD 直提资产", () => {
    const assets = buildWithdrawDestinationAssets({
      supportedAssets: [
        {
          chainId: "137",
          chainName: "Polygon",
          token: {
            symbol: "USDC",
            address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            decimals: 6,
          },
        },
        {
          chainId: "42161",
          chainName: "Arbitrum",
          token: { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
        },
      ],
    });

    expect(assets).toHaveLength(1);
    expect(assets[0].chainId).toBe(String(POLYGON_CHAIN_ID));
    expect(assets[0].symbol).toBe("PUSD");
    expect(assets[0].tokenAddress.toLowerCase()).toBe(PUSD_ADDRESS.toLowerCase());
  });

  it("getDefaultWithdrawAsset 返回唯一 pUSD 资产", () => {
    const assets = buildWithdrawDestinationAssets(undefined);
    expect(getDefaultWithdrawAsset(assets)).toEqual(getPolygonPusdWithdrawAsset());
  });
});
