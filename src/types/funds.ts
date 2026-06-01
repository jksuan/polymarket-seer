export type FundsMovementType = "deposit" | "withdraw";

export type FundsMovementStatus = "completed" | "failed" | "processing";

export type FundsApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface FundsApiSuccessResponse<T> {
  ok: true;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface FundsApiErrorResponse {
  ok: false;
  code: FundsApiErrorCode;
  message: string;
  requestId: string;
  timestamp: string;
  details?: unknown;
}

export interface FundsMovementListItem {
  movementType: FundsMovementType;
  amountUsd: number;
  occurredAt: string;
  status: FundsMovementStatus;
}

export interface UpsertUserWalletInput {
  signerAddress: string;
  proxyAddress: string;
  sessionMode?: string | null;
}

export interface UpsertDepositBridgesInput {
  proxyAddress: string;
  evmAddress?: string | null;
  svmAddress?: string | null;
  tronAddress?: string | null;
  btcAddress?: string | null;
}

export interface UpsertWithdrawDestinationInput {
  proxyAddress: string;
  toChainId: string;
  toTokenAddress: string;
  recipientAddr: string;
  bridgeEvm?: string | null;
}

export interface RecordFundsMovementInput {
  proxyAddress: string;
  movementType: FundsMovementType;
  status: FundsMovementStatus;
  amountUsd: number;
  occurredAt: string | number;
  idempotencyKey: string;
  fromChainId?: string | null;
  toChainId?: string | null;
  fromTokenAddress?: string | null;
  toTokenAddress?: string | null;
  tokenSymbol?: string | null;
  tokenDecimals?: number | null;
  fromAmountBaseUnit?: string | null;
  bridgeStatusAddress?: string | null;
  sourceAddress?: string | null;
  recipientAddr?: string | null;
  txHash?: string | null;
  rawBridgeTransaction?: unknown;
}

export interface FundsMovementRow extends FundsMovementListItem {
  id: number;
  privyUserId: string;
  proxyAddress: string;
  idempotencyKey: string;
}
