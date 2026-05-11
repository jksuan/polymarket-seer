import { ethers } from "ethers";
import { createDepositAddress } from "@/hooks/useBridge";
import type { BridgeAddressType, CreateDepositResponse } from "@/types/bridge";
import { ADDRESS_TYPES, DEPOSIT_CREATE_REQUESTED_ADDRESS_TYPES } from "./constants";
import type { DepositAddressMap } from "./types";

export async function ensureEvmDepositAddress({
  existingAddress,
  onAddress,
  onResponse,
  proxyAddress,
}: {
  existingAddress: string;
  onAddress: (address: string) => void;
  onResponse: (response: CreateDepositResponse) => void;
  proxyAddress: string;
}): Promise<string> {
  if (ethers.utils.isAddress(existingAddress)) return existingAddress;
  if (!proxyAddress) throw new Error("Polymarket wallet is not ready.");

  const response = await createDepositAddress({
    address: proxyAddress,
    requestedAddressTypes: DEPOSIT_CREATE_REQUESTED_ADDRESS_TYPES,
  });
  const address = extractDepositAddress(response, "evm");
  onResponse(response);
  onAddress(address);

  if (!ethers.utils.isAddress(address)) {
    throw new Error("No valid EVM deposit address returned.");
  }

  return address;
}

export function extractDepositAddress(
  response: CreateDepositResponse,
  addressType: BridgeAddressType
): string {
  const record = response as Record<string, unknown>;
  const nested = record.address ?? record.depositAddresses ?? record.addresses;

  if (nested && typeof nested === "object") {
    const address = (nested as DepositAddressMap)[addressType];
    if (typeof address === "string") return address;
  }

  const direct = record[addressType] ?? record[`${addressType}Address`];
  return typeof direct === "string" ? direct : "";
}

export function extractAnyDepositAddress(response: CreateDepositResponse): string {
  for (const addressType of ADDRESS_TYPES) {
    const address = extractDepositAddress(response, addressType);
    if (address) return address;
  }
  return "";
}

export function extractDepositAddressMap(response: CreateDepositResponse): DepositAddressMap {
  const result: DepositAddressMap = {};
  for (const addressType of ADDRESS_TYPES) {
    const address = extractDepositAddress(response, addressType);
    if (address) {
      result[addressType] = address;
    }
  }
  return result;
}

/** 防止 UI 链选择与收款地址格式错位（例如 EVM 链仍展示 Solana 地址）。 */
export function depositAddressMatchesType(
  address: string,
  addressType: BridgeAddressType
): boolean {
  const value = address.trim();
  if (!value) return false;
  if (addressType === "evm") {
    try {
      return ethers.utils.isAddress(value);
    } catch {
      return false;
    }
  }
  if (addressType === "svm") {
    if (value.startsWith("0x")) return false;
    return /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(value);
  }
  if (addressType === "btc") {
    return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/.test(value);
  }
  if (addressType === "tron") {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
  }
  return false;
}
