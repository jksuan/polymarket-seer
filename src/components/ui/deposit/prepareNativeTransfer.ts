/**
 * Polygon Connected 原生 POL 发送前校验与 value clamp。
 * 已知问题（2026-05-16）：冒烟仍失败且已排除钱包 POL 不足以付 gas；本文件逻辑未覆盖全部失败路径。
 */
import { ethers } from "ethers";
import { PUBLIC_RPC_URLS } from "./constants";
import {
  clampNativeTransferValue,
  formatNativeGasReserveError,
  getNativeGasReserveWei,
} from "./nativeGas";
import type { ExecutionSnapshot } from "./types";

export async function prepareNativeTransferTx(
  snapshot: ExecutionSnapshot,
  walletAddress: string,
  locale: string
): Promise<{ tx: ExecutionSnapshot["tx"]; wasClamped: boolean }> {
  const rpcUrl = PUBLIC_RPC_URLS[snapshot.asset.chainId];
  if (!rpcUrl) {
    throw new Error(formatNativeGasReserveError(locale, snapshot.asset.chainId));
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const balance = await provider.getBalance(walletAddress);
  const gasReserve = await getNativeGasReserveWei(snapshot.asset.chainId);
  const clamped = clampNativeTransferValue({
    balanceWei: balance,
    requestedValueWei: snapshot.tx.value || "0",
    gasReserveWei: gasReserve,
  });

  if (clamped.error || clamped.valueWei.lte(0)) {
    throw new Error(formatNativeGasReserveError(locale, snapshot.asset.chainId));
  }

  return {
    tx: {
      ...snapshot.tx,
      value: clamped.valueWei.toString(),
    },
    wasClamped: clamped.wasClamped,
  };
}

export function formatNativeAmountClampedWarning(locale: string): string {
  return locale === "zh"
    ? "已按钱包余额自动扣减少量 POL 作为网络费，请确认 MetaMask 中的支付金额后再签名。"
    : "The send amount was reduced slightly to reserve POL for network fees. Review the amount in MetaMask before signing.";
}
