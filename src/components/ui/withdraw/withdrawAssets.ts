import { normalizeSupportedAssets } from "@/components/ui/deposit/assets";
import type { DepositAsset } from "@/components/ui/deposit/types";
import { sortUniqueTransferTokensBySymbol } from "@/components/ui/deposit/transfer/tokenSort";
import { resolveTokenIconUrl } from "@/components/ui/deposit/icons";
import { PUSD_ADDRESS, POLYGON_CHAIN_ID, POLYGON_USDC_ADDRESS } from "./constants";
import type { WithdrawDestinationAsset } from "./types";
import {
  isWithdrawWhitelistedChain,
  isWithdrawWhitelistedToken,
  normalizeWithdrawTokenSymbol,
} from "./withdrawWhitelist";

const PLACEHOLDER_NATIVE_ADDRESSES = new Set([
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "11111111111111111111111111111111",
]);

function isWithdrawDestination(asset: WithdrawDestinationAsset): boolean {
  if (asset.chainId === String(POLYGON_CHAIN_ID) && normalizeWithdrawTokenSymbol(asset.symbol) === "PUSD") {
    return false;
  }
  if (
    asset.chainId === String(POLYGON_CHAIN_ID) &&
    asset.tokenAddress.toLowerCase() === PUSD_ADDRESS.toLowerCase()
  ) {
    return false;
  }
  return true;
}

function toWithdrawAsset(asset: DepositAsset): WithdrawDestinationAsset {
  return {
    id: asset.id,
    chainId: asset.chainId,
    chainName: asset.chainName,
    symbol: asset.symbol,
    tokenAddress: asset.tokenAddress,
    decimals: asset.decimals,
    iconUrl: asset.iconUrl,
    minCheckoutUsd: asset.minCheckoutUsd,
  };
}

function pickPreferredWithdrawAsset(
  current: WithdrawDestinationAsset,
  next: WithdrawDestinationAsset
): WithdrawDestinationAsset {
  const currentAddress = current.tokenAddress.toLowerCase();
  const nextAddress = next.tokenAddress.toLowerCase();
  const currentIsPlaceholder = PLACEHOLDER_NATIVE_ADDRESSES.has(currentAddress);
  const nextIsPlaceholder = PLACEHOLDER_NATIVE_ADDRESSES.has(nextAddress);

  if (currentIsPlaceholder !== nextIsPlaceholder) {
    return nextIsPlaceholder ? current : next;
  }

  const currentHasIcon = Boolean(current.iconUrl);
  const nextHasIcon = Boolean(next.iconUrl);
  if (currentHasIcon !== nextHasIcon) {
    return nextHasIcon ? next : current;
  }

  const currentMinUsd = Number(current.minCheckoutUsd);
  const nextMinUsd = Number(next.minCheckoutUsd);
  const currentMinValid = Number.isFinite(currentMinUsd) && currentMinUsd > 0;
  const nextMinValid = Number.isFinite(nextMinUsd) && nextMinUsd > 0;
  if (currentMinValid && nextMinValid && currentMinUsd !== nextMinUsd) {
    return nextMinUsd < currentMinUsd ? next : current;
  }

  return next.id.localeCompare(current.id) < 0 ? next : current;
}

/** Bridge supported assets ∩ product withdraw whitelist. */
export function buildWithdrawDestinationAssets(data: unknown): WithdrawDestinationAsset[] {
  const fromBridge = normalizeSupportedAssets(data)
    .filter((asset) => {
      const symbol = normalizeWithdrawTokenSymbol(asset.symbol);
      if (!isWithdrawWhitelistedToken(symbol)) return false;
      if (!isWithdrawWhitelistedChain(asset.chainId, asset.chainName)) return false;
      return isWithdrawDestination(toWithdrawAsset(asset));
    })
    .map(toWithdrawAsset);

  const deduped = new Map<string, WithdrawDestinationAsset>();
  for (const asset of fromBridge) {
    const key = `${asset.chainId}:${normalizeWithdrawTokenSymbol(asset.symbol)}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, asset);
      continue;
    }
    deduped.set(key, pickPreferredWithdrawAsset(existing, asset));
  }

  const assets = sortWithdrawAssets([...deduped.values()]);
  if (assets.length > 0) return assets;

  return [
    {
      id: "137-usdc",
      chainId: String(POLYGON_CHAIN_ID),
      chainName: "Polygon",
      symbol: "USDC",
      tokenAddress: POLYGON_USDC_ADDRESS,
      decimals: 6,
      iconUrl: resolveTokenIconUrl("USDC"),
    },
  ];
}

function sortWithdrawAssets(assets: WithdrawDestinationAsset[]): WithdrawDestinationAsset[] {
  const priority = [
    "USDC",
    "USDC.E",
    "USDT",
    "ETH",
    "POL",
    "SOL",
    "DAI",
    "ARB",
    "BNB",
    "WETH",
  ];
  return [...assets].sort((a, b) => {
    const ap = priority.indexOf(normalizeWithdrawTokenSymbol(a.symbol));
    const bp = priority.indexOf(normalizeWithdrawTokenSymbol(b.symbol));
    const ar = ap === -1 ? 99 : ap;
    const br = bp === -1 ? 99 : bp;
    if (ar !== br) return ar - br;
    if (a.chainId !== b.chainId) return a.chainId.localeCompare(b.chainId);
    return a.symbol.localeCompare(b.symbol);
  });
}

export function getDefaultWithdrawAsset(
  assets: WithdrawDestinationAsset[]
): WithdrawDestinationAsset | null {
  if (assets.length === 0) return null;
  return (
    assets.find(
      (a) =>
        a.chainId === String(POLYGON_CHAIN_ID) &&
        normalizeWithdrawTokenSymbol(a.symbol) === "USDC" &&
        a.tokenAddress.toLowerCase() === POLYGON_USDC_ADDRESS.toLowerCase()
    ) ?? assets[0]
  );
}

/** Unique Receive tokens for dropdown (one row per symbol). */
export function getUniqueWithdrawTokenOptions(
  assets: WithdrawDestinationAsset[]
): WithdrawDestinationAsset[] {
  return sortUniqueTransferTokensBySymbol(assets as DepositAsset[]) as WithdrawDestinationAsset[];
}

/** Chains that support the selected Receive token (token → chain linkage). */
export function getWithdrawChainOptionsForSymbol(
  assets: WithdrawDestinationAsset[],
  symbol: string
): { chainId: string; chainName: string }[] {
  const normalized = normalizeWithdrawTokenSymbol(symbol);
  const chainMap = new Map<string, string>();
  for (const asset of assets) {
    if (normalizeWithdrawTokenSymbol(asset.symbol) !== normalized) continue;
    if (!chainMap.has(asset.chainId)) {
      chainMap.set(asset.chainId, asset.chainName);
    }
  }
  return [...chainMap.entries()]
    .map(([chainId, chainName]) => ({ chainId, chainName }))
    .sort((a, b) => a.chainName.localeCompare(b.chainName));
}

export function findWithdrawAssetForChainAndSymbol(
  assets: WithdrawDestinationAsset[],
  chainId: string,
  symbol: string
): WithdrawDestinationAsset | undefined {
  const normalized = normalizeWithdrawTokenSymbol(symbol);
  return assets.find(
    (asset) =>
      asset.chainId === chainId && normalizeWithdrawTokenSymbol(asset.symbol) === normalized
  );
}

/** @deprecated Use getWithdrawChainOptionsForSymbol for token-linked chain lists. */
export function groupChains(assets: WithdrawDestinationAsset[]): {
  chainId: string;
  chainName: string;
}[] {
  const map = new Map<string, string>();
  for (const asset of assets) {
    if (!map.has(asset.chainId)) {
      map.set(asset.chainId, asset.chainName);
    }
  }
  return [...map.entries()].map(([chainId, chainName]) => ({ chainId, chainName }));
}

export function assetsForChain(
  assets: WithdrawDestinationAsset[],
  chainId: string
): WithdrawDestinationAsset[] {
  return assets.filter((a) => a.chainId === chainId);
}
