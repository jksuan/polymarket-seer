import { ethers } from "ethers";
import { MIN_WITHDRAW_USD } from "./constants";
import type { WithdrawRecipientAddressType } from "./recipientAddressType";

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function isBase58String(value: string, minLen: number, maxLen: number): boolean {
  if (value.length < minLen || value.length > maxLen) return false;
  for (const ch of value) {
    if (!BASE58_CHARS.includes(ch)) return false;
  }
  return true;
}

export function isValidEvmRecipient(address: string): boolean {
  const trimmed = address.trim();
  return Boolean(trimmed) && ethers.utils.isAddress(trimmed);
}

/** Solana base58 pubkey (32–44 chars). */
export function isValidSvmRecipient(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed || trimmed.startsWith("0x")) return false;
  return isBase58String(trimmed, 32, 44);
}

/** Bitcoin legacy (1/3) or bech32 (bc1) addresses. */
export function isValidBtcRecipient(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed) return false;
  if (/^bc1[a-z0-9]{25,62}$/i.test(trimmed)) return true;
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed);
}

/** Tron base58 address (T + 33 chars). */
export function isValidTronRecipient(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed) return false;
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed);
}

export function isValidWithdrawRecipient(
  address: string,
  addressType: WithdrawRecipientAddressType
): boolean {
  switch (addressType) {
    case "svm":
      return isValidSvmRecipient(address);
    case "btc":
      return isValidBtcRecipient(address);
    case "tron":
      return isValidTronRecipient(address);
  }
  return isValidEvmRecipient(address);
}

export function validateWithdrawRecipient(
  address: string,
  addressType: WithdrawRecipientAddressType,
  locale: string
): string | null {
  const trimmed = address.trim();
  if (!trimmed) return null;
  if (isValidWithdrawRecipient(trimmed, addressType)) return null;

  if (locale === "zh") {
    switch (addressType) {
      case "svm":
        return "请输入有效的 Solana 收款地址";
      case "btc":
        return "请输入有效的 Bitcoin 收款地址";
      case "tron":
        return "请输入有效的 Tron 收款地址";
      default:
        return "请输入有效的 EVM 收款地址";
    }
  }

  switch (addressType) {
    case "svm":
      return "Enter a valid Solana recipient address";
    case "btc":
      return "Enter a valid Bitcoin recipient address";
    case "tron":
      return "Enter a valid Tron recipient address";
    default:
      return "Enter a valid EVM recipient address";
  }
}

export function validateWithdrawAmountUsd(
  amountUsd: number,
  balanceUsd: number,
  locale: string
): string | null {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return locale === "zh" ? "请输入金额" : "Enter an amount";
  }
  if (amountUsd < MIN_WITHDRAW_USD) {
    return locale === "zh"
      ? `最低提现金额为 $${MIN_WITHDRAW_USD.toFixed(2)}`
      : `Minimum Amount is $${MIN_WITHDRAW_USD.toFixed(2)}`;
  }
  if (amountUsd > balanceUsd + 1e-6) {
    return locale === "zh" ? "金额超过可用余额" : "Amount exceeds balance";
  }
  return null;
}
