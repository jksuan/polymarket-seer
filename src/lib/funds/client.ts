"use client";

import type {
  FundsApiErrorResponse,
  FundsApiSuccessResponse,
  FundsMovementListItem,
  RecordFundsMovementInput,
  UpsertDepositBridgesInput,
  UpsertUserWalletInput,
  UpsertWithdrawDestinationInput,
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

export async function upsertFundsDepositBridges(
  accessToken: string,
  body: UpsertDepositBridgesInput
): Promise<{ saved: boolean }> {
  return fundsFetch("/api/funds/deposit-bridges", accessToken, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function upsertFundsWithdrawDestination(
  accessToken: string,
  body: UpsertWithdrawDestinationInput
): Promise<{ saved: boolean; id: number }> {
  return fundsFetch("/api/funds/withdraw-destinations", accessToken, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function recordFundsMovement(
  accessToken: string,
  body: RecordFundsMovementInput
): Promise<{ inserted: boolean; movement: FundsMovementListItem }> {
  return fundsFetch("/api/funds/movements", accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listFundsMovements(
  accessToken: string,
  limit = 100
): Promise<{ items: FundsMovementListItem[] }> {
  return fundsFetch(`/api/funds/movements?limit=${limit}`, accessToken);
}
