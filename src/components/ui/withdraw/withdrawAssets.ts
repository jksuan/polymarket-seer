import { resolveTokenIconUrl } from "@/components/ui/deposit/icons";
import { PUSD_ADDRESS, POLYGON_CHAIN_ID } from "./constants";
import type { WithdrawDestinationAsset } from "./types";

/** 产品仅支持 Polygon pUSD 直提；换币请引导用户至 Uniswap。 */
export function getPolygonPusdWithdrawAsset(): WithdrawDestinationAsset {
  return {
    id: "137-pusd-direct",
    chainId: String(POLYGON_CHAIN_ID),
    chainName: "Polygon",
    symbol: "PUSD",
    tokenAddress: PUSD_ADDRESS,
    decimals: 6,
    iconUrl: resolveTokenIconUrl("PUSD"),
  };
}

/** 提现目标资产列表（固定为 Polygon pUSD）。 */
export function buildWithdrawDestinationAssets(_data?: unknown): WithdrawDestinationAsset[] {
  return [getPolygonPusdWithdrawAsset()];
}

export function getDefaultWithdrawAsset(
  assets: WithdrawDestinationAsset[]
): WithdrawDestinationAsset | null {
  return assets[0] ?? getPolygonPusdWithdrawAsset();
}

/** @deprecated 仅保留测试 harness 兼容；提现 UI 不再展示 token 下拉。 */
export function getUniqueWithdrawTokenOptions(
  assets: WithdrawDestinationAsset[]
): WithdrawDestinationAsset[] {
  return assets;
}

/** @deprecated 仅保留测试 harness 兼容。 */
export function getWithdrawChainOptionsForSymbol(
  assets: WithdrawDestinationAsset[],
  _symbol: string
): { chainId: string; chainName: string }[] {
  const asset = assets[0] ?? getPolygonPusdWithdrawAsset();
  return [{ chainId: asset.chainId, chainName: asset.chainName }];
}

/** @deprecated 仅保留测试 harness 兼容。 */
export function findWithdrawAssetForChainAndSymbol(
  assets: WithdrawDestinationAsset[],
  chainId: string,
  symbol: string
): WithdrawDestinationAsset | undefined {
  const normalized = symbol.toUpperCase();
  return assets.find(
    (asset) =>
      asset.chainId === chainId && asset.symbol.toUpperCase() === normalized
  );
}
