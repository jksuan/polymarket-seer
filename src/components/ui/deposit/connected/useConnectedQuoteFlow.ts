import { useCallback, type MutableRefObject } from "react";
import type { CreateDepositResponse } from "@/types/bridge";
import { ensureEvmDepositAddress } from "../addresses";
import { DEPOSIT_SINGLE_TX_CAP_USD } from "../constants";
import { buildExecutionSnapshot, resolveExecutionEngine, validateBridgeReceiveMinimum, validateDepositSelection } from "../execution";
import { formatExecutionError } from "../errors";
import { getConnectedMaxAllowedUsdForAsset } from "../minimums";
import type { DepositAsset, ExecutionSnapshot, FlowStep } from "../types";

type UseConnectedQuoteFlowArgs = {
  amountNumber: number;
  depositAssets: DepositAsset[];
  locale: string;
  proxyAddress: string;
  quoteRequestRef: MutableRefObject<number>;
  selectedAsset: DepositAsset | null;
  selectedUsdValue?: number;
  setDepositResponse: (response: CreateDepositResponse | null) => void;
  setExecutionError: (value: string) => void;
  setExecutionRiskWarning: (value: string) => void;
  setIsQuoting: (value: boolean) => void;
  setQuoteError: (value: string) => void;
  setQuoteWarning: (value: string) => void;
  setSnapshot: (value: ExecutionSnapshot | null) => void;
  setStep: (value: FlowStep) => void;
  setTransferAddress: (value: string) => void;
  transferAddress: string;
};

export function useConnectedQuoteFlow({
  amountNumber,
  depositAssets,
  locale,
  proxyAddress,
  quoteRequestRef,
  selectedAsset,
  selectedUsdValue,
  setDepositResponse,
  setExecutionError,
  setExecutionRiskWarning,
  setIsQuoting,
  setQuoteError,
  setQuoteWarning,
  setSnapshot,
  setStep,
  setTransferAddress,
  transferAddress,
}: UseConnectedQuoteFlowArgs) {
  const handleQuote = useCallback(async () => {
    const maxDepositUsd = selectedAsset
      ? getConnectedMaxAllowedUsdForAsset(selectedAsset, DEPOSIT_SINGLE_TX_CAP_USD)
      : 0;
    if (!selectedAsset || !proxyAddress || amountNumber < 1 || amountNumber > maxDepositUsd + 0.01) return;
    const requestId = ++quoteRequestRef.current;
    setIsQuoting(true);
    setQuoteError("");
    setQuoteWarning("");
    setExecutionError("");
    setExecutionRiskWarning("");

    try {
      const validationError = validateDepositSelection({
        amountUsd: amountNumber,
        asset: selectedAsset,
        allAssets: depositAssets,
        connectedSingleTxCapUsd: DEPOSIT_SINGLE_TX_CAP_USD,
        locale,
      });
      if (validationError) {
        if (quoteRequestRef.current !== requestId) return;
        setQuoteError(validationError);
        return;
      }

      const executionEngine = resolveExecutionEngine(selectedAsset);
      const depositAddress = await ensureEvmDepositAddress({
        existingAddress: transferAddress,
        onAddress: setTransferAddress,
        onResponse: setDepositResponse,
        proxyAddress,
      });
      const next = await buildExecutionSnapshot({
        amountUsd: amountNumber,
        asset: selectedAsset,
        depositAddress,
        executionEngine,
        proxyAddress,
      });
      if (quoteRequestRef.current !== requestId) return;
      const receiveMinimumError = validateBridgeReceiveMinimum(next, locale);
      if (receiveMinimumError) {
        setQuoteError(receiveMinimumError);
        return;
      }
      setSnapshot(next);
      setStep("confirm");
    } catch (error) {
      if (quoteRequestRef.current !== requestId) return;
      setQuoteError(formatExecutionError(error, locale, "quote"));
    } finally {
      if (quoteRequestRef.current === requestId) {
        setIsQuoting(false);
      }
    }
  }, [
    amountNumber,
    depositAssets,
    locale,
    proxyAddress,
    quoteRequestRef,
    selectedAsset,
    selectedUsdValue,
    setDepositResponse,
    setExecutionError,
    setExecutionRiskWarning,
    setIsQuoting,
    setQuoteError,
    setQuoteWarning,
    setSnapshot,
    setStep,
    setTransferAddress,
    transferAddress,
  ]);

  return { handleQuote };
}
