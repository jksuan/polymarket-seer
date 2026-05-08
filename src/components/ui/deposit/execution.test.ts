import { describe, expect, it } from "vitest";
import type { DepositAsset } from "./types";
import { resolveExecutionEngine, validateDepositSelection } from "./execution";

function makeAsset(partial: Partial<DepositAsset>): DepositAsset {
  return {
    id: "asset-id",
    chainId: "1",
    chainName: "Ethereum",
    symbol: "USDC",
    name: "USD Coin",
    tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    decimals: 6,
    ...partial,
  };
}

describe("resolveExecutionEngine", () => {
  it("EVM 资产映射为 evm", () => {
    const engine = resolveExecutionEngine(makeAsset({ chainId: "1", chainName: "Ethereum" }));
    expect(engine).toBe("evm");
  });

  it("Solana 链名映射为 svm", () => {
    const engine = resolveExecutionEngine(makeAsset({ chainId: "9999", chainName: "Solana Mainnet" }));
    expect(engine).toBe("svm");
  });

  it("Solana 常见链 id 映射为 svm", () => {
    expect(resolveExecutionEngine(makeAsset({ chainId: "101", chainName: "Unknown" }))).toBe("svm");
    expect(resolveExecutionEngine(makeAsset({ chainId: "solana", chainName: "Unknown" }))).toBe("svm");
  });
});

describe("validateDepositSelection", () => {
  it("Connected 最低金额按 Transfer 链级规则校验（Ethereum 链 +3）", () => {
    const ethMainAsset = makeAsset({
      chainId: "1",
      chainName: "Ethereum",
      symbol: "ETH",
      minCheckoutUsd: 2.01,
      usdValue: 100,
    });
    const ethUsdcAsset = makeAsset({
      chainId: "1",
      chainName: "Ethereum",
      symbol: "USDC",
      minCheckoutUsd: 1.01,
      usdValue: 100,
    });

    const error = validateDepositSelection({
      amountUsd: 3.99,
      asset: ethMainAsset,
      allAssets: [ethMainAsset, ethUsdcAsset],
      locale: "zh",
    });

    expect(error).toContain("$5.00");
  });
});
