import { ethers } from "ethers";
import { getBridgeQuote } from "@/hooks/useBridge";
import { ADDRESSES, ERC20_ABI, POLYGON_CHAIN_ID } from "@/lib/constants";
import { isClientDebugEnabled } from "@/lib/debug";
import {
  NATIVE_TOKEN_ADDRESSES,
  PUBLIC_RPC_URLS,
  PUSD_ADDRESS,
  ZERO_ADDRESS,
} from "./constants";
import { resolveTokenIconUrl } from "./icons";
import { formatTokenAmount, toNumber } from "./format";
import type { DepositAsset } from "./types";

export function normalizeSupportedAssets(data: unknown): DepositAsset[] {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const rawAssets = Array.isArray(record.supportedAssets)
    ? record.supportedAssets
    : Array.isArray(record.assets)
      ? record.assets
      : [];

  const normalized = rawAssets
    .map((item) => normalizeSupportedAsset(item as Record<string, unknown>))
    .filter((asset): asset is DepositAsset => Boolean(asset));

  if (normalized.length > 0) return sortPreferredAssets(normalized);

  return sortPreferredAssets([
    {
      id: "137-pol",
      chainId: String(POLYGON_CHAIN_ID),
      chainName: "Polygon",
      symbol: "POL",
      name: "Polygon",
      tokenAddress: ZERO_ADDRESS,
      iconUrl: resolveTokenIconUrl("POL"),
      decimals: 18,
      isNative: true,
    },
    {
      id: "137-usdce",
      chainId: String(POLYGON_CHAIN_ID),
      chainName: "Polygon",
      symbol: "USDC.e",
      name: "Bridged USDC",
      tokenAddress: ADDRESSES.USDCe,
      iconUrl: resolveTokenIconUrl("USDC.E"),
      decimals: 6,
    },
  ]);
}

function normalizeSupportedAsset(item: Record<string, unknown>): DepositAsset | null {
  const token = item.token && typeof item.token === "object"
    ? item.token as Record<string, unknown>
    : item;
  const chainId = String(item.chainId ?? item.chain_id ?? "");
  const tokenAddress = String(token.address ?? token.tokenAddress ?? token.contractAddress ?? "");
  const tokenAddrLower = tokenAddress.toLowerCase();
  let symbol = String(token.symbol ?? "").trim();
  // bridge.polymarket.com 在 Polygon 上将主网 USDT 合约标为 USDT0；白名单与文档使用 USDT。
  if (
    chainId === String(POLYGON_CHAIN_ID) &&
    symbol.toUpperCase() === "USDT0"
  ) {
    symbol = "USDT";
  }
  // Bridge 在 137 上对原生币保留 MATIC@1010 与 POL@0xeee 两路；展示与去重统一为 POL。
  if (
    chainId === String(POLYGON_CHAIN_ID) &&
    symbol.toUpperCase() === "MATIC" &&
    tokenAddrLower === "0x0000000000000000000000000000000000001010"
  ) {
    symbol = "POL";
  }
  const decimals = Number(token.decimals ?? 18);
  const iconUrl = getTokenIconUrl(item, token, symbol);

  if (!chainId || !tokenAddress || !symbol) return null;

  return {
    id: `${chainId}-${tokenAddress.toLowerCase()}-${symbol}`,
    chainId,
    chainName: String(item.chainName ?? item.network ?? `Chain ${chainId}`),
    symbol,
    name: String(token.name ?? symbol),
    tokenAddress,
    iconUrl,
    decimals: Number.isFinite(decimals) ? decimals : 18,
    minCheckoutUsd: toNumber(item.minCheckoutUsd),
    isNative: NATIVE_TOKEN_ADDRESSES.has(tokenAddress.toLowerCase()) || isNativeSymbol(symbol, chainId),
  };
}

function sortPreferredAssets(assets: DepositAsset[]): DepositAsset[] {
  const priority = ["ETH", "POL", "MATIC", "USDC.E", "USDC", "PUSD"];
  return [...assets].sort((a, b) => {
    const ap = priority.indexOf(a.symbol.toUpperCase());
    const bp = priority.indexOf(b.symbol.toUpperCase());
    return (ap === -1 ? 99 : ap) - (bp === -1 ? 99 : bp);
  });
}

export function sortVisibleAssets(assets: DepositAsset[]): DepositAsset[] {
  const visibleAssets = assets
    .filter((asset) => isSupportedReadableChain(asset.chainId))
    .filter((asset) => Number(asset.balance || 0) > 0 || (asset.usdValue ?? 0) > 0.005);

  return dedupeAssetsBySymbol(visibleAssets)
    .sort((a, b) => {
      const aValue = a.usdValue ?? 0;
      const bValue = b.usdValue ?? 0;
      if (bValue !== aValue) return bValue - aValue;
      return sortPreferredAssets([a, b])[0].id === a.id ? -1 : 1;
    });
}

function dedupeAssetsBySymbol(assets: DepositAsset[]): DepositAsset[] {
  const byAssetKey = new Map<string, DepositAsset>();

  for (const asset of assets) {
    const key = getAssetDedupeKey(asset);
    const existing = byAssetKey.get(key);
    if (!existing) {
      byAssetKey.set(key, asset);
      continue;
    }
    byAssetKey.set(key, pickPreferredDedupeDepositAsset(existing, asset));
  }

  return [...byAssetKey.values()];
}

/** Polygon 上多路 native 占位合并时优先保留与报价常用的占位地址。 */
function polygonNativeAddressSortRank(address: string): number {
  const a = address.toLowerCase();
  if (a === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") return 0;
  if (a === ZERO_ADDRESS.toLowerCase()) return 1;
  if (a === "0x0000000000000000000000000000000000001010") return 2;
  return 99;
}

function pickPreferredDedupeDepositAsset(a: DepositAsset, b: DepositAsset): DepositAsset {
  const aUsd = a.usdValue ?? 0;
  const bUsd = b.usdValue ?? 0;
  if (bUsd > aUsd) return b;
  if (aUsd > bUsd) return a;
  if (
    a.chainId === String(POLYGON_CHAIN_ID) &&
    b.chainId === String(POLYGON_CHAIN_ID) &&
    a.isNative &&
    b.isNative
  ) {
    const ra = polygonNativeAddressSortRank(a.tokenAddress);
    const rb = polygonNativeAddressSortRank(b.tokenAddress);
    if (ra !== rb) return ra < rb ? a : b;
  }
  const aSym = a.symbol.toUpperCase();
  const bSym = b.symbol.toUpperCase();
  if (a.chainId === String(POLYGON_CHAIN_ID) && b.chainId === String(POLYGON_CHAIN_ID)) {
    if (aSym === "POL" && bSym === "MATIC") return a;
    if (bSym === "POL" && aSym === "MATIC") return b;
  }
  return a;
}

export async function readAssetBalance(
  asset: DepositAsset,
  walletAddress: string
): Promise<readonly [string, string]> {
  const rpcUrl = PUBLIC_RPC_URLS[asset.chainId];
  if (!rpcUrl || !walletAddress) return [asset.id, "0"] as const;

  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    if (asset.isNative) {
      const balance = await provider.getBalance(walletAddress);
      return [asset.id, ethers.utils.formatUnits(balance, asset.decimals)] as const;
    }

    if (!ethers.utils.isAddress(asset.tokenAddress)) {
      return [asset.id, "0"] as const;
    }

    const contract = new ethers.Contract(asset.tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(walletAddress);
    return [asset.id, ethers.utils.formatUnits(balance, asset.decimals)] as const;
  } catch {
    return [asset.id, "0"] as const;
  }
}

export function amountNumberToBaseUnit(amountUsd: number, decimals: number): string {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return "0";
  return ethers.utils.parseUnits(amountUsd.toFixed(Math.min(decimals, 6)), decimals).toString();
}

export async function estimateBaseUnitForUsd({
  amountUsd,
  asset,
  proxyAddress,
}: {
  amountUsd: number;
  asset: DepositAsset;
  proxyAddress: string;
}): Promise<string> {
  if (isStableLike(asset.symbol)) {
    return amountNumberToBaseUnit(amountUsd, asset.decimals);
  }

  const oneTokenBaseUnit = ethers.utils.parseUnits("1", asset.decimals).toString();
  const unitQuote = await getBridgeQuote({
    fromAmountBaseUnit: oneTokenBaseUnit,
    fromChainId: asset.chainId,
    fromTokenAddress: asset.tokenAddress,
    recipientAddress: proxyAddress,
    toChainId: String(POLYGON_CHAIN_ID),
    toTokenAddress: PUSD_ADDRESS,
  });
  const unitUsd = unitQuote.estInputUsd || unitQuote.estOutputUsd || 0;
  if (!unitUsd) {
    return amountNumberToBaseUnit(amountUsd, asset.decimals);
  }

  return ethers.utils.parseUnits((amountUsd / unitUsd).toFixed(Math.min(asset.decimals, 8)), asset.decimals).toString();
}

export function getPreQuoteSendLabel(amountUsd: number, asset: DepositAsset): string {
  if (isStableLike(asset.symbol)) return formatTokenAmount(amountUsd, asset.symbol);
  return `~$${amountUsd.toFixed(2)} ${asset.symbol}`;
}

export function isStableLike(symbol: string): boolean {
  const normalized = symbol.toUpperCase();
  return normalized.includes("USDC") || normalized.includes("USDT") || normalized.includes("DAI") || normalized.includes("PUSD");
}

export async function estimateUsdValue(
  asset: DepositAsset,
  balance?: string,
  proxyAddress?: string
): Promise<number> {
  const value = Number(balance || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (isStableLike(asset.symbol)) return value;
  if (!proxyAddress) return 0;

  try {
    const oneTokenBaseUnit = ethers.utils.parseUnits("1", asset.decimals).toString();
    const quote = await getBridgeQuote({
      fromAmountBaseUnit: oneTokenBaseUnit,
      fromChainId: asset.chainId,
      fromTokenAddress: asset.tokenAddress,
      recipientAddress: proxyAddress,
      toChainId: String(POLYGON_CHAIN_ID),
      toTokenAddress: PUSD_ADDRESS,
    });
    const unitUsd = quote.estInputUsd || quote.estOutputUsd || 0;
    return unitUsd * value;
  } catch {
    return 0;
  }
}

export function isSupportedReadableChain(chainId: string): boolean {
  return Boolean(PUBLIC_RPC_URLS[chainId]);
}

function isNativeSymbol(symbol: string, chainId: string): boolean {
  const normalized = symbol.toUpperCase();
  return (
    (chainId === "1" && normalized === "ETH") ||
    (chainId === String(POLYGON_CHAIN_ID) && normalized === "POL") ||
    (chainId === String(POLYGON_CHAIN_ID) && normalized === "MATIC") ||
    (chainId === "10" && normalized === "ETH") ||
    (chainId === "8453" && normalized === "ETH") ||
    (chainId === "42161" && normalized === "ETH") ||
    (chainId === "56" && normalized === "BNB")
  );
}

function getAssetDedupeKey(asset: DepositAsset): string {
  const tokenKey = asset.isNative
    ? "native"
    : asset.tokenAddress.toLowerCase();
  return `${asset.chainId}:${tokenKey}`;
}

export function getNativeFeeSymbol(chainId: string): string {
  if (chainId === "56") return "BNB";
  if (chainId === String(POLYGON_CHAIN_ID)) return "POL";
  return "ETH";
}

function getTokenIconUrl(
  item: Record<string, unknown>,
  token: Record<string, unknown>,
  symbol: string
): string | undefined {
  const debugIconMissing = isClientDebugEnabled();
  const candidates = [
    token.logoURI,
    token.logoUri,
    token.logoUrl,
    token.icon,
    token.image,
    item.logoURI,
    item.logoUri,
    item.logoUrl,
    item.icon,
    item.image,
  ];

  const fromApi = candidates.find(
    (value): value is string => typeof value === "string" && value.startsWith("http")
  );
  if (fromApi) return fromApi;

  const fallback = resolveTokenIconUrl(symbol);
  if (!fallback && debugIconMissing) {
    console.debug("[deposit-icons] missing icon from API and fallback", {
      symbol,
      tokenLogoURI: token.logoURI,
      tokenLogoUri: token.logoUri,
      tokenLogoUrl: token.logoUrl,
      tokenIcon: token.icon,
      tokenImage: token.image,
      itemLogoURI: item.logoURI,
      itemLogoUri: item.logoUri,
      itemLogoUrl: item.logoUrl,
      itemIcon: item.icon,
      itemImage: item.image,
    });
  }
  return fallback;
}
