export type BridgeAddressType = "evm" | "svm" | "btc" | "tron";

export type BridgeApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UPSTREAM_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface BridgeApiSuccessResponse<T> {
  ok: true;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface BridgeApiErrorResponse {
  ok: false;
  code: BridgeApiErrorCode;
  message: string;
  details?: unknown;
  requestId: string;
  timestamp: string;
}

export type BridgeApiResponse<T> =
  | BridgeApiSuccessResponse<T>
  | BridgeApiErrorResponse;

export interface BridgeError {
  code: BridgeApiErrorCode;
  message: string;
  requestId?: string;
  details?: unknown;
}

export type BridgeStatusUiState =
  | "idle"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface SupportedAsset {
  symbol: string;
  tokenAddress: string;
  decimals?: number;
  minCheckoutUsd?: number;
  name?: string;
  [key: string]: unknown;
}

export interface SupportedChain {
  chainId: string;
  name?: string;
  addressType?: BridgeAddressType;
  assets?: SupportedAsset[];
  [key: string]: unknown;
}

export interface SupportedAssetsResponse {
  chains?: SupportedChain[];
  assets?: SupportedAsset[];
  [key: string]: unknown;
}

export interface CreateDepositRequest {
  address: string;
}

export interface BridgeAddresses {
  evm?: string;
  svm?: string;
  btc?: string;
  tron?: string;
  [key: string]: string | undefined;
}

export interface CreateDepositResponse {
  address?: string;
  depositAddresses?: BridgeAddresses;
  [key: string]: unknown;
}

export interface QuoteRequest {
  fromAmountBaseUnit: string;
  fromChainId: string;
  fromTokenAddress: string;
  recipientAddress: string;
  toChainId: string;
  toTokenAddress: string;
}

export interface QuoteFeeBreakdown {
  gasUsd?: number;
  appFeeLabel?: string;
  appFeePercent?: number;
  appFeeUsd?: number;
  fillCostPercent?: number;
  fillCostUsd?: number;
  maxSlippage?: number;
  minReceived?: number;
  swapImpact?: number;
  swapImpactUsd?: number;
  totalImpact?: number;
  totalImpactUsd?: number;
  [key: string]: unknown;
}

export interface QuoteResponse {
  quoteId?: string;
  estCheckoutTimeMs?: number;
  estInputUsd?: number;
  estOutputUsd?: number;
  estToTokenBaseUnit?: string;
  estFeeBreakdown?: QuoteFeeBreakdown;
  [key: string]: unknown;
}

export interface CreateWithdrawRequest {
  address: string;
  toChainId: string;
  toTokenAddress: string;
  recipientAddr: string;
}

export interface CreateWithdrawResponse {
  address?: string;
  withdrawAddresses?: BridgeAddresses;
  [key: string]: unknown;
}

export type BridgeTxStatus =
  | "DEPOSIT_DETECTED"
  | "PROCESSING"
  | "ORIGIN_TX_CONFIRMED"
  | "SUBMITTED"
  | "COMPLETED"
  | "FAILED";

export interface BridgeTransaction {
  fromChainId?: string;
  fromTokenAddress?: string;
  fromAmountBaseUnit?: string;
  toChainId?: string;
  toTokenAddress?: string;
  status: BridgeTxStatus | string;
  txHash?: string;
  createdTimeMs?: number;
  [key: string]: unknown;
}

export interface BridgeStatusResponse {
  transactions: BridgeTransaction[];
  [key: string]: unknown;
}
