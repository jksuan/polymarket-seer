"use client";

import { useCallback, useMemo, useState } from "react";
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
  assetsForChain,
  getDefaultWithdrawAsset,
  groupChains,
} from "@/components/ui/withdraw/withdrawAssets";

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
    id: "sol-usdc",
    chainId: "1151111081099710",
    chainName: "Solana",
    symbol: "USDC",
    tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
  },
  {
    id: "btc-btc",
    chainId: "8253038",
    chainName: "Bitcoin",
    symbol: "BTC",
    tokenAddress: "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8",
    decimals: 8,
  },
  {
    id: "tron-usdt",
    chainId: "728126428",
    chainName: "Tron",
    symbol: "USDT",
    tokenAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    decimals: 6,
  },
];

export function useWithdrawTestHarness() {
  const locale = "en";
  const balanceNumber = 10;

  const [recipientAddr, setRecipientAddr] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const defaultAsset = getDefaultWithdrawAsset(WITHDRAW_TEST_ASSETS)!;
  const [selectedChainId, setSelectedChainId] = useState(defaultAsset.chainId);
  const [selectedAssetId, setSelectedAssetId] = useState(defaultAsset.id);
  const [quoteReady, setQuoteReady] = useState(false);

  const destinationAssets = WITHDRAW_TEST_ASSETS;
  const chainOptions = useMemo(() => groupChains(destinationAssets), [destinationAssets]);
  const selectedAsset =
    destinationAssets.find((a) => a.id === selectedAssetId) ?? defaultAsset;
  const tokenOptions = useMemo(
    () => assetsForChain(destinationAssets, selectedChainId),
    [destinationAssets, selectedChainId]
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

  const handleChainChange = useCallback(
    (chainId: string) => {
      setSelectedChainId(chainId);
      const next = assetsForChain(destinationAssets, chainId)[0];
      if (next) setSelectedAssetId(next.id);
      setQuoteReady(false);
    },
    [destinationAssets]
  );

  const handleTokenChange = useCallback(
    (assetId: string) => {
      setSelectedAssetId(assetId);
      const asset = destinationAssets.find((a) => a.id === assetId);
      if (asset) setSelectedChainId(asset.chainId);
      setQuoteReady(false);
    },
    [destinationAssets]
  );

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
