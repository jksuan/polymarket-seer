import type { BridgeAddressType, QuoteFeeBreakdown } from "@/types/bridge";
import type { DlnTx } from "@/types/dln";

import type { FundsPersistenceApi } from "@/hooks/useFundsPersistence";

export interface DepositDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  proxyAddress: string;
  balanceUsd?: string;
  onBalanceRefresh?: () => void;
  fundsPersistence?: Pick<
    FundsPersistenceApi,
    "syncDepositBridges" | "recordDepositComplete" | "recordTransferDepositComplete"
  >;
}

export type FlowStep = "home" | "asset" | "amount" | "confirm" | "transfer";

export type DepositAsset = {
  id: string;
  chainId: string;
  chainName: string;
  symbol: string;
  name: string;
  tokenAddress: string;
  iconUrl?: string;
  decimals: number;
  minCheckoutUsd?: number;
  balance?: string;
  usdValue?: number;
  isNative?: boolean;
};

export type DepositAddressMap = Partial<Record<BridgeAddressType, string>>;

export type ExecutionKind = "idle" | "direct-transfer" | "same-chain" | "cross-chain";
export type ExecutionEngine = "evm" | "svm";

export type ExecutionTx = DlnTx & {
  allowanceTarget?: string;
};

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type ExecutionSnapshot = {
  executionEngine: ExecutionEngine;
  kind: Exclude<ExecutionKind, "idle">;
  asset: DepositAsset;
  amountUsd: number;
  sourceAmountBaseUnit: string;
  sendBaseUnit: string;
  sendAmountFloat: number;
  sendDisplay: string;
  sendUsd?: number;
  receiveBaseUnit: string;
  receiveDecimals: number;
  receiveDisplay: string;
  receiveSymbol?: string;
  receiveUsd?: number;
  networkCostUsd?: number;
  routeCostUsd?: number;
  priceImpact?: number;
  slippage?: number;
  estCheckoutTimeMs?: number;
  recipientAddress: string;
  tx: ExecutionTx;
  approveSpender?: string;
  fixedFeeDisplay?: string;
  fixedFeeUsd?: number;
  walletTotalDisplay?: string;
  walletTotalUsd?: number;
  orderId?: string;
  /** Bridge /quote 的 estFeeBreakdown，直充路径用于费用明细展示 */
  estFeeBreakdown?: QuoteFeeBreakdown;
  quotedAtMs: number;
  expiresAtMs: number;
};
