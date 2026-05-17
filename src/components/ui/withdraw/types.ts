import type { QuoteFeeBreakdown, QuoteResponse } from "@/types/bridge";

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
};

export type WithdrawQuoteState = {
  response: QuoteResponse;
  fee: QuoteFeeBreakdown | undefined;
  receiveAmountDisplay: string;
  receiveUsd: number;
  quotedAtMs: number;
};
