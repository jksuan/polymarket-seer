import { ethers } from "ethers";

import { PUSD_DECIMALS } from "./constants";

/** Polymarket Bridge 最低提现 $3（6 位小数原子单位） */
export const MIN_WITHDRAW_ATOMIC = BigInt(3_000_000);

/** 链上 pUSD 原子单位 → 展示/输入字符串（最多 6 位小数，不四舍五入抬升） */
export function formatPusdFromAtomic(atomic: bigint): string {
  return ethers.utils.formatUnits(atomic, PUSD_DECIMALS);
}

export function parsePusdInputToAtomic(input: string): bigint {
  const normalized = input.replace(/,/g, "").trim();
  if (!normalized) return BigInt(0);
  try {
    return BigInt(ethers.utils.parseUnits(normalized, PUSD_DECIMALS).toString());
  } catch {
    return BigInt(0);
  }
}

/** 提现金额输入：允许最多 6 位小数（与 Polymarket 提现一致） */
export function sanitizePusdAmountInput(value: string): string {
  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const decimalPart = decimalParts.join("").slice(0, PUSD_DECIMALS);
  const trimmedInteger = integerPart.replace(/^0+(?=\d)/, "");
  const nextInteger = trimmedInteger || (integerPart ? "0" : "");
  const formattedInteger = nextInteger
    ? Number(nextInteger).toLocaleString("en-US")
    : "";

  if (normalized.includes(".")) {
    return (formattedInteger || "0") + "." + decimalPart;
  }

  return formattedInteger;
}

export function validateWithdrawAmountAtomic(
  amountAtomic: bigint,
  maxAtomic: bigint,
  locale: string
): string | null {
  if (amountAtomic <= BigInt(0)) {
    return locale === "zh" ? "请输入金额" : "Enter an amount";
  }
  if (amountAtomic < MIN_WITHDRAW_ATOMIC) {
    return locale === "zh"
      ? `最低提现金额为 $${(Number(MIN_WITHDRAW_ATOMIC) / 1_000_000).toFixed(2)}`
      : `Minimum Amount is $${(Number(MIN_WITHDRAW_ATOMIC) / 1_000_000).toFixed(2)}`;
  }
  if (amountAtomic > maxAtomic) {
    return locale === "zh" ? "金额超过可用余额" : "Amount exceeds balance";
  }
  return null;
}
