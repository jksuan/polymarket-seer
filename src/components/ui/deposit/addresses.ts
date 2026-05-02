import { ethers } from "ethers";
import { createDepositAddress } from "@/hooks/useBridge";
import type { BridgeAddressType, CreateDepositResponse } from "@/types/bridge";
import { ADDRESS_TYPES } from "./constants";
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

  const response = await createDepositAddress({ address: proxyAddress });
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
