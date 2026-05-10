import { describe, expect, it } from "vitest";
import type { DepositAsset } from "../types";
import { compareTransferTokensBySymbol, sortUniqueTransferTokensBySymbol } from "./tokenSort";

const stub = (symbol: string): DepositAsset => ({
  id: `stub-${symbol}`,
  chainId: "1",
  chainName: "Ethereum",
  symbol,
  name: symbol,
  tokenAddress: "0x0000000000000000000000000000000000000001",
  decimals: 18,
});

describe("transfer token sort", () => {
  it("compareTransferTokensBySymbol 按常用顺序排在前列", () => {
    expect(compareTransferTokensBySymbol("ETH", "USDC")).toBeLessThan(0);
    expect(compareTransferTokensBySymbol("USDC", "ETH")).toBeGreaterThan(0);
    expect(compareTransferTokensBySymbol("MATIC", "1INCH")).toBeLessThan(0);
    expect(compareTransferTokensBySymbol("SOL", "BNB")).toBeLessThan(0);
  });

  it("USDC.e 紧挨 USDC，位于 USDT 之前", () => {
    expect(compareTransferTokensBySymbol("USDC", "USDC.E")).toBeLessThan(0);
    expect(compareTransferTokensBySymbol("USDC.E", "USDT")).toBeLessThan(0);
  });

  it("SOLANA 与 SOL 同档，整组位于 POL 与 BTC 之间", () => {
    const sorted = sortUniqueTransferTokensBySymbol([stub("BTC"), stub("SOLANA"), stub("POL")]);
    expect(sorted.map((a) => a.symbol)).toEqual(["POL", "SOLANA", "BTC"]);
  });

  it("sortUniqueTransferTokensBySymbol 去重并排序", () => {
    const shuffled = [stub("1INCH"), stub("ETH"), stub("MATIC"), stub("USDC")];
    const sorted = sortUniqueTransferTokensBySymbol(shuffled);
    expect(sorted.map((a) => a.symbol.toUpperCase())).toEqual(["ETH", "USDC", "MATIC", "1INCH"]);
  });
});
