import type { CreateDepositResponse } from "@/types/bridge";
import type { RecordFundsMovementInput, UpsertDepositBridgesInput } from "@/types/funds";
import { extractDepositAddressMap } from "@/components/ui/deposit/addresses";
import { buildDefaultIdempotencyKey } from "@/lib/funds/validation";

export function buildDepositBridgesPayload(
  proxyAddress: string,
  response: CreateDepositResponse
): UpsertDepositBridgesInput {
  const map = extractDepositAddressMap(response);
  return {
    proxyAddress,
    evmAddress: map.evm ?? null,
    svmAddress: map.svm ?? null,
    tronAddress: map.tron ?? null,
    btcAddress: map.btc ?? null,
  };
}

export function buildCompletedMovementPayload(params: {
  proxyAddress: string;
  movementType: "deposit" | "withdraw";
  amountUsd: number;
  bridgeStatusAddress?: string | null;
  txHash?: string | null;
  occurredAt?: string;
  fromChainId?: string | null;
  toChainId?: string | null;
  fromTokenAddress?: string | null;
  toTokenAddress?: string | null;
  tokenSymbol?: string | null;
  tokenDecimals?: number | null;
  fromAmountBaseUnit?: string | null;
  recipientAddr?: string | null;
  rawBridgeTransaction?: unknown;
}): RecordFundsMovementInput {
  const occurredAt = params.occurredAt ?? new Date().toISOString();
  return {
    proxyAddress: params.proxyAddress,
    movementType: params.movementType,
    status: "completed",
    amountUsd: params.amountUsd,
    occurredAt,
    idempotencyKey: buildDefaultIdempotencyKey({
      movementType: params.movementType,
      status: "completed",
      bridgeStatusAddress: params.bridgeStatusAddress,
      txHash: params.txHash,
      occurredAt,
    }),
    fromChainId: params.fromChainId ?? null,
    toChainId: params.toChainId ?? null,
    fromTokenAddress: params.fromTokenAddress ?? null,
    toTokenAddress: params.toTokenAddress ?? null,
      tokenSymbol: params.tokenSymbol ?? null,
      tokenDecimals: params.tokenDecimals ?? null,
      fromAmountBaseUnit: params.fromAmountBaseUnit ?? null,
      bridgeStatusAddress: params.bridgeStatusAddress ?? null,
      recipientAddr: params.recipientAddr ?? null,
      txHash: params.txHash ?? null,
      rawBridgeTransaction: params.rawBridgeTransaction,
    };
}
