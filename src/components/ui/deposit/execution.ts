import { ethers } from "ethers";
import { estimateBaseUnitForUsd } from "./assets";
import {
  QUOTE_PRICE_CHANGE_THRESHOLD,
  QUOTE_STALE_THRESHOLD_MS,
  SUPPORTED_DLN_EVM_CHAIN_IDS,
  getConnectedMinDepositUsd,
} from "./constants";
import { formatCompactBalance } from "./format";
import type { DepositAsset, ExecutionSnapshot, ExecutionTx } from "./types";

export async function buildExecutionSnapshot({
  amountUsd,
  asset,
  depositAddress,
  proxyAddress,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  proxyAddress: string;
}): Promise<ExecutionSnapshot> {
  const sourceAmountBaseUnit = await estimateBaseUnitForUsd({
    amountUsd,
    asset,
    proxyAddress,
  });
  if (!sourceAmountBaseUnit || sourceAmountBaseUnit === "0") {
    throw new Error("Source amount could not be estimated. Please retry.");
  }
  const quotedAtMs = Date.now();
  const expiresAtMs = quotedAtMs + QUOTE_STALE_THRESHOLD_MS;

  return snapshotFromDirectTransfer({
    amountUsd,
    asset,
    depositAddress,
    sourceAmountBaseUnit,
    quotedAtMs,
    expiresAtMs,
  });
}

function snapshotFromDirectTransfer({
  amountUsd,
  asset,
  depositAddress,
  sourceAmountBaseUnit,
  quotedAtMs,
  expiresAtMs,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  sourceAmountBaseUnit: string;
  quotedAtMs: number;
  expiresAtMs: number;
}): ExecutionSnapshot {
  const tx: ExecutionTx = asset.isNative
    ? {
      to: depositAddress,
      data: "0x",
      value: sourceAmountBaseUnit,
    }
    : {
      to: asset.tokenAddress,
      data: new ethers.utils.Interface([
        "function transfer(address to, uint256 amount) returns (bool)",
      ]).encodeFunctionData("transfer", [depositAddress, sourceAmountBaseUnit]),
      value: "0",
    };
  const sendAmountFloat = Number(
    ethers.utils.formatUnits(sourceAmountBaseUnit, asset.decimals)
  );
  const sendDisplay = `${formatCompactBalance(String(sendAmountFloat))} ${asset.symbol}`;

  return {
    kind: "direct-transfer",
    asset,
    amountUsd,
    sourceAmountBaseUnit,
    sendBaseUnit: sourceAmountBaseUnit,
    sendAmountFloat,
    sendDisplay,
    sendUsd: amountUsd,
    receiveBaseUnit: sourceAmountBaseUnit,
    receiveDecimals: 6,
    receiveDisplay: amountUsd.toFixed(4),
    receiveSymbol: "pUSD",
    receiveUsd: amountUsd,
    networkCostUsd: undefined,
    routeCostUsd: 0,
    priceImpact: 0,
    slippage: undefined,
    estCheckoutTimeMs: undefined,
    recipientAddress: depositAddress,
    tx,
    approveSpender: undefined,
    fixedFeeDisplay: undefined,
    fixedFeeUsd: undefined,
    walletTotalDisplay: sendDisplay,
    walletTotalUsd: amountUsd,
    orderId: undefined,
    quotedAtMs,
    expiresAtMs,
  };
}

export function isQuotePriceChanged(prev: ExecutionSnapshot, next: ExecutionSnapshot): boolean {
  const prevReceive = prev.receiveUsd ?? Number(prev.receiveDisplay);
  const nextReceive = next.receiveUsd ?? Number(next.receiveDisplay);
  if (!Number.isFinite(prevReceive) || !Number.isFinite(nextReceive) || prevReceive <= 0) {
    return false;
  }
  return Math.abs(nextReceive - prevReceive) / prevReceive > QUOTE_PRICE_CHANGE_THRESHOLD;
}

export function validateDepositSelection({
  amountUsd,
  asset,
  locale,
}: {
  amountUsd: number;
  asset: DepositAsset;
  locale: string;
}): string | null {
  const zh = locale === "zh";
  if (!SUPPORTED_DLN_EVM_CHAIN_IDS.has(asset.chainId)) {
    return zh
      ? "当前 Connected Wallet 暂只支持 EVM 链资产；Solana、Tron、Bitcoin 请先使用 Transfer Crypto。"
      : "Connected Wallet currently supports EVM assets only. Use Transfer Crypto for Solana, Tron, or Bitcoin.";
  }

  const minDepositUsd = getConnectedMinDepositUsd(asset.minCheckoutUsd);
  if (amountUsd < minDepositUsd) {
    return zh
      ? `当前资产最低充值金额为 $${minDepositUsd.toFixed(2)}。`
      : `Minimum deposit for this asset is $${minDepositUsd.toFixed(2)}.`;
  }

  const availableUsd = asset.usdValue ?? 0;
  if (availableUsd > 0 && amountUsd > availableUsd * 1.01) {
    return zh
      ? "输入金额超过当前钱包可用余额。"
      : "Amount exceeds the available wallet balance.";
  }

  return null;
}

export function validateBridgeReceiveMinimum(
  snapshot: ExecutionSnapshot,
  locale: string
): string | null {
  const minOutputUsd = Math.max(snapshot.asset.minCheckoutUsd ?? 1, 1);
  const receiveUsd = snapshot.receiveUsd ?? Number(snapshot.receiveDisplay);
  if (!Number.isFinite(receiveUsd) || receiveUsd + 0.000001 >= minOutputUsd) {
    return null;
  }

  return locale === "zh"
    ? `扣除路由费后预计到账 $${receiveUsd.toFixed(4)}，低于 Polymarket Bridge 最低 $${minOutputUsd.toFixed(2)}，请提高充值金额。`
    : `Estimated received amount after route costs is $${receiveUsd.toFixed(4)}, below the Polymarket Bridge minimum of $${minOutputUsd.toFixed(2)}. Increase the deposit amount.`;
}
