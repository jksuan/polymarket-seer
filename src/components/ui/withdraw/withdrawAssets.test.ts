import { describe, expect, it } from "vitest";
import {
  buildWithdrawDestinationAssets,
  getUniqueWithdrawTokenOptions,
  getWithdrawChainOptionsForSymbol,
} from "./withdrawAssets";

describe("buildWithdrawDestinationAssets", () => {
  it("intersects bridge data with withdraw whitelist", () => {
    const assets = buildWithdrawDestinationAssets({
      supportedAssets: [
        {
          chainId: "137",
          chainName: "Polygon",
          token: { symbol: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
        },
        {
          chainId: "137",
          chainName: "Polygon",
          token: { symbol: "PUSD", address: "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB", decimals: 6 },
        },
        {
          chainId: "8253038",
          chainName: "Bitcoin",
          token: { symbol: "BTC", address: "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8", decimals: 8 },
        },
        {
          chainId: "42161",
          chainName: "Arbitrum",
          token: { symbol: "ARB", address: "0x912CE59144191C1204E64559FE8253a00e52e8B2", decimals: 18 },
        },
        {
          chainId: "999",
          chainName: "HyperEVM",
          token: { symbol: "HYPE", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
        },
      ],
    });

    expect(assets.some((a) => a.symbol.toUpperCase() === "USDC" && a.chainId === "137")).toBe(true);
    expect(assets.some((a) => a.symbol.toUpperCase() === "PUSD")).toBe(false);
    expect(assets.some((a) => a.chainName === "Bitcoin")).toBe(false);
    expect(assets.some((a) => a.chainName === "HyperEVM")).toBe(false);
    expect(assets.some((a) => a.symbol.toUpperCase() === "ARB")).toBe(true);
  });
});

describe("withdraw token-chain linkage", () => {
  const assets = buildWithdrawDestinationAssets({
    supportedAssets: [
      {
        chainId: "137",
        chainName: "Polygon",
        token: { symbol: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
      },
      {
        chainId: "42161",
        chainName: "Arbitrum",
        token: { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
      },
      {
        chainId: "1",
        chainName: "Ethereum",
        token: { symbol: "ETH", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
      },
    ],
  });

  it("dedupes token dropdown by symbol", () => {
    const tokens = getUniqueWithdrawTokenOptions(assets);
    const symbols = tokens.map((t) => t.symbol.toUpperCase());
    expect(symbols.filter((s) => s === "USDC")).toHaveLength(1);
  });

  it("lists all chains for selected token", () => {
    const chains = getWithdrawChainOptionsForSymbol(assets, "USDC");
    expect(chains.map((c) => c.chainName).sort()).toEqual(["Arbitrum", "Polygon"]);
  });
});
