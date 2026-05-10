const TOKEN_ICON_BY_SYMBOL: Record<string, string> = {
  "1INCH": "/images/crypto/1inch.svg",
  AAVE: "/images/crypto/aave.svg",
  ARB: "/images/crypto/arb.svg",
  BASE: "/images/crypto/base.svg",
  BNB: "/images/crypto/bnb.svg",
  BUSD: "/images/crypto/busd.svg",
  BTC: "/images/crypto/bitcoin.svg",
  BITCOIN: "/images/crypto/bitcoin.svg",
  DAI: "/images/crypto/dai.svg",
  ETH: "/ethereum-eth.svg",
  EUROC: "/images/crypto/euroc.png",
  HYPE: "/images/crypto/hype.svg",
  LINK: "/images/crypto/link.png",
  MATIC: "/images/crypto/matic.svg",
  MON: "/images/crypto/mon.svg",
  OP: "/images/crypto/op.svg",
  POL: "/images/crypto/pol.svg",
  PUSD: "/polymarket-icon.png",
  SOL: "/images/crypto/sol.png",
  TUSD: "/images/crypto/tusd.svg",
  USDC: "/images/crypto/usdc.svg",
  "USDC.E": "/images/crypto/usdc.svg",
  USDE: "/images/crypto/usde.svg",
  USDT: "/images/crypto/usdt.svg",
  WBNB: "/images/crypto/wbnb.svg",
  WETH: "/images/crypto/weth.png",
};

const CHAIN_ICON_BY_ID: Record<string, string> = {
  "1": "/images/crypto/eth.svg",
  "10": "/images/crypto/op.svg",
  "56": "/images/crypto/bnb.svg",
  "137": "/images/crypto/pol.svg",
  "8453": "/images/crypto/base.svg",
  "42161": "/images/crypto/arb.svg",
};

const CHAIN_ICON_BY_NAME: Record<string, string> = {
  ethereum: "/images/crypto/eth.svg",
  polygon: "/images/crypto/pol.svg",
  arbitrum: "/images/crypto/arb.svg",
  base: "/images/crypto/base.svg",
  optimism: "/images/crypto/op.svg",
  "bnb smart chain": "/images/crypto/bnb.svg",
  bsc: "/images/crypto/bnb.svg",
  solana: "/images/crypto/sol.png",
  bitcoin: "/images/crypto/bitcoin.svg",
  hyperevm: "/images/crypto/hype.svg",
  monad: "/images/crypto/mon.svg",
  tron: "/images/crypto/tron.png",
};

export function resolveTokenIconUrl(symbol: string, preferredIconUrl?: string): string | undefined {
  const normalized = symbol.trim().toUpperCase();
  const local = TOKEN_ICON_BY_SYMBOL[normalized];
  if (local) return local;
  if (preferredIconUrl) return preferredIconUrl;

  // Heuristic fallback for wrapped/punctuated aliases.
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  const aliasMap: Record<string, string> = {
    USDCE: "USDC",
    WBTC: "BTC",
    XBT: "BTC",
    WETH: "ETH",
    WRAPPEDETH: "ETH",
    WBNB: "BNB",
    WSOL: "SOL",
  };
  const alias = aliasMap[compact];
  if (alias) return TOKEN_ICON_BY_SYMBOL[alias];

  if (compact.endsWith("USDC")) return TOKEN_ICON_BY_SYMBOL.USDC;
  if (compact.endsWith("USDT")) return TOKEN_ICON_BY_SYMBOL.USDT;
  return undefined;
}

export function resolveChainIconUrl(chainId?: string, chainName?: string): string | undefined {
  const id = (chainId || "").trim();
  if (id && CHAIN_ICON_BY_ID[id]) return CHAIN_ICON_BY_ID[id];

  const normalized = (chainName || "").trim().toLowerCase();
  if (normalized && CHAIN_ICON_BY_NAME[normalized]) return CHAIN_ICON_BY_NAME[normalized];
  if (normalized.includes("bitcoin")) return CHAIN_ICON_BY_NAME.bitcoin;
  if (normalized.includes("solana")) return CHAIN_ICON_BY_NAME.solana;
  if (normalized.includes("tron")) return CHAIN_ICON_BY_NAME.tron;
  if (normalized.includes("optimism")) return CHAIN_ICON_BY_ID["10"];
  if (normalized.includes("arbitrum")) return CHAIN_ICON_BY_ID["42161"];
  if (normalized.includes("base")) return CHAIN_ICON_BY_ID["8453"];
  if (normalized.includes("polygon")) return CHAIN_ICON_BY_ID["137"];
  if (normalized.includes("bnb") || normalized.includes("bsc")) return CHAIN_ICON_BY_ID["56"];
  if (normalized.includes("ethereum")) return CHAIN_ICON_BY_ID["1"];
  if (normalized.includes("hyperevm")) return CHAIN_ICON_BY_NAME.hyperevm;
  if (normalized.includes("monad")) return CHAIN_ICON_BY_NAME.monad;
  return undefined;
}
