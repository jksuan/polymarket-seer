import { ethers } from "ethers";
import { getDlnQuote, getDlnSameChainSwap } from "@/hooks/useDln";
import { ADDRESSES, POLYGON_CHAIN_ID } from "@/lib/constants";
import type { DlnQuoteResponse, DlnSameChainSwapResponse } from "@/types/dln";
import { estimateBaseUnitForUsd, getNativeFeeSymbol, isStableLike } from "./assets";
import {
  ERC20_EXECUTION_ABI,
  POLYGON_USDC_ADDRESS,
  QUOTE_PRICE_CHANGE_THRESHOLD,
  QUOTE_STALE_THRESHOLD_MS,
  SUPPORTED_DLN_EVM_CHAIN_IDS,
  ZERO_ADDRESS,
} from "./constants";
import { formatCompactBalance } from "./format";
import type { DepositAsset, ExecutionSnapshot, ExecutionTx } from "./types";

export async function buildExecutionSnapshot({
  amountUsd,
  asset,
  depositAddress,
  proxyAddress,
  walletAddress,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  proxyAddress: string;
  walletAddress: string;
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

  if (isDirectPolygonStableDeposit(asset)) {
    return buildDirectSnapshot({
      amountUsd,
      asset,
      depositAddress,
      sourceAmountBaseUnit,
      quotedAtMs,
      expiresAtMs,
    });
  }

  if (asset.chainId === String(POLYGON_CHAIN_ID)) {
    const swap = await getDlnSameChainSwap({
      chainId: asset.chainId,
      tokenIn: toDlnTokenAddress(asset),
      tokenInAmount: sourceAmountBaseUnit,
      tokenOut: POLYGON_USDC_ADDRESS,
      tokenOutRecipient: depositAddress,
      senderAddress: walletAddress,
      slippage: "auto",
    });
    return snapshotFromSameChainSwap({
      amountUsd,
      asset,
      depositAddress,
      sourceAmountBaseUnit,
      swap,
      quotedAtMs,
      expiresAtMs,
    });
  }

  const dlnQuote = await getDlnQuote({
    srcChainId: asset.chainId,
    srcChainTokenIn: toDlnTokenAddress(asset),
    srcChainTokenInAmount: sourceAmountBaseUnit,
    dstChainId: String(POLYGON_CHAIN_ID),
    dstChainTokenOut: POLYGON_USDC_ADDRESS,
    dstChainTokenOutAmount: "auto",
    dstChainTokenOutRecipient: depositAddress,
    srcChainOrderAuthorityAddress: walletAddress,
    dstChainOrderAuthorityAddress: walletAddress,
    senderAddress: walletAddress,
    prependOperatingExpenses: true,
  });
  return snapshotFromDlnQuote({
    amountUsd,
    asset,
    depositAddress,
    sourceAmountBaseUnit,
    dlnQuote,
    quotedAtMs,
    expiresAtMs,
  });
}

function buildDirectSnapshot({
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
  const tx = buildErc20TransferTx(asset.tokenAddress, depositAddress, sourceAmountBaseUnit);
  const sendFloat = Number(ethers.utils.formatUnits(sourceAmountBaseUnit, asset.decimals));

  return {
    kind: "direct",
    asset,
    amountUsd,
    sourceAmountBaseUnit,
    sendBaseUnit: sourceAmountBaseUnit,
    sendAmountFloat: sendFloat,
    sendDisplay: `${formatCompactBalance(String(sendFloat))} ${asset.symbol}`,
    sendUsd: amountUsd,
    receiveBaseUnit: sourceAmountBaseUnit,
    receiveDecimals: asset.decimals,
    receiveDisplay: sendFloat.toFixed(4),
    receiveUsd: amountUsd,
    networkCostUsd: undefined,
    routeCostUsd: 0,
    priceImpact: 0,
    slippage: 0,
    estCheckoutTimeMs: 60_000,
    recipientAddress: depositAddress,
    tx,
    approveSpender: undefined,
    fixedFeeDisplay: undefined,
    fixedFeeUsd: undefined,
    walletTotalDisplay: `${formatCompactBalance(String(sendFloat))} ${asset.symbol}`,
    walletTotalUsd: amountUsd,
    orderId: undefined,
    quotedAtMs,
    expiresAtMs,
  };
}

function snapshotFromDlnQuote({
  amountUsd,
  asset,
  depositAddress,
  sourceAmountBaseUnit,
  dlnQuote,
  quotedAtMs,
  expiresAtMs,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  sourceAmountBaseUnit: string;
  dlnQuote: DlnQuoteResponse;
  quotedAtMs: number;
  expiresAtMs: number;
}): ExecutionSnapshot {
  const tx: ExecutionTx = {
    to: dlnQuote.tx.to,
    data: dlnQuote.tx.data,
    value: dlnQuote.tx.value || "0",
    allowanceTarget: (dlnQuote.tx as ExecutionTx).allowanceTarget,
  };
  const srcIn = dlnQuote.estimation.srcChainTokenIn;
  const srcAmountFloat = Number(ethers.utils.formatUnits(srcIn.amount, asset.decimals));
  const txValueFloat = Number(ethers.utils.formatUnits(tx.value, asset.decimals));
  const sendBaseUnit = asset.isNative ? tx.value : srcIn.amount;
  const sendAmountFloat = asset.isNative ? txValueFloat : srcAmountFloat;
  const unitUsd = srcAmountFloat > 0 && srcIn.approximateUsdValue
    ? srcIn.approximateUsdValue / srcAmountFloat
    : 0;
  const sendUsd = unitUsd > 0 ? sendAmountFloat * unitUsd : srcIn.approximateUsdValue;
  const dst = dlnQuote.estimation.dstChainTokenOut;
  const receiveDecimals = dst.decimals ?? 6;
  const receiveFloat = Number(ethers.utils.formatUnits(dst.amount, receiveDecimals));
  const fixedFee = getFixedFeeBreakdown({
    asset,
    fixedFeeBaseUnit: dlnQuote.fixFee,
    unitUsd,
  });
  const sendDisplay = `${formatCompactBalance(String(sendAmountFloat))} ${asset.symbol}`;
  const routeCostUsd = computeRouteCostUsd(srcIn.approximateUsdValue, dst.approximateUsdValue);

  return {
    kind: "cross-chain",
    asset,
    amountUsd,
    sourceAmountBaseUnit,
    sendBaseUnit,
    sendAmountFloat,
    sendDisplay,
    sendUsd,
    receiveBaseUnit: dst.amount,
    receiveDecimals,
    receiveDisplay: receiveFloat.toFixed(4),
    receiveUsd: dst.approximateUsdValue,
    networkCostUsd: dlnQuote.estimatedTransactionFee?.approximateUsdValue,
    routeCostUsd,
    priceImpact: typeof dlnQuote.usdPriceImpact === "number" ? Math.abs(dlnQuote.usdPriceImpact) : undefined,
    slippage: dlnQuote.estimation.recommendedSlippage,
    estCheckoutTimeMs: dlnQuote.order?.approximateFulfillmentDelay
      ? dlnQuote.order.approximateFulfillmentDelay * 1000
      : undefined,
    recipientAddress: depositAddress,
    tx,
    approveSpender: tx.allowanceTarget || tx.to,
    fixedFeeDisplay: fixedFee.display,
    fixedFeeUsd: fixedFee.usd,
    walletTotalDisplay: asset.isNative
      ? `${formatCompactBalance(String(txValueFloat))} ${asset.symbol}`
      : fixedFee.display
        ? `${sendDisplay} + ${fixedFee.display}`
        : sendDisplay,
    walletTotalUsd: asset.isNative && unitUsd > 0 ? txValueFloat * unitUsd : undefined,
    orderId: dlnQuote.orderId,
    quotedAtMs,
    expiresAtMs,
  };
}

function snapshotFromSameChainSwap({
  amountUsd,
  asset,
  depositAddress,
  sourceAmountBaseUnit,
  swap,
  quotedAtMs,
  expiresAtMs,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  sourceAmountBaseUnit: string;
  swap: DlnSameChainSwapResponse;
  quotedAtMs: number;
  expiresAtMs: number;
}): ExecutionSnapshot {
  const tx: ExecutionTx = {
    to: swap.tx.to,
    data: swap.tx.data,
    value: swap.tx.value || "0",
    allowanceTarget: (swap.tx as ExecutionTx).allowanceTarget,
  };
  const srcAmountFloat = Number(ethers.utils.formatUnits(swap.tokenIn.amount, asset.decimals));
  const txValueFloat = Number(ethers.utils.formatUnits(tx.value, asset.decimals));
  const sendBaseUnit = asset.isNative ? tx.value : swap.tokenIn.amount;
  const sendAmountFloat = asset.isNative ? txValueFloat : srcAmountFloat;
  const unitUsd = srcAmountFloat > 0 && swap.tokenIn.approximateUsdValue
    ? swap.tokenIn.approximateUsdValue / srcAmountFloat
    : 0;
  const sendUsd = unitUsd > 0 ? sendAmountFloat * unitUsd : swap.tokenIn.approximateUsdValue;
  const receiveDecimals = swap.tokenOut.decimals ?? 6;
  const receiveFloat = Number(ethers.utils.formatUnits(swap.tokenOut.amount, receiveDecimals));
  const routeCostUsd = computeRouteCostUsd(swap.tokenIn.approximateUsdValue, swap.tokenOut.approximateUsdValue);
  const sendDisplay = `${formatCompactBalance(String(sendAmountFloat))} ${asset.symbol}`;

  return {
    kind: "same-chain",
    asset,
    amountUsd,
    sourceAmountBaseUnit,
    sendBaseUnit,
    sendAmountFloat,
    sendDisplay,
    sendUsd,
    receiveBaseUnit: swap.tokenOut.amount,
    receiveDecimals,
    receiveDisplay: receiveFloat.toFixed(4),
    receiveUsd: swap.tokenOut.approximateUsdValue,
    networkCostUsd: swap.estimatedTransactionFee?.approximateUsdValue,
    routeCostUsd,
    priceImpact: getBestAggregatorPriceDrop(swap),
    slippage: swap.recommendedSlippage ?? swap.slippage,
    estCheckoutTimeMs: undefined,
    recipientAddress: depositAddress,
    tx,
    approveSpender: tx.allowanceTarget || tx.to,
    fixedFeeDisplay: undefined,
    fixedFeeUsd: undefined,
    walletTotalDisplay: asset.isNative
      ? `${formatCompactBalance(String(txValueFloat))} ${asset.symbol}`
      : sendDisplay,
    walletTotalUsd: asset.isNative && unitUsd > 0 ? txValueFloat * unitUsd : undefined,
    orderId: undefined,
    quotedAtMs,
    expiresAtMs,
  };
}

function buildErc20TransferTx(
  tokenAddress: string,
  recipient: string,
  amountBaseUnit: string
): ExecutionTx {
  const iface = new ethers.utils.Interface(ERC20_EXECUTION_ABI);
  const data = iface.encodeFunctionData("transfer", [recipient, amountBaseUnit]);
  return { to: tokenAddress, data, value: "0" };
}

function isDirectPolygonStableDeposit(asset: DepositAsset): boolean {
  const address = asset.tokenAddress.toLowerCase();
  return (
    asset.chainId === String(POLYGON_CHAIN_ID) &&
    isStableLike(asset.symbol) &&
    (address === POLYGON_USDC_ADDRESS.toLowerCase() ||
      address === ADDRESSES.USDCe.toLowerCase())
  );
}

function toDlnTokenAddress(asset: DepositAsset): string {
  return asset.isNative ? ZERO_ADDRESS : asset.tokenAddress;
}

function getFixedFeeBreakdown({
  asset,
  fixedFeeBaseUnit,
  unitUsd,
}: {
  asset: DepositAsset;
  fixedFeeBaseUnit?: string;
  unitUsd: number;
}): { display?: string; usd?: number } {
  if (!fixedFeeBaseUnit || Number(fixedFeeBaseUnit) <= 0) return {};

  const decimals = asset.isNative ? asset.decimals : 18;
  const symbol = asset.isNative ? asset.symbol : getNativeFeeSymbol(asset.chainId);
  const feeFloat = Number(ethers.utils.formatUnits(fixedFeeBaseUnit, decimals));
  const usd = asset.isNative && unitUsd > 0 ? feeFloat * unitUsd : undefined;

  return {
    display: `${formatCompactBalance(String(feeFloat))} ${symbol}`,
    usd,
  };
}

function computeRouteCostUsd(inputUsd?: number, outputUsd?: number): number | undefined {
  if (inputUsd === undefined || outputUsd === undefined) return undefined;
  const diff = inputUsd - outputUsd;
  return diff > 0 ? diff : 0;
}

function getBestAggregatorPriceDrop(swap: DlnSameChainSwapResponse): number | undefined {
  const best = swap.comparedAggregators?.[0];
  return best?.priceDrop;
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

  const availableUsd = asset.usdValue ?? 0;
  if (availableUsd > 0 && amountUsd > availableUsd * 1.01) {
    return zh
      ? "输入金额超过当前钱包可用余额。"
      : "Amount exceeds the available wallet balance.";
  }

  return null;
}
