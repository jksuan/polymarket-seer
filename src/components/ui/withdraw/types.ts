import type { QuoteFeeBreakdown, QuoteResponse } from "@/types/bridge";
import type { FundsPersistenceApi } from "@/hooks/useFundsPersistence";

export type WithdrawDestinationAsset = {
  id: string;
  chainId: string;
  chainName: string;
  symbol: string;
  tokenAddress: string;
  decimals: number;
  iconUrl?: string;
  minCheckoutUsd?: number;
};

export type WithdrawDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  proxyAddress: string;
  balanceUsd: string;
  onBalanceRefresh: () => void;
  fundsPersistence?: Pick<
    FundsPersistenceApi,
    "syncWithdrawDestination" | "recordWithdrawComplete"
  >;
};

export type WithdrawQuoteState = {
  response: QuoteResponse;
  fee: QuoteFeeBreakdown | undefined;
  receiveAmountDisplay: string;
  receiveUsd: number;
  quotedAtMs: number;
};

/** Status line with receive-token icon and withdraw amount (submitted / completed / failed / cancelled). */
export type WithdrawFeedback = {
  amountUsd: number;
  message: string;
  tone: "success" | "error";
  tokenSymbol: string;
  tokenIconUrl?: string;
  /** Play success check + pulse when withdrawal is completed. */
  celebrate?: boolean;
};
