import { ethers } from "ethers";
import type { BridgeTransaction } from "@/types/bridge";

const STABLECOIN_DECIMALS_6 = new Set([
  "USDC",
  "USDT",
  "USDC.E",
  "USDT0",
  "DAI",
  "BUSD",
  "TUSD",
  "USDE",
  "USDCE",
]);

function readRecord(tx: BridgeTransaction): Record<string, unknown> {
  return tx as Record<string, unknown>;
}

export function guessBridgeTokenDecimals(symbol?: string | null): number {
  if (!symbol?.trim()) return 6;
  const upper = symbol.trim().toUpperCase();
  if (STABLECOIN_DECIMALS_6.has(upper)) return 6;
  if (upper === "BTC" || upper === "BITCOIN") return 8;
  if (upper === "SOL") return 9;
  return 18;
}

export function readBridgeTxAmountUsd(tx: BridgeTransaction | undefined): number {
  if (!tx) return 0;
  const record = readRecord(tx);
  const candidates = [
    record.amountUsd,
    record.usdAmount,
    record.amount,
    record.receiveAmountUsd,
    record.depositAmountUsd,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function readAmountUsdFromBaseUnit(
  fromAmountBaseUnit: string | undefined,
  tokenDecimals?: number | null,
  tokenSymbol?: string | null
): number {
  const raw = fromAmountBaseUnit?.trim();
  if (!raw || !/^\d+$/.test(raw)) return 0;
  const decimals =
    typeof tokenDecimals === "number" && Number.isInteger(tokenDecimals) && tokenDecimals >= 0
      ? tokenDecimals
      : guessBridgeTokenDecimals(tokenSymbol);
  try {
    const human = Number(ethers.utils.formatUnits(raw, decimals));
    return Number.isFinite(human) && human >= 0 ? human : 0;
  } catch {
    return 0;
  }
}

/** 链上转入：优先 Bridge 返回的 USD 字段，否则用 fromAmountBaseUnit 估算（稳定币按 1:1 USD）。 */
export function resolveBridgeDepositAmountUsd(tx: BridgeTransaction | undefined): number {
  if (!tx) return 0;
  const direct = readBridgeTxAmountUsd(tx);
  if (direct > 0) return direct;

  const record = readRecord(tx);
  const tokenDecimals = Number(record.tokenDecimals);
  const tokenSymbol =
    typeof record.tokenSymbol === "string"
      ? record.tokenSymbol
      : typeof record.symbol === "string"
        ? record.symbol
        : null;

  return readAmountUsdFromBaseUnit(tx.fromAmountBaseUnit, tokenDecimals, tokenSymbol);
}

export function findLatestCompletedBridgeTx(
  transactions: BridgeTransaction[] | undefined
): BridgeTransaction | undefined {
  const list = transactions ?? [];
  const completed = list.filter((tx) => {
    const status = String(tx.status ?? "").toUpperCase();
    return status === "COMPLETED";
  });
  return completed.reduce<BridgeTransaction | undefined>((latest, tx) => {
    if (!latest) return tx;
    const latestTime = Number(latest.createdTimeMs ?? 0);
    const txTime = Number(tx.createdTimeMs ?? 0);
    return txTime >= latestTime ? tx : latest;
  }, undefined);
}

export function buildDepositMovementDedupeKey(params: {
  bridgeStatusAddress?: string | null;
  txHash?: string | null;
}): string {
  return `deposit:${(params.bridgeStatusAddress || "no-bridge").toLowerCase()}:${(params.txHash || "no-hash").toLowerCase()}`;
}
