"use client";

import useSWR from "swr";
import type {
  DlnError,
  DlnOrderCancelTxResponse,
  DlnOrderStatusResponse,
  DlnQuoteRequest,
  DlnQuoteResponse,
  DlnSameChainSwapRequest,
  DlnSameChainSwapResponse,
  DlnTxStatusUiState,
} from "@/types/dln";
import { dlnRequest, DlnRequestError } from "@/lib/dlnClient";
import {
  dlnKeys,
  type DlnOrderStatusKey,
  type DlnQuoteKey,
  type DlnSameChainKey,
} from "@/lib/dlnKeys";

const QUOTE_DEDUPING_INTERVAL_MS = 5_000;
const ORDER_STATUS_REFRESH_INTERVAL_MS = 8_000;
const FINAL_ORDER_STATUSES = new Set<string>([
  "ClaimedUnlock",
  "OrderCancelled",
  "ClaimedOrderCancel",
]);

export function useDlnQuote(
  input?: DlnQuoteRequest | null,
  enabled = true
) {
  const swrKey = enabled && input ? dlnKeys.quote(input) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    DlnQuoteResponse,
    DlnRequestError,
    DlnQuoteKey | null
  >(
    swrKey,
    ([url, payload]) =>
      dlnRequest<DlnQuoteResponse>(url, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: QUOTE_DEDUPING_INTERVAL_MS,
    }
  );

  return {
    data,
    error: toDlnError(error),
    isLoading,
    isValidating,
    mutate,
  };
}

export function useDlnSameChainSwap(
  input?: DlnSameChainSwapRequest | null,
  enabled = true
) {
  const swrKey = enabled && input ? dlnKeys.sameChain(input) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    DlnSameChainSwapResponse,
    DlnRequestError,
    DlnSameChainKey | null
  >(
    swrKey,
    ([url, payload]) =>
      dlnRequest<DlnSameChainSwapResponse>(url, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: QUOTE_DEDUPING_INTERVAL_MS,
    }
  );

  return {
    data,
    error: toDlnError(error),
    isLoading,
    isValidating,
    mutate,
  };
}

export function useDlnOrderStatus(orderId?: string | null, enabled = true) {
  const normalizedOrderId = orderId?.trim();
  const swrKey =
    enabled && normalizedOrderId ? dlnKeys.orderStatus(normalizedOrderId) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    DlnOrderStatusResponse,
    DlnRequestError,
    DlnOrderStatusKey | null
  >(
    swrKey,
    ([, statusOrderId]) =>
      dlnRequest<DlnOrderStatusResponse>(
        `/api/dln/order/${encodeURIComponent(statusOrderId)}`
      ),
    {
      revalidateOnFocus: true,
      dedupingInterval: 2_000,
      refreshInterval: (latestData) =>
        isFinalDlnOrderStatus(latestData?.status)
          ? 0
          : ORDER_STATUS_REFRESH_INTERVAL_MS,
    }
  );

  return {
    data,
    error: toDlnError(error),
    isLoading,
    isValidating,
    mutate,
    status: data?.status,
    isFinal: isFinalDlnOrderStatus(data?.status),
    uiState: toDlnStatusUiState(data?.status),
  };
}

export function getDlnQuote(input: DlnQuoteRequest): Promise<DlnQuoteResponse> {
  return dlnRequest<DlnQuoteResponse>("/api/dln/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getDlnSameChainSwap(
  input: DlnSameChainSwapRequest
): Promise<DlnSameChainSwapResponse> {
  return dlnRequest<DlnSameChainSwapResponse>("/api/dln/same-chain", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getDlnOrderStatus(
  orderId: string
): Promise<DlnOrderStatusResponse> {
  return dlnRequest<DlnOrderStatusResponse>(
    `/api/dln/order/${encodeURIComponent(orderId)}`
  );
}

export function getDlnCancelTx(
  orderId: string
): Promise<DlnOrderCancelTxResponse> {
  return dlnRequest<DlnOrderCancelTxResponse>(
    `/api/dln/order/${encodeURIComponent(orderId)}/cancel-tx`
  );
}

export function isFinalDlnOrderStatus(status?: string): boolean {
  return Boolean(status && FINAL_ORDER_STATUSES.has(status));
}

export function toDlnStatusUiState(
  status?: string
): DlnTxStatusUiState {
  switch (status) {
    case "Created":
      return "pending";
    case "Fulfilled":
    case "SentUnlock":
    case "SentOrderCancel":
      return "processing";
    case "ClaimedUnlock":
      return "completed";
    case "OrderCancelled":
    case "ClaimedOrderCancel":
      return "cancelled";
    case "None":
      return "idle";
    default:
      return status ? "processing" : "idle";
  }
}

function toDlnError(error?: DlnRequestError): DlnError | undefined {
  if (!error) return undefined;

  return {
    code: error.code,
    message: error.message,
    requestId: error.requestId,
    details: error.details,
  };
}
