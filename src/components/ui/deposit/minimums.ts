import type { DepositAsset } from "./types";

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
  walletUsdValue,
  chainMinUsd,
  maxDepositBalanceRatio,
  singleTxCapUsd,
}: {
  walletUsdValue: number;
  chainMinUsd: number;
  maxDepositBalanceRatio: number;
  singleTxCapUsd: number;
}): number {
  const balanceUsd = Number.isFinite(walletUsdValue) && walletUsdValue > 0 ? walletUsdValue : 0;
  const maxAllowed = Math.min(balanceUsd * maxDepositBalanceRatio, singleTxCapUsd);
  const rawDefault = roundToOneSignificantDigit(balanceUsd * 0.5);

  if (maxAllowed <= 0) return 0;
  if (maxAllowed < chainMinUsd) return toTwoDecimals(maxAllowed);

  const clamped = Math.min(Math.max(rawDefault, chainMinUsd), maxAllowed);
  return toTwoDecimals(clamped);
}

