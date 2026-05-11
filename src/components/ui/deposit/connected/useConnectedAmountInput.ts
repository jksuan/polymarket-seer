import { useCallback } from "react";
import { CONNECTED_MAX_BUFFER_USD, DEPOSIT_SINGLE_TX_CAP_USD } from "../constants";
import { formatAmountUsdInput, sanitizeAmountUsdInput } from "../format";
import { getConnectedMaxAllowedUsd } from "../minimums";
import type { DepositAsset } from "../types";

type UseConnectedAmountInputArgs = {
  amountNumber: number;
  amountUsd: string;
  selectedAsset: DepositAsset | null;
  selectedUsdValue?: number;
  setAmountUsd: (value: string) => void;
};

export function useConnectedAmountInput({
  amountNumber,
  amountUsd,
  selectedAsset,
  selectedUsdValue,
  setAmountUsd,
}: UseConnectedAmountInputArgs) {
  const handlePercent = useCallback((percent: number) => {
    if (!selectedAsset) return;
    const value = Number(selectedUsdValue || 0);
    if (!Number.isFinite(value) || value <= 0) return;
    const nextAmount = percent === 1
      ? getConnectedMaxAllowedUsd({
        walletUsdValue: value,
        singleTxCapUsd: DEPOSIT_SINGLE_TX_CAP_USD,
        maxBufferUsd: CONNECTED_MAX_BUFFER_USD,
      })
      : value * percent;
    setAmountUsd(formatAmountUsdInput(nextAmount));
  }, [selectedAsset, selectedUsdValue, setAmountUsd]);

  const handleAmountChange = useCallback((value: string) => {
    setAmountUsd(sanitizeAmountUsdInput(value));
  }, [setAmountUsd]);

  const handleAmountBlur = useCallback(() => {
    if (!amountUsd) return;
    setAmountUsd(formatAmountUsdInput(amountNumber));
  }, [amountNumber, amountUsd, setAmountUsd]);

  return {
    handleAmountBlur,
    handleAmountChange,
    handlePercent,
  };
}
