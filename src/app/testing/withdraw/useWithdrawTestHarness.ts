"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatAmountUsdInput,
  parseAmountUsd,
  sanitizeAmountUsdInput,
} from "@/components/ui/deposit/format";
import { POLYGON_USDC_ADDRESS } from "@/components/ui/withdraw/constants";
import { resolveRecipientAddressType } from "@/components/ui/withdraw/recipientAddressType";
import type { WithdrawDestinationAsset } from "@/components/ui/withdraw/types";
import {
  isValidWithdrawRecipient,
  validateWithdrawAmountUsd,
  validateWithdrawRecipient,
} from "@/components/ui/withdraw/validation";
import {
  findWithdrawAssetForChainAndSymbol,
  getDefaultWithdrawAsset,
  getUniqueWithdrawTokenOptions,
  getWithdrawChainOptionsForSymbol,
} from "@/components/ui/withdraw/withdrawAssets";
import { normalizeWithdrawTokenSymbol } from "@/components/ui/withdraw/withdrawWhitelist";

export const WITHDRAW_TEST_ASSETS: WithdrawDestinationAsset[] = [
  {
    id: "137-usdc",
    chainId: "137",
    chainName: "Polygon",
    symbol: "USDC",
    tokenAddress: POLYGON_USDC_ADDRESS,
    decimals: 6,
  },
  {
    id: "42161-usdc",
    chainId: "42161",
    chainName: "Arbitrum",
    symbol: "USDC",
    tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    decimals: 6,
  },
  {
    id: "1-eth",
    chainId: "1",
    chainName: "Ethereum",
    symbol: "ETH",
    tokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    decimals: 18,
  },
  {
    id: "sol-usdc",
    chainId: "1151111081099710",
    chainName: "Solana",
    symbol: "USDC",
    tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
  },
];

export function useWithdrawTestHarness() {
  const locale = "en";
  const balanceNumber = 10;

  const [recipientAddr, setRecipientAddr] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const destinationAssets = WITHDRAW_TEST_ASSETS;
  const defaultAsset = getDefaultWithdrawAsset(destinationAssets)!;
  const [selectedChainId, setSelectedChainId] = useState(defaultAsset.chainId);
  const [selectedAssetId, setSelectedAssetId] = useState(defaultAsset.id);
  const [quoteReady, setQuoteReady] = useState(false);

  const tokenOptions = useMemo(
    () => getUniqueWithdrawTokenOptions(destinationAssets),
    [destinationAssets]
  );

  const selectedAsset =
    destinationAssets.find((a) => a.id === selectedAssetId) ?? defaultAsset;

  const selectedTokenSymbol = useMemo(
    () => normalizeWithdrawTokenSymbol(selectedAsset.symbol),
    [selectedAsset.symbol]
  );

  const selectedTokenOptionId = useMemo(() => {
    const option = tokenOptions.find(
      (asset) => normalizeWithdrawTokenSymbol(asset.symbol) === selectedTokenSymbol
    );
    return option?.id ?? selectedAsset.id;
  }, [tokenOptions, selectedAsset.id, selectedTokenSymbol]);

  const chainOptions = useMemo(
    () => getWithdrawChainOptionsForSymbol(destinationAssets, selectedTokenSymbol),
    [destinationAssets, selectedTokenSymbol]
  );

  const recipientAddressType = useMemo(
    () => resolveRecipientAddressType(selectedChainId, selectedAsset.chainName),
    [selectedAsset.chainName, selectedChainId]
  );

  const amountUsd = parseAmountUsd(amountInput);
  const amountError = amountInput.trim()
    ? validateWithdrawAmountUsd(amountUsd, balanceNumber, locale)
    : null;
  const recipientError = validateWithdrawRecipient(recipientAddr, recipientAddressType, locale);

  const canQuote = Boolean(
    selectedAsset &&
      isValidWithdrawRecipient(recipientAddr, recipientAddressType) &&
      !amountError &&
      amountUsd > 0
  );

  const canSubmit = Boolean(canQuote && quoteReady && !recipientError && !amountError);

  const handleAmountChange = useCallback((value: string) => {
    setAmountInput(sanitizeAmountUsdInput(value));
    setQuoteReady(false);
  }, []);

  const handleMax = useCallback(() => {
    setAmountInput(formatAmountUsdInput(balanceNumber));
    setQuoteReady(false);
  }, [balanceNumber]);

  const handleChainChange = useCallback((chainId: string) => {
    setSelectedChainId(chainId);
    setQuoteReady(false);
  }, []);

  const handleTokenChange = useCallback((assetId: string) => {
    setSelectedAssetId(assetId);
    setQuoteReady(false);
  }, []);

  useEffect(() => {
    if (!selectedTokenSymbol) return;
    if (chainOptions.length === 0) return;
    const exists = chainOptions.some((c) => c.chainId === selectedChainId);
    if (!exists) setSelectedChainId(chainOptions[0].chainId);
  }, [chainOptions, selectedChainId, selectedTokenSymbol]);

  useEffect(() => {
    if (!selectedTokenSymbol || !selectedChainId) return;
    const matched = findWithdrawAssetForChainAndSymbol(
      destinationAssets,
      selectedChainId,
      selectedTokenSymbol
    );
    if (matched && matched.id !== selectedAssetId) {
      setSelectedAssetId(matched.id);
    }
  }, [destinationAssets, selectedAssetId, selectedChainId, selectedTokenSymbol]);

  const refreshQuote = useCallback(() => {
    if (canQuote) setQuoteReady(true);
  }, [canQuote]);

  return {
    amountError,
    amountInput,
    amountUsd,
    assetsLoading: false,
    balanceNumber,
    canSubmit,
    chainOptions,
    destinationAssets,
    executionError: "",
    handleAmountChange,
    handleChainChange,
    handleMax,
    handleTokenChange,
    handleWithdraw: () => {},
    isExecuting: false,
    isQuoting: false,
    primaryButtonLabel: "Withdraw",
    quote: quoteReady
      ? {
          receiveAmountDisplay: `3.00000 ${selectedAsset.symbol}`,
          receiveUsd: amountUsd,
          fee: { gasUsd: 0, swapImpact: 0.08 },
        }
      : null,
    quoteError: "",
    recipientAddr,
    recipientAddressType,
    recipientError,
    selectedAsset,
    selectedChainId,
    selectedTokenOptionId,
    selectedTokenSymbol,
    setRecipientAddr: (value: string) => {
      setRecipientAddr(value);
      setQuoteReady(false);
    },
    showUseConnected: false,
    statusMessage: "",
    tokenOptions,
    refreshQuote,
  };
}
