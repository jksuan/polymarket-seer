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
