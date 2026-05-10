import type { DepositAsset } from "../types";

/**
 * 转入步骤代币下拉：常用代币靠前（与业务白名单无关，仅影响展示顺序）。
 * USDC.e 紧挨 USDC；未列入的符号排在末尾并按字母序。
 */
const PRIMARY_DISPLAY_ORDER = [
  "ETH",
  "USDC",
  "USDT",
  "POL",
  "SOL",
  "BTC",
  "BNB",
  "MATIC",
  "DAI",
] as const;

const ALIAS_TO_PRIMARY: Record<string, string> = {
  BITCOIN: "BTC",
  SOLANA: "SOL",
};

function transferTokenSortIndex(symbol: string): number {
  const u = symbol.trim().toUpperCase();
  if (u === "USDC.E") {
    const usdc = PRIMARY_DISPLAY_ORDER.indexOf("USDC");
    return usdc >= 0 ? usdc + 0.45 : 999;
  }
  if (u === "WETH") {
    const eth = PRIMARY_DISPLAY_ORDER.indexOf("ETH");
    return eth >= 0 ? eth + 0.35 : 999;
  }
  const order = PRIMARY_DISPLAY_ORDER as readonly string[];
  const mapped = ALIAS_TO_PRIMARY[u] ?? u;
  const idx = order.indexOf(mapped);
  if (idx !== -1) return idx;
  const direct = order.indexOf(u);
  if (direct !== -1) return direct;
  return 1000;
}

export function compareTransferTokensBySymbol(aSymbol: string, bSymbol: string): number {
  const ra = transferTokenSortIndex(aSymbol);
  const rb = transferTokenSortIndex(bSymbol);
  if (ra !== rb) return ra - rb;
  return aSymbol.localeCompare(bSymbol, undefined, { sensitivity: "base" });
}

/** 按符号去重（保留首次出现资产）后按展示优先级排序 */
export function sortUniqueTransferTokensBySymbol(assets: DepositAsset[]): DepositAsset[] {
  const unique = [
    ...new Map(assets.map((asset) => [asset.symbol.trim().toUpperCase(), asset] as const)).values(),
  ];
  return unique.sort((a, b) => compareTransferTokensBySymbol(a.symbol, b.symbol));
}
