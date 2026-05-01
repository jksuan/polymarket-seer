import type {
  BridgeApiErrorCode,
  BridgeApiErrorResponse,
  BridgeApiSuccessResponse,
} from "./bridge";

export type DlnApiErrorCode = BridgeApiErrorCode;
export type DlnApiSuccessResponse<T> = BridgeApiSuccessResponse<T>;
export type DlnApiErrorResponse = BridgeApiErrorResponse;
export type DlnApiResponse<T> = DlnApiSuccessResponse<T> | DlnApiErrorResponse;

export interface DlnTx {
  to: string;
  data: string;
  value: string;
}

export interface DlnTxFeeDetails {
  giveOrderState?: string;
  giveOrderWallet?: string;
  nonceMaster?: string;
  txFee?: string;
  priorityFee?: string;
  gasLimit?: string;
  gasPrice?: string;
  baseFee?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface DlnFeeInfo {
  total: string;
  details?: DlnTxFeeDetails;
  approximateUsdValue?: number;
}

export interface DlnTokenWithUsd {
  chainId?: number | string;
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  amount: string;
  approximateUsdValue?: number;
  approximateOperatingExpense?: string;
  mutatedWithOperatingExpense?: boolean;
  maxRefundAmount?: string;
}

export interface DlnTokenWithMin extends DlnTokenWithUsd {
  minAmount?: string;
  recommendedAmount?: string;
  recommendedApproximateUsdValue?: number;
  maxTheoreticalAmount?: string;
  maxTheoreticalApproximateUsdValue?: number;
}

export interface DlnCostsDetail {
  chain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  type: string;
  payload?: Record<string, unknown>;
}

export interface DlnSwapAggregatorComparison {
  name: string;
  amount: string;
  approximateUsdValue?: number;
  priceDrop?: number;
  imageUrl?: string;
}

export interface DlnQuoteRequest {
  srcChainId: string;
  srcChainTokenIn: string;
  srcChainTokenInAmount: string;
  dstChainId: string;
  dstChainTokenOut: string;
  dstChainTokenOutRecipient: string;
  srcChainOrderAuthorityAddress: string;
  dstChainOrderAuthorityAddress: string;
  dstChainTokenOutAmount?: string;
  senderAddress?: string;
  affiliateFeePercent?: number;
  affiliateFeeRecipient?: string;
  referralCode?: number | string;
  prependOperatingExpenses?: boolean;
}

export interface DlnQuoteEstimation {
  srcChainTokenIn: DlnTokenWithUsd;
  srcChainTokenOut?: DlnTokenWithUsd;
  dstChainTokenOut: DlnTokenWithMin;
  costsDetails?: DlnCostsDetail[];
  recommendedSlippage?: number;
}

export interface DlnQuoteResponse {
  estimation: DlnQuoteEstimation;
  tx: DlnTx;
  orderId: string;
  order?: {
    approximateFulfillmentDelay?: number;
    salt?: number;
    metadata?: string;
  };
  fixFee?: string;
  protocolFee?: string;
  protocolFeeApproximateUsdValue?: string | number;
  userPoints?: number;
  integratorPoints?: number;
  estimatedTransactionFee?: DlnFeeInfo;
  usdPriceImpact?: number | Record<string, unknown>;
}

export interface DlnSameChainSwapRequest {
  chainId: string;
  tokenIn: string;
  tokenInAmount: string;
  tokenOut: string;
  tokenOutRecipient: string;
  tokenOutAmount?: string;
  slippage?: string;
  affiliateFeePercent?: number;
  affiliateFeeRecipient?: string;
  referralCode?: number | string;
  senderAddress?: string;
  srcChainPriorityLevel?: "normal" | "aggressive";
}

export interface DlnSameChainSwapResponse {
  tx: DlnTx;
  tokenIn: DlnTokenWithUsd;
  tokenOut: DlnTokenWithMin;
  slippage?: number;
  recommendedSlippage?: number;
  protocolFee?: string;
  protocolFeeApproximateUsdValue?: string | number;
  comparedAggregators?: DlnSwapAggregatorComparison[];
  estimatedTransactionFee?: DlnFeeInfo;
  costsDetails?: DlnCostsDetail[];
}

export type DlnOrderStatus =
  | "None"
  | "Created"
  | "Fulfilled"
  | "SentUnlock"
  | "OrderCancelled"
  | "SentOrderCancel"
  | "ClaimedUnlock"
  | "ClaimedOrderCancel";

export interface DlnOrderStatusResponse {
  orderId: string;
  status: DlnOrderStatus | string;
}

export interface DlnOrderCancelTxResponse {
  to: string;
  data: string;
  value: string;
  chainId: number | string;
  from: string;
  cancelBeneficiary: string;
}

export type DlnTxStatusUiState =
  | "idle"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface DlnError {
  code: DlnApiErrorCode;
  message: string;
  requestId?: string;
  details?: unknown;
}
