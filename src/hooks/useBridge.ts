"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type {
  BridgeError,
  BridgeStatusResponse,
  BridgeStatusUiState,
  BridgeTransaction,
  BridgeTxStatus,
  CreateDepositRequest,
  CreateDepositResponse,
  CreateWithdrawRequest,
  CreateWithdrawResponse,
  QuoteRequest,
  QuoteResponse,
  SupportedAssetsResponse,
} from "@/types/bridge";
import { bridgeRequest, BridgeRequestError } from "@/lib/bridgeClient";
import { bridgeKeys, type BridgeStatusKey } from "@/lib/bridgeKeys";

const SUPPORTED_ASSETS_DEDUPING_INTERVAL_MS = 60_000;
const STATUS_REFRESH_INTERVAL_MS = 10_000;
const FINAL_STATUSES = new Set<string>(["COMPLETED", "FAILED"]);

export function useSupportedAssets() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    SupportedAssetsResponse,
    BridgeRequestError
  >(
    bridgeKeys.supportedAssets(),
    ([url]) => bridgeRequest<SupportedAssetsResponse>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: SUPPORTED_ASSETS_DEDUPING_INTERVAL_MS,
    }
  );

  return {
    data,
    error: toBridgeError(error),
    isLoading,
    isValidating,
    mutate,
  };
}

export function useBridgeStatus(address?: string | null, enabled = true) {
  const normalizedAddress = address?.trim();
  const swrKey =
    enabled && normalizedAddress ? bridgeKeys.status(normalizedAddress) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    BridgeStatusResponse,
    BridgeRequestError,
    BridgeStatusKey | null
  >(
    swrKey,
    ([, statusAddress]) =>
      bridgeRequest<BridgeStatusResponse>(
        `/api/bridge/status/${encodeURIComponent(statusAddress)}`
      ),
    {
      revalidateOnFocus: true,
      dedupingInterval: 2_000,
      refreshInterval: (latestData) =>
        isFinalBridgeStatus(latestData) ? 0 : STATUS_REFRESH_INTERVAL_MS,
    }
  );

  const latestTransaction = useMemo(
    () => getLatestBridgeTransaction(data),
    [data]
  );
  const latestStatus = latestTransaction?.status as BridgeTxStatus | undefined;
  const isFinal = isFinalStatus(latestStatus);

  return {
    data,
    error: toBridgeError(error),
    isLoading,
    isValidating,
    mutate,
    latestTransaction,
    latestStatus,
    isFinal,
    uiState: toBridgeStatusUiState(latestStatus),
  };
}

export function createDepositAddress(
  input: CreateDepositRequest
): Promise<CreateDepositResponse> {
  return bridgeRequest<CreateDepositResponse>("/api/bridge/deposit", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getBridgeQuote(input: QuoteRequest): Promise<QuoteResponse> {
  return bridgeRequest<QuoteResponse>("/api/bridge/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createWithdrawAddress(
  input: CreateWithdrawRequest
): Promise<CreateWithdrawResponse> {
  return bridgeRequest<CreateWithdrawResponse>("/api/bridge/withdraw", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getLatestBridgeTransaction(
  data?: BridgeStatusResponse
): BridgeTransaction | undefined {
  const transactions = data?.transactions ?? [];
  if (transactions.length === 0) return undefined;

  return transactions.reduce<BridgeTransaction | undefined>((latest, tx) => {
    if (!latest) return tx;
    const latestTime = latest.createdTimeMs ?? 0;
    const txTime = tx.createdTimeMs ?? 0;
    return txTime >= latestTime ? tx : latest;
  }, undefined);
}

export function isFinalBridgeStatus(data?: BridgeStatusResponse): boolean {
  const status = getLatestBridgeTransaction(data)?.status;
  return isFinalStatus(status);
}

export function isFinalStatus(status?: string): boolean {
  return Boolean(status && FINAL_STATUSES.has(status));
}

export function toBridgeStatusUiState(
  status?: string
): BridgeStatusUiState {
  switch (status) {
    case "DEPOSIT_DETECTED":
      return "pending";
    case "PROCESSING":
    case "ORIGIN_TX_CONFIRMED":
    case "SUBMITTED":
      return "processing";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    default:
      return "idle";
  }
}

function toBridgeError(error?: BridgeRequestError): BridgeError | undefined {
  if (!error) return undefined;

  return {
    code: error.code,
    message: error.message,
    requestId: error.requestId,
    details: error.details,
  };
}
