import { normalizeSupportedAssets } from "@/components/ui/deposit/assets";
import { resolveTokenIconUrl } from "@/components/ui/deposit/icons";
import { PUSD_ADDRESS, POLYGON_CHAIN_ID, POLYGON_USDC_ADDRESS } from "./constants";
import type { WithdrawDestinationAsset } from "./types";

function isWithdrawDestination(asset: WithdrawDestinationAsset): boolean {
  if (asset.chainId === String(POLYGON_CHAIN_ID) && asset.symbol.toUpperCase() === "PUSD") {
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

export function buildWithdrawDestinationAssets(data: unknown): WithdrawDestinationAsset[] {
  const fromBridge = normalizeSupportedAssets(data)
    .filter((asset) => isWithdrawDestination(asset))
    .map((asset) => ({
      id: asset.id,
      chainId: asset.chainId,
      chainName: asset.chainName,
      symbol: asset.symbol,
      tokenAddress: asset.tokenAddress,
      decimals: asset.decimals,
      iconUrl: asset.iconUrl,
    }));

  if (fromBridge.length > 0) {
    return sortWithdrawAssets(fromBridge);
  }

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
  const priority = ["USDC", "USDC.E", "USDT", "ETH", "POL"];
  return [...assets].sort((a, b) => {
    const ap = priority.indexOf(a.symbol.toUpperCase());
    const bp = priority.indexOf(b.symbol.toUpperCase());
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
        a.symbol.toUpperCase() === "USDC" &&
        a.tokenAddress.toLowerCase() === POLYGON_USDC_ADDRESS.toLowerCase()
    ) ?? assets[0]
  );
}

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
