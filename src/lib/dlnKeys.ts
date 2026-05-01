import type {
  DlnQuoteRequest,
  DlnSameChainSwapRequest,
} from "@/types/dln";

export const dlnKeys = {
  quote: (input: DlnQuoteRequest) => ["/api/dln/quote", input] as const,
  sameChain: (input: DlnSameChainSwapRequest) =>
    ["/api/dln/same-chain", input] as const,
  orderStatus: (orderId: string) => ["/api/dln/order", orderId] as const,
};

export type DlnQuoteKey = ReturnType<typeof dlnKeys.quote>;
export type DlnSameChainKey = ReturnType<typeof dlnKeys.sameChain>;
export type DlnOrderStatusKey = ReturnType<typeof dlnKeys.orderStatus>;
