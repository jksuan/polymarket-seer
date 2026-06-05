"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWithdrawAddress, useBridgeStatus } from "@/hooks/useBridge";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import {
  InsufficientOnChainPusdError,
  resolveWithdrawablePusdAtomic,
  type ClobCollateralClient,
} from "@/auth/collateralBalance";
import { createClobClient } from "@/lib/clobClientFactory";
import { getCachedCreds } from "@/lib/utils";
import { resolveTradingVault } from "@/auth/vault";
import { resolveTokenIconUrl } from "@/components/ui/deposit/icons";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { extractDepositAddress } from "@/components/ui/deposit/addresses";
import { shouldOfferConnectedWalletFunds } from "@/auth/privyUserIdentity";
import { parseAmountUsd } from "@/components/ui/deposit/format";
import {
  formatPusdFromAtomic,
  parsePusdInputToAtomic,
  sanitizePusdAmountInput,
  validateWithdrawAmountAtomic,
} from "./pusdAmount";
import type { CreateWithdrawResponse } from "@/types/bridge";
import {
  JUMPER_SWAP_URL,
  PUSD_DECIMALS,
  UNISWAP_SWAP_URL,
  WITHDRAW_STATUS_POLL_TIMEOUT_MS,
} from "./constants";
import { isWithdrawStatusPollTimedOut } from "./withdrawStatusPoll";
import { executePusdWithdrawTransfer } from "./executePusdWithdraw";
import type { WithdrawDestinationAsset, WithdrawFeedback } from "./types";
import { isValidWithdrawRecipient, validateWithdrawRecipient } from "./validation";
import { getPolygonPusdWithdrawAsset } from "./withdrawAssets";
import {
  formatInsufficientOnChainPusdError,
  formatWithdrawExecutionError,
  getWithdrawFlowMessages,
  isWithdrawUserRejection,
} from "./withdrawMessages";

const PUSD_WITHDRAW_ASSET = getPolygonPusdWithdrawAsset();

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
  const { primaryWalletSelectOptions, sessionMode } = usePolymarketAuth();

  const [recipientAddr, setRecipientAddr] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [fundsTermsOpen, setFundsTermsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [withdrawFeedback, setWithdrawFeedback] = useState<WithdrawFeedback | null>(null);
  const [bridgePollAddress, setBridgePollAddress] = useState<string | null>(null);
  const [withdrawableAtomic, setWithdrawableAtomic] = useState<bigint | null>(null);

  const isExecutingRef = useRef(false);
  const lastCompletedPollAddressRef = useRef<string | null>(null);
  const lastWithdrawAmountRef = useRef(0);
  const lastWithdrawTokenRef = useRef<{ symbol: string; iconUrl?: string }>({
    symbol: "PUSD",
    iconUrl: resolveTokenIconUrl("PUSD"),
  });
  const bridgePollStartedAtRef = useRef<number | null>(null);
  const [statusPollTick, setStatusPollTick] = useState(0);

  const wfMessages = useMemo(() => getWithdrawFlowMessages(locale), [locale]);

  const clearWithdrawFeedback = useCallback(() => {
    setExecutionError("");
    setStatusMessage("");
    setWithdrawFeedback(null);
    setBridgePollAddress(null);
    bridgePollStartedAtRef.current = null;
  }, []);

  const showWithdrawFeedback = useCallback(
    (
      message: string,
      tone: WithdrawFeedback["tone"],
      amountUsd?: number,
      options?: { celebrate?: boolean; tokenSymbol?: string; tokenIconUrl?: string }
    ) => {
      const amount = amountUsd ?? lastWithdrawAmountRef.current;
      const token = lastWithdrawTokenRef.current;
      setWithdrawFeedback({
        amountUsd: amount,
        message,
        tone,
        tokenSymbol: options?.tokenSymbol ?? token.symbol,
        tokenIconUrl: options?.tokenIconUrl ?? token.iconUrl,
        celebrate: options?.celebrate ?? false,
      });
      setStatusMessage("");
      setExecutionError("");
    },
    []
  );

  const activeWallet = useMemo(
    () =>
      selectPrimaryWallet(wallets, user?.wallet?.address, primaryWalletSelectOptions),
    [wallets, user?.wallet?.address, primaryWalletSelectOptions]
  );

  const selectedAsset: WithdrawDestinationAsset = PUSD_WITHDRAW_ASSET;

  const showUseConnected = Boolean(
    shouldOfferConnectedWalletFunds(sessionMode, activeWallet?.address)
  );

  const balanceNumber = useMemo(() => parseAmountUsd(balanceUsd), [balanceUsd]);
  const effectiveWithdrawableAtomic = withdrawableAtomic ?? BigInt(0);
  const withdrawableBalanceDisplay = useMemo(() => {
    if (withdrawableAtomic !== null) {
      return formatPusdFromAtomic(withdrawableAtomic);
    }
    return null;
  }, [withdrawableAtomic]);
  const amountAtomic = useMemo(
    () => parsePusdInputToAtomic(amountInput),
    [amountInput]
  );
  const amountUsd = useMemo(
    () => Number(amountAtomic) / 10 ** PUSD_DECIMALS,
    [amountAtomic]
  );

  const amountError = useMemo(() => {
    if (!amountInput.trim()) return null;
    if (withdrawableAtomic === null) return null;
    return validateWithdrawAmountAtomic(amountAtomic, effectiveWithdrawableAtomic, locale);
  }, [amountInput, amountAtomic, effectiveWithdrawableAtomic, locale, withdrawableAtomic]);

  const recipientError = useMemo(() => {
    return validateWithdrawRecipient(recipientAddr, "evm", locale);
  }, [recipientAddr, locale]);

  const receiveAmountDisplay = useMemo(() => {
    if (amountAtomic <= BigInt(0)) return null;
    return `${formatPusdFromAtomic(amountAtomic)} PUSD`;
  }, [amountAtomic]);

  const resetWithdrawFormAfterSuccess = useCallback(() => {
    setAmountInput("");
    setExecutionError("");
    setBridgePollAddress(null);
  }, []);

  const resetState = useCallback(() => {
    setRecipientAddr("");
    setAmountInput("");
    setIsExecuting(false);
    setExecutionError("");
    setStatusMessage("");
    setWithdrawFeedback(null);
    setBridgePollAddress(null);
    bridgePollStartedAtRef.current = null;
    lastCompletedPollAddressRef.current = null;
    lastWithdrawAmountRef.current = 0;
    lastWithdrawTokenRef.current = {
      symbol: "PUSD",
      iconUrl: resolveTokenIconUrl("PUSD"),
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
      setWithdrawableAtomic(null);
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen || !proxyAddress) {
      setWithdrawableAtomic(null);
      return;
    }

    let cancelled = false;

    const loadWithdrawable = async () => {
      try {
        const wallet = selectPrimaryWallet(
          wallets,
          user?.wallet?.address,
          primaryWalletSelectOptions
        );
        if (!wallet) return;

        const ethereumProvider = await wallet.getEthereumProvider();
        const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
        const signer = provider.getSigner();

        const creds = getCachedCreds(wallet.address);
        let clobClient: ClobCollateralClient | null = null;
        if (creds?.key) {
          const vault = await resolveTradingVault(signer, proxyAddress);
          clobClient = createClobClient({
            signer: signer as never,
            creds,
            funderAddress: vault.address,
            signatureType: vault.signatureType,
          }) as ClobCollateralClient;
        }

        const { withdrawableAtomic } = await resolveWithdrawablePusdAtomic({
          provider,
          proxyAddress,
          clobClient,
        });

        if (!cancelled) {
          setWithdrawableAtomic(withdrawableAtomic);
        }
      } catch (err) {
        console.warn("[withdraw] load withdrawable balance failed", err);
        if (!cancelled) {
          setWithdrawableAtomic(null);
        }
      }
    };

    void loadWithdrawable();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    proxyAddress,
    wallets,
    user?.wallet?.address,
    primaryWalletSelectOptions,
    balanceUsd,
  ]);

  const handleUseConnected = useCallback(() => {
    if (!activeWallet?.address) return;
    clearWithdrawFeedback();
    setRecipientAddr(activeWallet.address);
  }, [activeWallet?.address, clearWithdrawFeedback]);

  const handleAmountChange = useCallback(
    (value: string) => {
      clearWithdrawFeedback();
      setAmountInput(sanitizePusdAmountInput(value));
    },
    [clearWithdrawFeedback]
  );

  const handleMax = useCallback(() => {
    clearWithdrawFeedback();
    if (withdrawableAtomic === null || withdrawableAtomic <= BigInt(0)) return;
    setAmountInput(formatPusdFromAtomic(withdrawableAtomic));
  }, [withdrawableAtomic, clearWithdrawFeedback]);

  const handleRecipientChange = useCallback(
    (value: string) => {
      clearWithdrawFeedback();
      setRecipientAddr(value);
    },
    [clearWithdrawFeedback]
  );

  const canSubmitBase = Boolean(
    proxyAddress &&
      withdrawableAtomic !== null &&
      withdrawableAtomic > BigInt(0) &&
      isValidWithdrawRecipient(recipientAddr, "evm") &&
      !amountError &&
      amountAtomic > BigInt(0) &&
      !recipientError
  );

  const bridgeStatus = useBridgeStatus(bridgePollAddress, Boolean(bridgePollAddress));
  const isWithdrawInFlight = Boolean(bridgePollAddress);

  useEffect(() => {
    if (!bridgePollAddress) {
      bridgePollStartedAtRef.current = null;
      return;
    }
    if (!bridgePollStartedAtRef.current) {
      bridgePollStartedAtRef.current = Date.now();
    }
  }, [bridgePollAddress]);

  useEffect(() => {
    if (!isWithdrawInFlight || bridgeStatus.isFinal) return;
    const id = window.setInterval(() => {
      setStatusPollTick((value) => value + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [bridgeStatus.isFinal, isWithdrawInFlight]);

  const isStatusPollTimedOut = useMemo(
    () =>
      isWithdrawStatusPollTimedOut(
        bridgePollStartedAtRef.current,
        bridgeStatus.isFinal,
        Date.now(),
        WITHDRAW_STATUS_POLL_TIMEOUT_MS
      ),
    [bridgePollAddress, bridgeStatus.isFinal, isWithdrawInFlight, statusPollTick]
  );

  const statusPollAlertMessage = useMemo(() => {
    if (!isWithdrawInFlight || bridgeStatus.isFinal) return null;
    if (bridgeStatus.error) return wfMessages.statusPollError;
    if (isStatusPollTimedOut) return wfMessages.statusPollTimeout;
    return null;
  }, [
    bridgeStatus.error,
    bridgeStatus.isFinal,
    isStatusPollTimedOut,
    isWithdrawInFlight,
    wfMessages.statusPollError,
    wfMessages.statusPollTimeout,
  ]);

  const handleRetryStatusPoll = useCallback(() => {
    void bridgeStatus.mutate();
  }, [bridgeStatus]);

  useEffect(() => {
    const status = bridgeStatus.latestStatus;
    if (!status || !bridgePollAddress) return;
    if (status === "COMPLETED") {
      if (lastCompletedPollAddressRef.current === bridgePollAddress) return;
      lastCompletedPollAddressRef.current = bridgePollAddress;
      showWithdrawFeedback(wfMessages.completedPusd, "success", lastWithdrawAmountRef.current, {
        celebrate: true,
        tokenSymbol: "PUSD",
        tokenIconUrl: resolveTokenIconUrl("PUSD"),
      });
      resetWithdrawFormAfterSuccess();
      onBalanceRefresh();
      return;
    }
    if (status === "FAILED") {
      if (lastCompletedPollAddressRef.current === bridgePollAddress) return;
      lastCompletedPollAddressRef.current = bridgePollAddress;
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
    if (!recipientAddr.trim() || !amountInput.trim() || amountError || recipientError) {
      return "Enter amount";
    }
    return "Withdraw";
  }, [
    amountError,
    amountInput,
    isExecuting,
    wfMessages.processing,
    recipientAddr,
    recipientError,
  ]);

  const canSubmit = Boolean(
    canSubmitBase && !isExecuting && !isWithdrawInFlight
  );

  const handleWithdraw = useCallback(async () => {
    if (!canSubmit || !proxyAddress || isExecutingRef.current) return;
    isExecutingRef.current = true;
    setIsExecuting(true);
    setExecutionError("");
    setStatusMessage("");
    setWithdrawFeedback(null);
    lastWithdrawAmountRef.current = amountUsd;
    lastWithdrawTokenRef.current = {
      symbol: "PUSD",
      iconUrl: resolveTokenIconUrl("PUSD"),
    };

    try {
      const wallet = selectPrimaryWallet(wallets, user?.wallet?.address, primaryWalletSelectOptions);
      if (!wallet) throw new Error(wfMessages.noWallet);

      const amountBaseUnit = amountAtomic.toString();

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
        proxyAddress,
        bridgeDepositAddress,
        amountBaseUnit,
      });

      bridgePollStartedAtRef.current = Date.now();
      setBridgePollAddress(bridgeDepositAddress);
      setStatusPollTick((value) => value + 1);
      showWithdrawFeedback(wfMessages.submitted, "success", amountUsd);
      onBalanceRefresh();
    } catch (error) {
      if (error instanceof InsufficientOnChainPusdError) {
        setExecutionError(formatInsufficientOnChainPusdError(locale, error));
        setWithdrawFeedback(null);
        return;
      }

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
    amountAtomic,
    amountUsd,
    canSubmit,
    locale,
    onBalanceRefresh,
    wfMessages,
    proxyAddress,
    recipientAddr,
    selectedAsset.chainId,
    selectedAsset.tokenAddress,
    primaryWalletSelectOptions,
    user?.wallet?.address,
    wallets,
    showWithdrawFeedback,
  ]);

  return {
    activeWallet,
    amountError,
    amountInput,
    amountUsd,
    balanceNumber,
    withdrawableBalanceDisplay,
    bridgeStatus,
    canSubmit,
    isWithdrawInFlight,
    executionError,
    fundsTermsOpen,
    handleAmountChange,
    handleMax,
    handleUseConnected,
    handleWithdraw,
    isExecuting,
    onClose,
    primaryButtonLabel,
    receiveAmountDisplay,
    recipientAddr,
    recipientError,
    selectedAsset,
    setFundsTermsOpen,
    setRecipientAddr: handleRecipientChange,
    showUseConnected,
    statusMessage,
    statusPollAlertMessage,
    isRetryingStatusPoll: bridgeStatus.isValidating,
    onRetryStatusPoll: handleRetryStatusPoll,
    uniswapSwapUrl: UNISWAP_SWAP_URL,
    jumperSwapUrl: JUMPER_SWAP_URL,
    withdrawFeedback,
  };
}
