import { ethers } from "ethers";
import { PUBLIC_RPC_URLS } from "./constants";
import { getNativeFeeSymbol } from "./assets";

/**
 * 已知问题（2026-05-16）：Connected 在 Polygon 上充值原生 POL 仍失败，老账户与新账户均复现。
 * 用户侧已确认钱包内 POL 足以支付网络费，根因不在 gas 不足；本模块仅负责预留与 clamp。
 * 详见仓库 issue（明日跟进）：余额误判、gas limit、签名等待超时等切片已合入，端到端仍待排查。
 */

/** 简单原生币转账（EOA → EOA）的标准 gas limit */
export const SIMPLE_NATIVE_TRANSFER_GAS_LIMIT = 21_000;

/** estimateGas 异常偏高时的上限（Polygon 区块 gas cap 约 33.5M） */
export const EVM_TX_GAS_LIMIT_CAP = 500_000;

const GAS_HEADROOM_NUMERATOR = 120;
const GAS_HEADROOM_DENOMINATOR = 100;

/** 无法读链上 gasPrice 时，按链预留的原生币数量（仅用于 gas，非 USD 缓冲） */
export const FALLBACK_NATIVE_GAS_RESERVE: Record<string, string> = {
  "1": "0.002",
  "10": "0.0005",
  "56": "0.001",
  "137": "0.05",
  "8453": "0.0005",
  "42161": "0.0005",
};

export function isSimpleNativeTransferTx(tx: { data?: string; value?: string }): boolean {
  const data = (tx.data || "0x").toLowerCase();
  const value = ethers.BigNumber.from(tx.value || "0");
  return value.gt(0) && (data === "0x" || data === "0x0");
}

export async function getNativeGasReserveWei(chainId: string): Promise<ethers.BigNumber> {
  const rpcUrl = PUBLIC_RPC_URLS[chainId];
  const fallbackAmount =
    FALLBACK_NATIVE_GAS_RESERVE[chainId] ?? FALLBACK_NATIVE_GAS_RESERVE["137"];
  const fallback = ethers.utils.parseUnits(
    fallbackAmount,
    chainId === "56" ? 18 : 18
  );

  if (!rpcUrl) {
    return fallback;
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const gasPrice = await provider.getGasPrice();
    const limit = ethers.BigNumber.from(SIMPLE_NATIVE_TRANSFER_GAS_LIMIT);
    return gasPrice
      .mul(limit)
      .mul(GAS_HEADROOM_NUMERATOR)
      .div(GAS_HEADROOM_DENOMINATOR);
  } catch {
    return fallback;
  }
}

export function clampNativeTransferValue(params: {
  balanceWei: ethers.BigNumberish;
  requestedValueWei: ethers.BigNumberish;
  gasReserveWei: ethers.BigNumberish;
}): {
  valueWei: ethers.BigNumber;
  error: "insufficient_for_gas" | null;
  wasClamped: boolean;
} {
  const balance = ethers.BigNumber.from(params.balanceWei);
  const requested = ethers.BigNumber.from(params.requestedValueWei);
  const reserve = ethers.BigNumber.from(params.gasReserveWei);
  const maxSend = balance.sub(reserve);

  if (maxSend.lte(0)) {
    return { valueWei: ethers.BigNumber.from(0), error: "insufficient_for_gas", wasClamped: false };
  }
  if (requested.gt(maxSend)) {
    return { valueWei: maxSend, error: null, wasClamped: true };
  }
  return { valueWei: requested, error: null, wasClamped: false };
}

export function formatNativeGasReserveError(locale: string, chainId: string): string {
  const symbol = getNativeFeeSymbol(chainId);
  const zh = locale === "zh";
  return zh
    ? `钱包内需保留少量 ${symbol} 支付网络费，请降低充值金额或先补充 ${symbol} 后再试。`
    : `Keep some ${symbol} in your wallet for network fees. Lower the deposit amount or top up ${symbol} first.`;
}
