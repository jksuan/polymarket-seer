import { CONNECTED_MAX_BUFFER_USD } from "./constants";
import type { DepositAsset } from "./types";

/**
 * Connected 输入上限：钱包 USD 估值减固定缓冲（与 ERC20 / 原生币一致）。
 * 网络费由钱包估算；余额不足时由链上 / 钱包报错并在面板展示。
 */
export function getConnectedMaxAllowedUsdForAsset(
  asset: Pick<DepositAsset, "usdValue">,
  singleTxCapUsd: number
): number {
  return getConnectedMaxAllowedUsd({
    walletUsdValue: Number(asset.usdValue ?? 0),
    singleTxCapUsd,
    maxBufferUsd: CONNECTED_MAX_BUFFER_USD,
  });
}

export function getTransferChainMinUsd(
  chainName: string | undefined,
  chainId: string | undefined,
  assets: DepositAsset[]
): number {
  const name = (chainName || "").toLowerCase();
  const id = (chainId || "").trim();
  const isEthereum = name.includes("ethereum") || id === "1";
  const isTron = name.includes("tron");
  const isBitcoin = name.includes("bitcoin") || name.includes("btc");
  const baseMin = assets
    .filter((asset) => asset.chainId === id)
    .map((asset) => Number(asset.minCheckoutUsd))
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce<number | null>((min, value) => (min === null ? value : Math.min(min, value)), null);

  if (!baseMin) return isEthereum || isTron || isBitcoin ? 10 : 3;
  const extra = isEthereum || isTron || isBitcoin ? 3 : 1;
  return Math.ceil(baseMin + extra);
}

export function getConnectedMaxAllowedUsd({
  walletUsdValue,
  singleTxCapUsd,
  maxBufferUsd,
}: {
  walletUsdValue: number;
  singleTxCapUsd: number;
  maxBufferUsd: number;
}): number {
  const balanceUsd = Number.isFinite(walletUsdValue) && walletUsdValue > 0 ? walletUsdValue : 0;
  const bufferUsd = Number.isFinite(maxBufferUsd) && maxBufferUsd > 0 ? maxBufferUsd : 0;
  const headroom = Math.max(0, balanceUsd - bufferUsd);
  return Number(Math.min(headroom, singleTxCapUsd).toFixed(2));
}

function roundToOneSignificantDigit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const exponent = Math.floor(Math.log10(value));
  const factor = 10 ** exponent;
  return Math.round(value / factor) * factor;
}

function toTwoDecimals(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Number(value.toFixed(2));
}

export function getConnectedDefaultAmountUsd({
  asset,
  chainMinUsd,
  singleTxCapUsd,
}: {
  asset: Pick<DepositAsset, "usdValue">;
  chainMinUsd: number;
  singleTxCapUsd: number;
}): number {
  const maxAllowed = getConnectedMaxAllowedUsdForAsset(asset, singleTxCapUsd);
  const balanceUsd = Number(asset.usdValue ?? 0);
  const rawDefault = roundToOneSignificantDigit(balanceUsd * 0.5);

  if (maxAllowed <= 0) return 0;
  if (maxAllowed < chainMinUsd) return toTwoDecimals(maxAllowed);

  const clamped = Math.min(Math.max(rawDefault, chainMinUsd), maxAllowed);
  return toTwoDecimals(clamped);
}
