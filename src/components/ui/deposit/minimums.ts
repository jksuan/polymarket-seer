import { CONNECTED_MAX_BUFFER_USD } from "./constants";
import { FALLBACK_NATIVE_GAS_RESERVE } from "./nativeGas";
import type { DepositAsset } from "./types";

export function getNativeGasReserveFallbackNative(chainId: string): number {
  const raw = FALLBACK_NATIVE_GAS_RESERVE[chainId] ?? FALLBACK_NATIVE_GAS_RESERVE["137"];
  return Number(raw);
}

/**
 * ERC20：余额减 USD 缓冲。原生币（POL/ETH）：余额减链上 gas 预留（按币本位），不再叠加大额 USD buffer。
 *
 * 已知问题：修正上限后 Polygon POL 充值仍无法在真机打通（非 gas 不足所致），见 issue 跟进。
 */
export function getConnectedMaxAllowedUsdForAsset(
  asset: Pick<DepositAsset, "isNative" | "chainId" | "usdValue" | "balance">,
  singleTxCapUsd: number
): number {
  const walletUsd = Number(asset.usdValue ?? 0);
  if (!asset.isNative) {
    return getConnectedMaxAllowedUsd({
      walletUsdValue: walletUsd,
      singleTxCapUsd,
      maxBufferUsd: CONNECTED_MAX_BUFFER_USD,
    });
  }

  const balanceNative = Number(asset.balance ?? 0);
  if (!Number.isFinite(balanceNative) || balanceNative <= 0 || walletUsd <= 0) {
    return 0;
  }

  const gasReserveNative = getNativeGasReserveFallbackNative(asset.chainId);
  const maxNativeSpend = Math.max(0, balanceNative - gasReserveNative);
  const unitUsd = walletUsd / balanceNative;
  const maxUsd = maxNativeSpend * unitUsd;

  return Number(Math.min(maxUsd, singleTxCapUsd).toFixed(2));
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
  asset: Pick<DepositAsset, "isNative" | "chainId" | "usdValue" | "balance">;
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

