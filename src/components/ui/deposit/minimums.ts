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

