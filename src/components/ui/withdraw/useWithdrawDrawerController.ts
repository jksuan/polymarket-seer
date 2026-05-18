"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createWithdrawAddress,
  getBridgeQuote,
  useBridgeStatus,
  useSupportedAssets,
} from "@/hooks/useBridge";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { extractDepositAddress } from "@/components/ui/deposit/addresses";
import { isEmailOrSocialLogin } from "@/components/ui/deposit/connected/loginIdentity";
import {
  formatAmountUsdInput,
  parseAmountUsd,
  sanitizeAmountUsdInput,
  toNumber,
} from "@/components/ui/deposit/format";
import type { CreateWithdrawResponse } from "@/types/bridge";
import {
  POLYGON_CHAIN_ID,
  PUSD_ADDRESS,
  PUSD_DECIMALS,
  QUOTE_DEBOUNCE_MS,
} from "./constants";
import { executePusdWithdrawTransfer } from "./executePusdWithdraw";
import type { WithdrawDestinationAsset, WithdrawFeedback, WithdrawQuoteState } from "./types";
import { resolveRecipientAddressType } from "./recipientAddressType";
import { isValidWithdrawRecipient, validateWithdrawAmountUsd, validateWithdrawRecipient } from "./validation";
import {
  buildWithdrawDestinationAssets,
  findWithdrawAssetForChainAndSymbol,
  getDefaultWithdrawAsset,
  getUniqueWithdrawTokenOptions,
  getWithdrawChainOptionsForSymbol,
} from "./withdrawAssets";
import { normalizeWithdrawTokenSymbol } from "./withdrawWhitelist";
import {
  formatWithdrawExecutionError,
  getWithdrawFlowMessages,
  isWithdrawUserRejection,
} from "./withdrawMessages";

export function useWithdrawDrawerController({
  isOpen,
  proxyAddress,
  balanceUsd,
  locale,
  onBalanceRefresh,
  onClose,
}: {
  isOpen: boolean;
  proxyAddress: string;
  balanceUsd: string;
  locale: string;
  onBalanceRefresh: () => void;
  onClose: () => void;
}) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { stickyExternalWalletClientType } = usePolymarketAuth();
  const { data: supportedAssets, isLoading: assetsLoading } = useSupportedAssets();

  const [recipientAddr, setRecipientAddr] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [selectedChainId, setSelectedChainId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [fundsTermsOpen, setFundsTermsOpen] = useState(false);
  const [quote, setQuote] = useState<WithdrawQuoteState | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [withdrawFeedback, setWithdrawFeedback] = useState<WithdrawFeedback | null>(null);
  const [bridgePollAddress, setBridgePollAddress] = useState<string | null>(null);

  const quoteRequestRef = useRef(0);
  const isExecutingRef = useRef(false);
  const lastCompletedPollAddressRef = useRef<string | null>(null);
  const lastWithdrawAmountRef = useRef(0);
  const lastWithdrawTokenRef = useRef<{ symbol: string; iconUrl?: string }>({
    symbol: "USDC",
  });

  const wfMessages = useMemo(() => getWithdrawFlowMessages(locale), [locale]);

  const clearWithdrawFeedback = useCallback(() => {
    setExecutionError("");
    setStatusMessage("");
    setWithdrawFeedback(null);
    setBridgePollAddress(null);
  }, []);

  const showWithdrawFeedback = useCallback(
    (
      message: string,
      tone: WithdrawFeedback["tone"],
      amountUsd?: number,
      options?: { celebrate?: boolean }
    ) => {
      const amount = amountUsd ?? lastWithdrawAmountRef.current;
      const token = lastWithdrawTokenRef.current;
      setWithdrawFeedback({
        amountUsd: amount,
        message,
        tone,
        tokenSymbol: token.symbol,
        tokenIconUrl: token.iconUrl,
        celebrate: options?.celebrate ?? false,
      });
      setStatusMessage("");
      setExecutionError("");
    },
    []
  );

  const activeWallet = useMemo(
    () =>
      selectPrimaryWallet(wallets, user?.wallet?.address, {
        stickyClientType: stickyExternalWalletClientType,
      }),
    [wallets, user?.wallet?.address, stickyExternalWalletClientType]
  );

  const destinationAssets = useMemo(
    () => buildWithdrawDestinationAssets(supportedAssets),
    [supportedAssets]
  );

  const uniqueTokenOptions = useMemo(
    () => getUniqueWithdrawTokenOptions(destinationAssets),
    [destinationAssets]
  );

  const selectedAsset = useMemo((): WithdrawDestinationAsset | null => {
    const found = destinationAssets.find((a) => a.id === selectedAssetId);
    if (found) return found;
    return getDefaultWithdrawAsset(destinationAssets);
  }, [destinationAssets, selectedAssetId]);

  const selectedTokenSymbol = useMemo(
    () => normalizeWithdrawTokenSymbol(selectedAsset?.symbol ?? ""),
    [selectedAsset?.symbol]
  );

  const chainOptions = useMemo(
    () =>
      selectedTokenSymbol
        ? getWithdrawChainOptionsForSymbol(destinationAssets, selectedTokenSymbol)
        : [],
    [destinationAssets, selectedTokenSymbol]
  );

  const tokenOptions = uniqueTokenOptions;

  const selectedTokenOptionId = useMemo(() => {
    const option = tokenOptions.find(
      (asset) => normalizeWithdrawTokenSymbol(asset.symbol) === selectedTokenSymbol
    );
    return option?.id ?? selectedAsset?.id ?? "";
  }, [tokenOptions, selectedTokenSymbol, selectedAsset?.id]);

  const recipientAddressType = useMemo(() => {
    const chainId = selectedChainId || selectedAsset?.chainId || "";
    const chainName =
      selectedAsset?.chainName ||
      chainOptions.find((c) => c.chainId === chainId)?.chainName;
    return resolveRecipientAddressType(chainId, chainName);
  }, [chainOptions, selectedAsset?.chainId, selectedAsset?.chainName, selectedChainId]);

  const showUseConnected = Boolean(
    activeWallet?.address &&
      !isEmailOrSocialLogin(user) &&
      recipientAddressType === "evm"
  );

  const balanceNumber = useMemo(() => parseAmountUsd(balanceUsd), [balanceUsd]);
  const amountUsd = useMemo(() => parseAmountUsd(amountInput), [amountInput]);

  const amountError = useMemo(() => {
    if (!amountInput.trim()) return null;
    return validateWithdrawAmountUsd(amountUsd, balanceNumber, locale);
  }, [amountInput, amountUsd, balanceNumber, locale]);

  const recipientError = useMemo(() => {
    return validateWithdrawRecipient(recipientAddr, recipientAddressType, locale);
  }, [recipientAddr, recipientAddressType, locale]);

  const resetWithdrawFormAfterSuccess = useCallback(() => {
    setAmountInput("");
    setQuote(null);
    setQuoteError("");
    setIsQuoting(false);
    setExecutionError("");
    setBridgePollAddress(null);
    quoteRequestRef.current += 1;
  }, []);

  const resetState = useCallback(() => {
    setRecipientAddr("");
    setAmountInput("");
    setQuote(null);
    setQuoteError("");
    setIsQuoting(false);
    setIsExecuting(false);
    setExecutionError("");
    setStatusMessage("");
    setWithdrawFeedback(null);
    setBridgePollAddress(null);
    lastCompletedPollAddressRef.current = null;
    lastWithdrawAmountRef.current = 0;
    lastWithdrawTokenRef.current = { symbol: "USDC" };
    quoteRequestRef.current += 1;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const defaultAsset = getDefaultWithdrawAsset(destinationAssets);
    if (!defaultAsset) return;
    setSelectedChainId(defaultAsset.chainId);
    setSelectedAssetId(defaultAsset.id);
  }, [isOpen, destinationAssets]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleUseConnected = useCallback(() => {
    if (!activeWallet?.address) return;
    clearWithdrawFeedback();
    setRecipientAddr(activeWallet.address);
  }, [activeWallet?.address, clearWithdrawFeedback]);

  const handleAmountChange = useCallback(
    (value: string) => {
      clearWithdrawFeedback();
      setAmountInput(sanitizeAmountUsdInput(value));
    },
    [clearWithdrawFeedback]
  );

  const handleMax = useCallback(() => {
    clearWithdrawFeedback();
    setAmountInput(formatAmountUsdInput(balanceNumber));
  }, [balanceNumber, clearWithdrawFeedback]);

  const handleChainChange = useCallback(
    (chainId: string) => {
      setSelectedChainId(chainId);
      setQuote(null);
      setQuoteError("");
      clearWithdrawFeedback();
    },
    [clearWithdrawFeedback]
  );

  const handleTokenChange = useCallback(
    (assetId: string) => {
      setSelectedAssetId(assetId);
      setQuote(null);
      setQuoteError("");
      clearWithdrawFeedback();
    },
    [clearWithdrawFeedback]
  );

  const handleRecipientChange = useCallback(
    (value: string) => {
      clearWithdrawFeedback();
      setRecipientAddr(value);
    },
    [clearWithdrawFeedback]
  );

  useEffect(() => {
    if (destinationAssets.length === 0) return;
    const exists = destinationAssets.some((asset) => asset.id === selectedAssetId);
    if (!exists) {
      const fallback = getDefaultWithdrawAsset(destinationAssets);
      if (fallback) setSelectedAssetId(fallback.id);
    }
  }, [destinationAssets, selectedAssetId]);

  useEffect(() => {
    if (!selectedTokenSymbol) {
      if (selectedChainId) setSelectedChainId("");
      return;
    }
    if (chainOptions.length === 0) {
      if (selectedChainId) setSelectedChainId("");
      return;
    }
    const chainExists = chainOptions.some((chain) => chain.chainId === selectedChainId);
    if (!chainExists) {
      setSelectedChainId(chainOptions[0].chainId);
    }
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

  const canQuote = Boolean(
    proxyAddress &&
      selectedAsset &&
      isValidWithdrawRecipient(recipientAddr, recipientAddressType) &&
      !amountError &&
      amountUsd > 0
  );

  useEffect(() => {
    if (!isOpen || !canQuote || !selectedAsset) {
      setQuote(null);
      setQuoteError("");
      return;
    }

    const requestId = ++quoteRequestRef.current;
    const timer = window.setTimeout(async () => {
      setIsQuoting(true);
      setQuoteError("");
      try {
        const amountBaseUnit = ethers.utils
          .parseUnits(amountUsd.toFixed(PUSD_DECIMALS), PUSD_DECIMALS)
          .toString();
        const response = await getBridgeQuote({
          fromAmountBaseUnit: amountBaseUnit,
          fromChainId: String(POLYGON_CHAIN_ID),
          fromTokenAddress: PUSD_ADDRESS,
          recipientAddress: recipientAddr.trim(),
          toChainId: selectedAsset.chainId,
          toTokenAddress: selectedAsset.tokenAddress,
        });
        if (quoteRequestRef.current !== requestId) return;

        const estOutputUsd = toNumber(response.estOutputUsd) ?? amountUsd;
        const estToBase = response.estToTokenBaseUnit;
        let receiveAmountDisplay = `${amountUsd.toFixed(5)} ${selectedAsset.symbol}`;
        if (estToBase) {
          try {
            const formatted = ethers.utils.formatUnits(estToBase, selectedAsset.decimals);
            receiveAmountDisplay = `${Number(formatted).toFixed(5)} ${selectedAsset.symbol}`;
          } catch {
            receiveAmountDisplay = `${estOutputUsd.toFixed(5)} ${selectedAsset.symbol}`;
          }
        }

        setQuote({
          response,
          fee: response.estFeeBreakdown,
          receiveAmountDisplay,
          receiveUsd: estOutputUsd,
          quotedAtMs: Date.now(),
        });
      } catch {
        if (quoteRequestRef.current !== requestId) return;
        setQuote(null);
        setQuoteError(wfMessages.quoteError);
      } finally {
        if (quoteRequestRef.current === requestId) {
          setIsQuoting(false);
        }
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    amountUsd,
    canQuote,
    isOpen,
    locale,
    recipientAddr,
    selectedAsset,
    proxyAddress,
    wfMessages.quoteError,
  ]);

  const bridgeStatus = useBridgeStatus(bridgePollAddress, Boolean(bridgePollAddress));

  useEffect(() => {
    const status = bridgeStatus.latestStatus;
    if (!status || !bridgePollAddress) return;
    if (status === "COMPLETED") {
      if (lastCompletedPollAddressRef.current === bridgePollAddress) return;
      lastCompletedPollAddressRef.current = bridgePollAddress;
      showWithdrawFeedback(wfMessages.completed, "success", lastWithdrawAmountRef.current, {
        celebrate: true,
      });
      resetWithdrawFormAfterSuccess();
      onBalanceRefresh();
      return;
    }
    if (status === "FAILED") {
      showWithdrawFeedback(wfMessages.failed, "error", lastWithdrawAmountRef.current);
      return;
    }
    setStatusMessage(wfMessages.processing);
    setWithdrawFeedback(null);
  }, [
    bridgePollAddress,
    bridgeStatus.latestStatus,
    onBalanceRefresh,
    resetWithdrawFormAfterSuccess,
    showWithdrawFeedback,
    wfMessages,
  ]);

  const primaryButtonLabel = useMemo(() => {
    if (isExecuting) {
      return wfMessages.processing;
    }
    if (!recipientAddr.trim() || !amountInput.trim() || amountError || recipientError || !quote) {
      return "Enter amount";
    }
    return "Withdraw";
  }, [
    amountError,
    amountInput,
    isExecuting,
    quote,
    wfMessages.processing,
    recipientAddr,
    recipientError,
  ]);

  const isWithdrawInFlight = Boolean(bridgePollAddress);

  const canSubmit = Boolean(
    canQuote &&
      quote &&
      !isQuoting &&
      !isExecuting &&
      !recipientError &&
      !amountError &&
      !isWithdrawInFlight
  );

  const handleWithdraw = useCallback(async () => {
    if (!canSubmit || !selectedAsset || !proxyAddress || isExecutingRef.current) return;
    isExecutingRef.current = true;
    setIsExecuting(true);
    setExecutionError("");
    setStatusMessage("");
    setWithdrawFeedback(null);
    lastWithdrawAmountRef.current = amountUsd;
    lastWithdrawTokenRef.current = {
      symbol: selectedAsset.symbol,
      iconUrl: selectedAsset.iconUrl,
    };

    try {
      const wallet = selectPrimaryWallet(wallets, user?.wallet?.address, {
        stickyClientType: stickyExternalWalletClientType,
      });
      if (!wallet) throw new Error(wfMessages.noWallet);

      const amountBaseUnit = ethers.utils
        .parseUnits(amountUsd.toFixed(PUSD_DECIMALS), PUSD_DECIMALS)
        .toString();

      const withdrawResponse: CreateWithdrawResponse = await createWithdrawAddress({
        address: proxyAddress,
        toChainId: selectedAsset.chainId,
        toTokenAddress: selectedAsset.tokenAddress,
        recipientAddr: recipientAddr.trim(),
      });

      const bridgeDepositAddress = extractDepositAddress(withdrawResponse, "evm");
      if (!ethers.utils.isAddress(bridgeDepositAddress)) {
        throw new Error(wfMessages.noWithdrawAddress);
      }

      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      await executePusdWithdrawTransfer({
        signer,
        bridgeDepositAddress,
        amountBaseUnit,
      });

      setBridgePollAddress(bridgeDepositAddress);
      showWithdrawFeedback(wfMessages.submitted, "success", amountUsd);
      onBalanceRefresh();
    } catch (error) {
      const raw = error instanceof Error ? error.message : wfMessages.failed;
      if (isWithdrawUserRejection(raw)) {
        showWithdrawFeedback(wfMessages.userRejected, "error", lastWithdrawAmountRef.current);
      } else {
        const formatted = formatWithdrawExecutionError(locale, raw);
        if (formatted === wfMessages.failed) {
          showWithdrawFeedback(wfMessages.failed, "error", lastWithdrawAmountRef.current);
        } else {
          setExecutionError(formatted);
          setWithdrawFeedback(null);
        }
      }
    } finally {
      isExecutingRef.current = false;
      setIsExecuting(false);
    }
  }, [
    amountUsd,
    canSubmit,
    locale,
    onBalanceRefresh,
    wfMessages,
    proxyAddress,
    recipientAddr,
    selectedAsset,
    stickyExternalWalletClientType,
    user?.wallet?.address,
    wallets,
    showWithdrawFeedback,
  ]);

  return {
    activeWallet,
    amountError,
    amountInput,
    amountUsd,
    assetsLoading,
    balanceNumber,
    bridgeStatus,
    canSubmit,
    isWithdrawInFlight,
    chainOptions,
    destinationAssets,
    selectedTokenSymbol,
    uniqueTokenOptions,
    executionError,
    fundsTermsOpen,
    handleAmountChange,
    handleChainChange,
    handleMax,
    handleTokenChange,
    handleUseConnected,
    handleWithdraw,
    isExecuting,
    isQuoting,
    onClose,
    primaryButtonLabel,
    quote,
    quoteError,
    recipientAddr,
    recipientError,
    selectedAsset,
    selectedChainId,
    selectedTokenOptionId,
    setFundsTermsOpen,
    setRecipientAddr: handleRecipientChange,
    recipientAddressType,
    showUseConnected,
    statusMessage,
    tokenOptions,
    withdrawFeedback,
  };
}
