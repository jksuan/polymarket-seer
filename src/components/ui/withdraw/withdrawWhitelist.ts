/** Product whitelist for withdraw Receive chain (intersected with Bridge /supported-assets). */
export const WITHDRAW_ALLOWED_CHAIN_IDS = new Set([
  "1",
  "10",
  "56",
  "137",
  "8453",
  "42161",
  "1151111081099710",
]);

export const WITHDRAW_ALLOWED_CHAIN_NAMES = new Set([
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
  "optimism",
  "bnb smart chain",
  "solana",
]);

/** Receive token symbols from Polymarket withdraw UI (uppercase). */
export const WITHDRAW_ALLOWED_TOKEN_SYMBOLS = new Set([
  "USDC",
  "USDC.E",
  "ARB",
  "BNB",
  "BTCB",
  "BUSD",
  "DAI",
  "ETH",
  "POL",
  "SOL",
  "USDE",
  "USDT",
  "WBNB",
  "WETH",
]);

export function normalizeWithdrawTokenSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper === "USDT0") return "USDT";
  return upper;
}

export function isWithdrawWhitelistedChain(chainId: string, chainName?: string): boolean {
  const id = chainId.trim();
  if (WITHDRAW_ALLOWED_CHAIN_IDS.has(id)) return true;
  return WITHDRAW_ALLOWED_CHAIN_NAMES.has((chainName || "").trim().toLowerCase());
}

export function isWithdrawWhitelistedToken(symbol: string): boolean {
  return WITHDRAW_ALLOWED_TOKEN_SYMBOLS.has(normalizeWithdrawTokenSymbol(symbol));
}
