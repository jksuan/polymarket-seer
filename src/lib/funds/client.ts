"use client";

import type {
  FundsApiErrorResponse,
  FundsApiSuccessResponse,
  FundsMovementListItem,
  UpsertUserWalletInput,
} from "@/types/funds";

async function fundsFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json()) as FundsApiSuccessResponse<T> | FundsApiErrorResponse;
  if (!json.ok) {
    throw new Error(json.message || "Funds API request failed");
  }
  return json.data;
}

export async function upsertFundsUserWallet(
  accessToken: string,
  body: UpsertUserWalletInput
): Promise<{ saved: boolean }> {
  return fundsFetch("/api/funds/wallet", accessToken, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function listFundsMovementsLive(
  accessToken: string,
  proxyAddress: string,
  limit = 100
): Promise<{ items: FundsMovementListItem[] }> {
  const query = new URLSearchParams({
    proxyAddress,
    limit: String(limit),
  });
  return fundsFetch(`/api/funds/movements-live?${query.toString()}`, accessToken);
}
