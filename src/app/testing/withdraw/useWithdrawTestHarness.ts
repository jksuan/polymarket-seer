"use client";

import { useCallback, useMemo, useState } from "react";
import {
  formatAmountUsdInput,
  parseAmountUsd,
  sanitizeAmountUsdInput,
} from "@/components/ui/deposit/format";
import { JUMPER_SWAP_URL, UNISWAP_SWAP_URL } from "@/components/ui/withdraw/constants";
import type { WithdrawDestinationAsset } from "@/components/ui/withdraw/types";
import {
  isValidWithdrawRecipient,
  validateWithdrawAmountUsd,
  validateWithdrawRecipient,
} from "@/components/ui/withdraw/validation";
import { getPolygonPusdWithdrawAsset } from "@/components/ui/withdraw/withdrawAssets";

export const WITHDRAW_TEST_ASSETS: WithdrawDestinationAsset[] = [getPolygonPusdWithdrawAsset()];

export function useWithdrawTestHarness() {
  const locale = "en";
  const balanceNumber = 10;

  const [recipientAddr, setRecipientAddr] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const selectedAsset = WITHDRAW_TEST_ASSETS[0];

  const amountUsd = parseAmountUsd(amountInput);
  const amountError = amountInput.trim()
    ? validateWithdrawAmountUsd(amountUsd, balanceNumber, locale)
    : null;
  const recipientError = validateWithdrawRecipient(recipientAddr, "evm", locale);

  const canSubmit = Boolean(
    isValidWithdrawRecipient(recipientAddr, "evm") &&
      !amountError &&
      amountUsd > 0 &&
      !recipientError
  );

  const receiveAmountDisplay = useMemo(() => {
    if (amountUsd <= 0) return null;
    return `${amountUsd.toFixed(5)} PUSD`;
  }, [amountUsd]);

  const handleAmountChange = useCallback((value: string) => {
    setAmountInput(sanitizeAmountUsdInput(value));
  }, []);

  const handleMax = useCallback(() => {
    setAmountInput(formatAmountUsdInput(balanceNumber));
  }, [balanceNumber]);

  return {
    amountError,
    amountInput,
    amountUsd,
    balanceNumber,
    canSubmit,
    executionError: "",
    handleAmountChange,
    handleMax,
    handleUseConnected: () => {},
    handleWithdraw: () => {},
    isExecuting: false,
    primaryButtonLabel: "Withdraw",
    receiveAmountDisplay,
    recipientAddr,
    recipientError,
    selectedAsset,
    setRecipientAddr: (value: string) => {
      setRecipientAddr(value);
    },
    showUseConnected: false,
    statusMessage: "",
    statusPollAlertMessage: null,
    isRetryingStatusPoll: false,
    onRetryStatusPoll: () => {},
    uniswapSwapUrl: UNISWAP_SWAP_URL,
    jumperSwapUrl: JUMPER_SWAP_URL,
    withdrawFeedback: null,
  };
}
