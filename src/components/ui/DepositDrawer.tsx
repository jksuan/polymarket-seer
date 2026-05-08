import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createDepositAddress, useBridgeStatus, useSupportedAssets } from "@/hooks/useBridge";
import { getDlnCancelTx, useDlnOrderStatus } from "@/hooks/useDln";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { isClientDebugEnabled } from "@/lib/debug";
import { shortenAddress } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { BridgeAddressType } from "@/types/bridge";
import type { BridgeTransaction, CreateDepositResponse } from "@/types/bridge";
import type {
  DepositAddressMap,
  DepositAsset,
  DepositDrawerProps,
  ExecutionSnapshot,
  FlowStep,
} from "./deposit/types";
import { DEPOSIT_SINGLE_TX_CAP_USD, MAX_DEPOSIT_BALANCE_RATIO } from "./deposit/constants";
import {
  ensureEvmDepositAddress,
  extractDepositAddress,
  extractDepositAddressMap,
} from "./deposit/addresses";
import {
  estimateUsdValue,
  normalizeSupportedAssets,
  readAssetBalance,
} from "./deposit/assets";
import { approveErc20IfNeeded, getWalletEthereumProvider, sendPreparedEvmTx, switchEvmChain } from "./deposit/evm";
import { buildExecutionSnapshot, isQuotePriceChanged, validateBridgeReceiveMinimum, validateDepositSelection } from "./deposit/execution";
import { formatExecutionError } from "./deposit/errors";
import { formatAmountUsdInput, parseAmountUsd, sanitizeAmountUsdInput } from "./deposit/format";
import { getStatusText } from "./deposit/status";
import { QuoteCountdownRing } from "./deposit/quote-countdown-ring";
import { HomeStep } from "./deposit/connected/HomeStep";
import { AssetStep } from "./deposit/connected/AssetStep";
import { AmountStep } from "./deposit/connected/AmountStep";
import { ConfirmStep } from "./deposit/confirm/ConfirmStep";
import { TransferStep } from "./deposit/transfer/TransferStep";

type PrivyLoginIdentity = {
  email?: { address?: string | null } | null;
  google?: { email?: string | null } | null;
  twitter?: { username?: string | null; subject?: string | null } | null;
};

const TRANSFER_ALLOWED_CHAIN_NAMES = new Set([
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
  "optimism",
  "bnb smart chain",
  "solana",
  "bitcoin",
  "tron",
  "hyperevm",
  "monad",
]);

const TRANSFER_ALLOWED_CHAIN_IDS = new Set(["1", "137", "42161", "8453", "10", "56"]);
const TRANSFER_ALLOWED_TOKEN_SYMBOLS = new Set([
  "1INCH",
  "AAVE",
  "ARB",
  "BASE",
  "BNB",
  "BTC",
  "BITCOIN",
  "BUSD",
  "DAI",
  "ETH",
  "EUROC",
  "HYPE",
  "LINK",
  "MATIC",
  "MON",
  "OP",
  "POL",
  "SOL",
  "TUSD",
  "USDC",
  "USDC.E",
  "USDE",
  "USDT",
  "WBNB",
  "WETH",
]);
const DEBUG_TRANSFER_DEDUPE =
  isClientDebugEnabled();

function normalizeChainName(chainName?: string): string {
  return (chainName || "").trim().toLowerCase();
}

function getTransferAddressType(chainId?: string, chainName?: string): BridgeAddressType {
  const id = (chainId || "").trim();
  if (TRANSFER_ALLOWED_CHAIN_IDS.has(id)) return "evm";
  const name = normalizeChainName(chainName);
  if (name.includes("solana")) return "svm";
  if (name.includes("bitcoin") || name.includes("btc")) return "btc";
  if (name.includes("tron")) return "tron";
  return "evm";
}

const TRANSFER_PLACEHOLDER_NATIVE_ADDRESSES = new Set([
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "11111111111111111111111111111111",
  "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8",
]);

function getTransferSymbolKey(asset: DepositAsset): string {
  return `${asset.chainId}:${asset.symbol.trim().toUpperCase()}`;
}

function pickPreferredTransferAsset(current: DepositAsset, next: DepositAsset): DepositAsset {
  const currentAddress = current.tokenAddress.toLowerCase();
  const nextAddress = next.tokenAddress.toLowerCase();
  const currentIsPlaceholder = TRANSFER_PLACEHOLDER_NATIVE_ADDRESSES.has(currentAddress);
  const nextIsPlaceholder = TRANSFER_PLACEHOLDER_NATIVE_ADDRESSES.has(nextAddress);

  if (currentIsPlaceholder !== nextIsPlaceholder) {
    return nextIsPlaceholder ? current : next;
  }

  const currentHasIcon = Boolean(current.iconUrl);
  const nextHasIcon = Boolean(next.iconUrl);
  if (currentHasIcon !== nextHasIcon) {
    return nextHasIcon ? next : current;
  }

  const currentMinUsd = Number(current.minCheckoutUsd);
  const nextMinUsd = Number(next.minCheckoutUsd);
  const currentMinValid = Number.isFinite(currentMinUsd) && currentMinUsd > 0;
  const nextMinValid = Number.isFinite(nextMinUsd) && nextMinUsd > 0;
  if (currentMinValid && nextMinValid && currentMinUsd !== nextMinUsd) {
    return nextMinUsd < currentMinUsd ? next : current;
  }

  return next.id.localeCompare(current.id) < 0 ? next : current;
}

function logTransferDedupeDrop(kept: DepositAsset, dropped: DepositAsset): void {
  if (!DEBUG_TRANSFER_DEDUPE) return;
  const keptAddress = kept.tokenAddress.toLowerCase();
  const droppedAddress = dropped.tokenAddress.toLowerCase();
  const keptIsPlaceholder = TRANSFER_PLACEHOLDER_NATIVE_ADDRESSES.has(keptAddress);
  const droppedIsPlaceholder = TRANSFER_PLACEHOLDER_NATIVE_ADDRESSES.has(droppedAddress);
  const keptHasIcon = Boolean(kept.iconUrl);
  const droppedHasIcon = Boolean(dropped.iconUrl);
  const keptMinUsd = Number(kept.minCheckoutUsd);
  const droppedMinUsd = Number(dropped.minCheckoutUsd);

  let reason = "stable-tiebreak";
  if (keptIsPlaceholder !== droppedIsPlaceholder) {
    reason = keptIsPlaceholder ? "preferred-placeholder" : "preferred-non-placeholder";
  } else if (keptHasIcon !== droppedHasIcon) {
    reason = keptHasIcon ? "preferred-has-icon" : "preferred-no-icon";
  } else if (
    Number.isFinite(keptMinUsd) &&
    Number.isFinite(droppedMinUsd) &&
    keptMinUsd > 0 &&
    droppedMinUsd > 0 &&
    keptMinUsd !== droppedMinUsd
  ) {
    reason = keptMinUsd < droppedMinUsd ? "preferred-lower-min-usd" : "preferred-higher-min-usd";
  }

  console.debug("[transfer-dedupe] dropped asset", {
    key: getTransferSymbolKey(kept),
    reason,
    kept: {
      id: kept.id,
      chainId: kept.chainId,
      symbol: kept.symbol,
      tokenAddress: kept.tokenAddress,
    },
    dropped: {
      id: dropped.id,
      chainId: dropped.chainId,
      symbol: dropped.symbol,
      tokenAddress: dropped.tokenAddress,
    },
  });
}

function isEmailOrSocialLogin(user: unknown): boolean {
  const identity = user as PrivyLoginIdentity | null | undefined;
  return Boolean(
    identity?.email?.address ||
    identity?.google?.email ||
    identity?.twitter?.username ||
    identity?.twitter?.subject
  );
}

function DrawerContent({
  balanceUsd = "0.00",
  isOpen,
  onClose,
  proxyAddress,
  onBalanceRefresh,
}: DepositDrawerProps) {
  const BRIDGE_STATUS_FALLBACK_BEFORE_SUBMIT_MS = 45_000;
  const BRIDGE_STATUS_FALLBACK_AFTER_SUBMIT_MS = 10 * 60_000;
  const { locale } = useTranslation();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { data: supportedAssets, isLoading: assetsLoading } = useSupportedAssets();
  const [step, setStep] = useState<FlowStep>("home");
  const [selectedAsset, setSelectedAsset] = useState<DepositAsset | null>(null);
  const [amountUsd, setAmountUsd] = useState("10.00");
  const [snapshot, setSnapshot] = useState<ExecutionSnapshot | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteWarning, setQuoteWarning] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [executionRiskWarning, setExecutionRiskWarning] = useState("");
  const [hasAcknowledgedRiskWarning, setHasAcknowledgedRiskWarning] = useState(false);
  const [executionTxHash, setExecutionTxHash] = useState("");
  const [executionSubmittedAtMs, setExecutionSubmittedAtMs] = useState(0);
  const [submittedOrderId, setSubmittedOrderId] = useState("");
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancelTxHash, setCancelTxHash] = useState("");
  const [, setDepositResponse] = useState<CreateDepositResponse | null>(null);
  const [transferAddresses, setTransferAddresses] = useState<DepositAddressMap>({});
  const [transferAddress, setTransferAddress] = useState("");
  const [selectedTransferChainId, setSelectedTransferChainId] = useState("");
  const [selectedTransferAssetId, setSelectedTransferAssetId] = useState("");
  const [isCreatingTransferAddress, setIsCreatingTransferAddress] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [copied, setCopied] = useState(false);
  const [assetBalances, setAssetBalances] = useState<Record<string, string>>({});
  const [assetUsdValues, setAssetUsdValues] = useState<Record<string, number>>({});
  const [walletBalancesLoading, setWalletBalancesLoading] = useState(false);
  const [hasRefreshedBalance, setHasRefreshedBalance] = useState(false);
  /** 报价自动刷新失败时递增，用于重新挂载确认页定时器（避免 snapshot 未变导致不再调度） */
  const [quoteAutoRefreshNonce, setQuoteAutoRefreshNonce] = useState(0);
  const quoteRequestRef = useRef(0);
  const isExecutingRef = useRef(false);
  const balanceRefreshRetryTimersRef = useRef<number[]>([]);

  const activeWallet = useMemo(
    () => selectPrimaryWallet(wallets, user?.wallet?.address),
    [wallets, user?.wallet?.address]
  );
  /** 邮箱、Google、X 登录视为独立的 Polymarket 账户，不展示外部钱包 Connected 入口 */
  const showConnectedWalletOption = useMemo(
    () => Boolean(activeWallet) && !isEmailOrSocialLogin(user),
    [activeWallet, user]
  );
  const walletAddress = activeWallet?.address ?? "";
  const walletLabel = walletAddress ? `Wallet (${shortenAddress(walletAddress, 4, 4)})` : "Wallet";
  const depositAssets = useMemo(
    () => normalizeSupportedAssets(supportedAssets),
    [supportedAssets]
  );
  const transferAssets = useMemo(() => {
    const filtered = depositAssets.filter((asset) => {
      const symbol = asset.symbol.trim().toUpperCase();
      if (!TRANSFER_ALLOWED_TOKEN_SYMBOLS.has(symbol)) return false;
      const chainId = asset.chainId.trim();
      const normalizedChainName = normalizeChainName(asset.chainName);
      return TRANSFER_ALLOWED_CHAIN_IDS.has(chainId) || TRANSFER_ALLOWED_CHAIN_NAMES.has(normalizedChainName);
    });

    const deduped = new Map<string, DepositAsset>();
    for (const asset of filtered) {
      const key = getTransferSymbolKey(asset);
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, asset);
        continue;
      }
      const kept = pickPreferredTransferAsset(existing, asset);
      const dropped = kept.id === existing.id ? asset : existing;
      deduped.set(key, kept);
      logTransferDedupeDrop(kept, dropped);
    }
    return [...deduped.values()];
  }, [depositAssets]);
  const selectedTransferSymbol = useMemo(
    () =>
      transferAssets
        .find((asset) => asset.id === selectedTransferAssetId)
        ?.symbol.trim()
        .toUpperCase() ?? "",
    [selectedTransferAssetId, transferAssets]
  );
  const assetsWithBalances = useMemo(
    () => depositAssets.map((asset) => ({
      ...asset,
      balance: assetBalances[asset.id],
      usdValue: assetUsdValues[asset.id] ?? 0,
    })),
    [assetBalances, assetUsdValues, depositAssets]
  );
  const totalWalletUsd = useMemo(
    () => assetsWithBalances.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0),
    [assetsWithBalances]
  );
  const transferChainOptions = useMemo(() => {
    const sourceAssets = selectedTransferSymbol
      ? transferAssets.filter((a) => a.symbol.trim().toUpperCase() === selectedTransferSymbol)
      : transferAssets;

    const chainMap = new Map<string, string>();
    for (const asset of sourceAssets) {
      if (!chainMap.has(asset.chainId)) {
        chainMap.set(asset.chainId, asset.chainName);
      }
    }
    return [...chainMap.entries()].map(([chainId, chainName]) => ({ chainId, chainName }));
  }, [selectedTransferSymbol, transferAssets]);
  const selectedTransferChain = useMemo(
    () => transferChainOptions.find((chain) => chain.chainId === selectedTransferChainId),
    [selectedTransferChainId, transferChainOptions]
  );
  const selectedTransferAddressType = useMemo(
    () => getTransferAddressType(selectedTransferChain?.chainId, selectedTransferChain?.chainName),
    [selectedTransferChain?.chainId, selectedTransferChain?.chainName]
  );
  const amountNumber = parseAmountUsd(amountUsd);
  const selectedUsdValue = selectedAsset ? assetUsdValues[selectedAsset.id] : undefined;
  const hasSubmittedTx = Boolean(executionTxHash || submittedOrderId);

  const transferStatus = useBridgeStatus(transferAddress, Boolean(transferAddress && isOpen));
  const dlnStatus = useDlnOrderStatus(submittedOrderId, Boolean(submittedOrderId && isOpen));
  const bridgePollingErrorMessage = transferStatus.error?.message ?? "";
  const mergedTransferError = transferError || bridgePollingErrorMessage;
  const currentSubmissionTransaction = useMemo(() => {
    const transactions = transferStatus.data?.transactions ?? [];
    const normalizeHash = (hash?: string) => hash?.trim().toLowerCase();
    const submittedTxHash = normalizeHash(executionTxHash);
    if (submittedTxHash) {
      const matchedByTxHash = transactions.find((tx: BridgeTransaction) =>
        normalizeHash(tx.txHash) === submittedTxHash
      );
      if (matchedByTxHash) return matchedByTxHash;
    }

    const lowerBound = executionSubmittedAtMs > 0
      ? executionSubmittedAtMs - BRIDGE_STATUS_FALLBACK_BEFORE_SUBMIT_MS
      : 0;
    const upperBound = executionSubmittedAtMs > 0
      ? executionSubmittedAtMs + BRIDGE_STATUS_FALLBACK_AFTER_SUBMIT_MS
      : Number.POSITIVE_INFINITY;
    const fallbackCandidates = transactions.filter((tx: BridgeTransaction) => {
      if (executionSubmittedAtMs <= 0) return true;
      const createdTimeMs = Number(tx.createdTimeMs ?? 0);
      if (!Number.isFinite(createdTimeMs) || createdTimeMs <= 0) return false;
      return createdTimeMs >= lowerBound && createdTimeMs <= upperBound;
    });

    return fallbackCandidates.reduce<BridgeTransaction | undefined>((latest, tx) => {
      if (!latest) return tx;
      const latestTime = Number(latest.createdTimeMs ?? 0);
      const txTime = Number(tx.createdTimeMs ?? 0);
      return txTime >= latestTime ? tx : latest;
    }, undefined);
  }, [executionSubmittedAtMs, executionTxHash, transferStatus.data?.transactions]);
  const depositBridgeComplete = Boolean(
    hasSubmittedTx &&
      transferAddress &&
      currentSubmissionTransaction?.status?.toUpperCase() === "COMPLETED"
  );
  const hasHighWalletMismatchRisk = useMemo(
    () => (snapshot ? isHighWalletMismatchRisk(snapshot) : false),
    [snapshot]
  );

  useEffect(() => {
    if (!isOpen) return;
    quoteRequestRef.current += 1;
    setStep("home");
    setSelectedAsset(null);
    setAmountUsd("10.00");
    setSnapshot(null);
    setQuoteError("");
    setQuoteWarning("");
    setIsExecuting(false);
    isExecutingRef.current = false;
    setExecutionError("");
    setExecutionRiskWarning("");
    setHasAcknowledgedRiskWarning(false);
    setExecutionTxHash("");
    setExecutionSubmittedAtMs(0);
    setSubmittedOrderId("");
    setIsCancellingOrder(false);
    setCancelTxHash("");
    setTransferAddresses({});
    setTransferError("");
    setCopied(false);
    setQuoteAutoRefreshNonce(0);
    setSelectedTransferChainId("");
    setSelectedTransferAssetId("");
  }, [isOpen]);

  useEffect(() => {
    if (transferAssets.length > 0) return;
    if (!selectedTransferChainId && !selectedTransferAssetId) return;
    setSelectedTransferChainId("");
    setSelectedTransferAssetId("");
  }, [selectedTransferAssetId, selectedTransferChainId, transferAssets.length]);

  useEffect(() => {
    if (transferAssets.length === 0) return;
    const selectedExists = transferAssets.some((asset) => asset.id === selectedTransferAssetId);
    if (!selectedExists) {
      setSelectedTransferAssetId(transferAssets[0].id);
    }
  }, [selectedTransferAssetId, transferAssets]);

  useEffect(() => {
    if (transferChainOptions.length === 0) {
      if (selectedTransferChainId) setSelectedTransferChainId("");
      return;
    }
    const chainExists = transferChainOptions.some((chain) => chain.chainId === selectedTransferChainId);
    if (!chainExists) {
      setSelectedTransferChainId(transferChainOptions[0].chainId);
    }
  }, [selectedTransferChainId, transferChainOptions]);

  useEffect(() => {
    if (!selectedTransferSymbol || !selectedTransferChainId) return;
    const matched = transferAssets.find(
      (asset) =>
        asset.chainId === selectedTransferChainId &&
        asset.symbol.trim().toUpperCase() === selectedTransferSymbol
    );
    if (!matched) return;
    if (matched.id !== selectedTransferAssetId) {
      setSelectedTransferAssetId(matched.id);
    }
  }, [selectedTransferAssetId, selectedTransferChainId, selectedTransferSymbol, transferAssets]);

  useEffect(() => {
    setHasAcknowledgedRiskWarning(false);
    setExecutionRiskWarning("");
  }, [snapshot?.quotedAtMs]);

  useEffect(() => {
    return () => {
      balanceRefreshRetryTimersRef.current.forEach((timerId) =>
        window.clearTimeout(timerId)
      );
      balanceRefreshRetryTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !transferAddress || !executionTxHash) return;
    void transferStatus.mutate();
  }, [executionTxHash, isOpen, transferAddress, transferStatus]);

  useEffect(() => {
    if (depositBridgeComplete && !hasRefreshedBalance) {
      setHasRefreshedBalance(true);
      onBalanceRefresh?.();
      // Bridge/CLOB 同步可能晚于首个 COMPLETED，短时补几次刷新避免顶部余额停留旧值。
      const retryDelays = [8_000, 20_000];
      balanceRefreshRetryTimersRef.current.forEach((timerId) =>
        window.clearTimeout(timerId)
      );
      balanceRefreshRetryTimersRef.current = retryDelays.map((delayMs) =>
        window.setTimeout(() => {
          onBalanceRefresh?.();
        }, delayMs)
      );
    }
  }, [depositBridgeComplete, hasRefreshedBalance, onBalanceRefresh]);

  useEffect(() => {
    if (!isOpen || !activeWallet) {
      setWalletBalancesLoading(false);
      return;
    }

    if (!showConnectedWalletOption) {
      setWalletBalancesLoading(false);
      return;
    }

    if (depositAssets.length === 0) {
      setWalletBalancesLoading(assetsLoading);
      return;
    }

    let cancelled = false;
    setWalletBalancesLoading(true);

    async function loadBalances() {
      try {
        const balances = await Promise.all(
          depositAssets.map((asset) => readAssetBalance(asset, walletAddress))
        );
        const balanceMap = Object.fromEntries(balances);
        const usdValues = await Promise.all(
          depositAssets.map(async (asset) => {
            const balance = balanceMap[asset.id] ?? "0";
            return [asset.id, await estimateUsdValue(asset, balance, proxyAddress)] as const;
          })
        );

        if (!cancelled) {
          setAssetBalances(balanceMap);
          setAssetUsdValues(Object.fromEntries(usdValues));
        }
      } catch {
        if (!cancelled) {
          setAssetBalances({});
          setAssetUsdValues({});
        }
      } finally {
        if (!cancelled) {
          setWalletBalancesLoading(false);
        }
      }
    }

    loadBalances();
    return () => {
      cancelled = true;
    };
  }, [activeWallet, assetsLoading, depositAssets, isOpen, proxyAddress, showConnectedWalletOption, walletAddress]);

  useEffect(() => {
    if (step !== "confirm" || !snapshot || isExecuting || hasSubmittedTx) {
      return;
    }
    if (isQuoting) {
      return;
    }

    const remain = snapshot.expiresAtMs - Date.now();
    const delay = remain > 0 ? Math.max(1_000, remain) : 1_000;

    const timeout = window.setTimeout(async () => {
      if (isExecutingRef.current) return;
      const requestId = ++quoteRequestRef.current;
      setIsQuoting(true);
      setQuoteWarning("");
      try {
        const depositAddress = await ensureEvmDepositAddress({
          existingAddress: transferAddress,
          onAddress: setTransferAddress,
          onResponse: setDepositResponse,
          proxyAddress,
        });
        const next = await buildExecutionSnapshot({
          amountUsd: snapshot.amountUsd,
          asset: snapshot.asset,
          depositAddress,
          proxyAddress,
        });
        if (quoteRequestRef.current !== requestId) return;
        if (isExecutingRef.current) return;
        setSnapshot(next);
      } catch {
        if (quoteRequestRef.current === requestId) {
          setQuoteWarning(locale === "zh"
            ? "报价可能已过期，提交时会再次刷新。"
            : "Quote may be stale. It will refresh again before submission.");
          setQuoteAutoRefreshNonce((n) => n + 1);
        }
      } finally {
        if (quoteRequestRef.current === requestId) {
          setIsQuoting(false);
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    hasSubmittedTx,
    isExecuting,
    isQuoting,
    locale,
    proxyAddress,
    quoteAutoRefreshNonce,
    snapshot,
    step,
    transferAddress,
    walletAddress,
  ]);

  const handleCopy = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleSelectAsset = (asset: DepositAsset) => {
    quoteRequestRef.current += 1;
    setSelectedAsset(asset);
    setSnapshot(null);
    setQuoteError("");
    setQuoteWarning("");
    setExecutionError("");
    setExecutionTxHash("");
    setSubmittedOrderId("");
    setCancelTxHash("");
    setStep("amount");
  };

  const handlePercent = (percent: number) => {
    if (!selectedAsset) return;
    const value = Number(selectedUsdValue || 0);
    if (!Number.isFinite(value) || value <= 0) return;
    const nextAmount = percent === 1
      ? Math.min(value * MAX_DEPOSIT_BALANCE_RATIO, DEPOSIT_SINGLE_TX_CAP_USD)
      : value * percent;
    setAmountUsd(formatAmountUsdInput(nextAmount));
  };

  const handleAmountChange = (value: string) => {
    setAmountUsd(sanitizeAmountUsdInput(value));
  };

  const handleAmountBlur = () => {
    if (!amountUsd) return;
    setAmountUsd(formatAmountUsdInput(amountNumber));
  };

  const handleQuote = useCallback(async () => {
    const maxDepositUsd = Math.min(
      Number(selectedUsdValue ?? 0) * MAX_DEPOSIT_BALANCE_RATIO,
      DEPOSIT_SINGLE_TX_CAP_USD
    );
    if (!selectedAsset || !proxyAddress || amountNumber < 1 || amountNumber > maxDepositUsd + 0.01) return;
    const requestId = ++quoteRequestRef.current;
    setIsQuoting(true);
    setQuoteError("");
    setQuoteWarning("");

    try {
      const validationError = validateDepositSelection({
        amountUsd: amountNumber,
        asset: selectedAsset,
        locale,
      });
      if (validationError) {
        if (quoteRequestRef.current !== requestId) return;
        setQuoteError(validationError);
        return;
      }

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
  }, [amountNumber, locale, proxyAddress, selectedAsset, selectedUsdValue, transferAddress, walletAddress]);

  const handleConfirmOrder = useCallback(async () => {
    if (!selectedAsset || !activeWallet || !walletAddress || !snapshot) {
      setExecutionError(locale === "zh" ? "钱包或报价尚未就绪，请返回重试。" : "Wallet or quote is not ready. Please go back and retry.");
      return;
    }

    isExecutingRef.current = true;
    quoteRequestRef.current += 1;
    setIsExecuting(true);
    setExecutionError("");
    setExecutionRiskWarning("");
    setQuoteWarning("");
    setExecutionTxHash("");
    setExecutionSubmittedAtMs(0);
    setSubmittedOrderId("");
    setCancelTxHash("");
    setHasRefreshedBalance(false);

    try {
      const validationError = validateDepositSelection({
        amountUsd: snapshot.amountUsd,
        asset: snapshot.asset,
        locale,
      });
      if (validationError) {
        setExecutionError(validationError);
        return;
      }

      let activeSnapshot = snapshot;
      const isStale = Date.now() >= activeSnapshot.expiresAtMs;
      if (isStale) {
        const requestId = ++quoteRequestRef.current;
        const depositAddress = await ensureEvmDepositAddress({
          existingAddress: transferAddress,
          onAddress: setTransferAddress,
          onResponse: setDepositResponse,
          proxyAddress,
        });
        const refreshed = await buildExecutionSnapshot({
          amountUsd: activeSnapshot.amountUsd,
          asset: activeSnapshot.asset,
          depositAddress,
          proxyAddress,
        });
        if (quoteRequestRef.current !== requestId) {
          setExecutionError(locale === "zh"
            ? "报价正在刷新，请稍后再试。"
            : "Quote is still refreshing. Please retry shortly.");
          return;
        }
        const priceChanged = isQuotePriceChanged(activeSnapshot, refreshed);
        setSnapshot(refreshed);
        activeSnapshot = refreshed;
        if (priceChanged) {
          setQuoteWarning(locale === "zh"
            ? "报价已更新且价格变化超过 1%，请确认新价格后再次提交。"
            : "Quote updated by more than 1%. Please review the new quote and confirm again.");
          return;
        }
      }

      const receiveMinimumError = validateBridgeReceiveMinimum(activeSnapshot, locale);
      if (receiveMinimumError) {
        setExecutionError(receiveMinimumError);
        return;
      }
      if (isHighWalletMismatchRisk(activeSnapshot) && !hasAcknowledgedRiskWarning) {
        setHasAcknowledgedRiskWarning(true);
        setExecutionRiskWarning(locale === "zh"
          ? "钱包签名页的接收金额可能与本页预计到账差异较大。请确认最终收款地址为 Polymarket 充值地址后，再次点击确认继续。"
          : "Wallet receive preview may differ significantly from this quote. Verify the Polymarket deposit address, then tap confirm again to continue.");
        return;
      }
      setExecutionRiskWarning("");

      const ethereumProvider = await getWalletEthereumProvider(activeWallet);
      await switchEvmChain(ethereumProvider, activeSnapshot.asset.chainId);

      if (activeSnapshot.approveSpender && !activeSnapshot.asset.isNative) {
        await approveErc20IfNeeded({
          amountBaseUnit: activeSnapshot.sourceAmountBaseUnit,
          asset: activeSnapshot.asset,
          owner: walletAddress,
          provider: ethereumProvider,
          spender: activeSnapshot.approveSpender,
        });
      }

      const txHash = await sendPreparedEvmTx(ethereumProvider, activeSnapshot.tx);
      setExecutionSubmittedAtMs(Date.now());
      setExecutionTxHash(txHash);
      if (activeSnapshot.orderId) {
        setSubmittedOrderId(activeSnapshot.orderId);
      }
    } catch (error) {
      setExecutionError(formatExecutionError(error, locale, "execute"));
    } finally {
      isExecutingRef.current = false;
      setIsExecuting(false);
    }
  }, [
    activeWallet,
    locale,
    proxyAddress,
    hasAcknowledgedRiskWarning,
    selectedAsset,
    snapshot,
    transferAddress,
    walletAddress,
  ]);

  const handleCancelDlnOrder = useCallback(async () => {
    if (!submittedOrderId || !activeWallet) return;
    setIsCancellingOrder(true);
    setExecutionError("");

    try {
      const cancelTx = await getDlnCancelTx(submittedOrderId);
      const ethereumProvider = await getWalletEthereumProvider(activeWallet);
      await switchEvmChain(ethereumProvider, String(cancelTx.chainId));
      const txHash = await sendPreparedEvmTx(ethereumProvider, cancelTx);
      setCancelTxHash(txHash);
    } catch (error) {
      setExecutionError(formatExecutionError(error, locale, "cancel"));
    } finally {
      setIsCancellingOrder(false);
    }
  }, [activeWallet, locale, submittedOrderId]);

  const handleCreateTransferAddress = async () => {
    if (!proxyAddress) {
      setTransferError(locale === "zh" ? "Polymarket 钱包尚未就绪。" : "Polymarket wallet is not ready.");
      return;
    }

    setIsCreatingTransferAddress(true);
    setTransferError("");
    setHasRefreshedBalance(false);

    try {
      const response = await createDepositAddress({ address: proxyAddress });
      const addressMap = extractDepositAddressMap(response);
      const address =
        addressMap[selectedTransferAddressType] ||
        extractDepositAddress(response, selectedTransferAddressType) ||
        "";
      setDepositResponse(response);
      setTransferAddresses(addressMap);
      setTransferAddress(address);

      if (!address) {
        setTransferError(
          locale === "zh"
            ? `当前网络暂不支持收款地址（${selectedTransferAddressType.toUpperCase()}）。请切换网络后重试。`
            : `No ${selectedTransferAddressType.toUpperCase()} deposit address available for selected network.`
        );
      }
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : locale === "zh"
            ? "创建转账地址失败。"
            : "Failed to create transfer address."
      );
    } finally {
      setIsCreatingTransferAddress(false);
    }
  };

  useEffect(() => {
    if (!selectedTransferChainId) return;
    if (Object.keys(transferAddresses).length === 0) return;
    const nextAddress = transferAddresses[selectedTransferAddressType] || "";
    setTransferAddress(nextAddress);
    if (!nextAddress) {
      setTransferError(
        locale === "zh"
          ? `当前网络暂不支持收款地址（${selectedTransferAddressType.toUpperCase()}）。请切换网络。`
          : `Selected network does not have a ${selectedTransferAddressType.toUpperCase()} deposit address.`
      );
      return;
    }
    setTransferError("");
  }, [locale, selectedTransferAddressType, selectedTransferChainId, transferAddresses]);

  useEffect(() => {
    if (!isOpen) return;
    if (step !== "transfer") return;
    if (transferAddress) return;
    if (isCreatingTransferAddress) return;
    if (transferError) return;
    void handleCreateTransferAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step]);

  const goBack = () => {
    if (step === "home") return;
    if (step === "asset" || step === "transfer") setStep("home");
    if (step === "amount") setStep("asset");
    if (step === "confirm") setStep("amount");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[90vh] min-h-0 w-full max-w-[448px] flex-col rounded-t-3xl border-t border-white/10 mx-auto"
            style={{
              background: "linear-gradient(180deg, #151922 0%, #0d1118 100%)",
              boxShadow: "0 -20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex w-full shrink-0 justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-6 pb-7">
              <div className="relative mb-6 flex shrink-0 items-center justify-center">
                {step !== "home" && (
                  <button
                    onClick={goBack}
                    className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div className="text-center">
                  <h2 className="text-xl font-black text-white">
                    {step === "transfer"
                      ? (locale === "zh" ? "转入加密货币" : "Transfer Crypto")
                      : (locale === "zh" ? "充值" : "Deposit")}
                  </h2>
                  <p className="text-xs text-white/40">
                    Polymarket {locale === "zh" ? "余额" : "Balance"}: ${Number(balanceUsd || 0).toFixed(2)}
                  </p>
                </div>
                {step === "confirm" && snapshot && !hasSubmittedTx ? (
                  <QuoteCountdownRing
                    key={`${snapshot.quotedAtMs}-${snapshot.expiresAtMs}-${quoteAutoRefreshNonce}`}
                    expiresAtMs={snapshot.expiresAtMs}
                    locale={locale}
                    quotedAtMs={snapshot.quotedAtMs}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div
                className={
                  step === "confirm"
                    ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                    : "min-h-0 flex-1 overflow-y-auto"
                }
              >
              {step === "home" && (
                <HomeStep
                  locale={locale}
                  showConnectedWalletOption={showConnectedWalletOption}
                  walletLabel={walletLabel}
                  walletUsdLoading={walletBalancesLoading}
                  walletUsd={totalWalletUsd}
                  onWallet={() => setStep("asset")}
                  onTransfer={() => setStep("transfer")}
                />
              )}

              {step === "asset" && (
                <AssetStep
                  assets={assetsWithBalances}
                  assetsLoading={assetsLoading}
                  locale={locale}
                  onSelect={handleSelectAsset}
                />
              )}

              {step === "amount" && selectedAsset && (
                <AmountStep
                  amountUsd={amountUsd}
                  asset={selectedAsset}
                  error={quoteError}
                  isQuoting={isQuoting}
                  locale={locale}
                  onAmountBlur={handleAmountBlur}
                  onAmountChange={handleAmountChange}
                  onContinue={handleQuote}
                  onPercent={handlePercent}
                />
              )}

              {step === "confirm" && selectedAsset && snapshot && (
                <ConfirmStep
                  cancelTxHash={cancelTxHash}
                  depositBridgeComplete={depositBridgeComplete}
                  dlnStatus={dlnStatus.status}
                  error={executionError}
                  executionRiskWarning={executionRiskWarning}
                  hasSubmittedTx={hasSubmittedTx}
                  hasUnconfirmedRiskWarning={hasHighWalletMismatchRisk && !hasAcknowledgedRiskWarning}
                  isExecuting={isExecuting}
                  isQuoting={isQuoting}
                  isCancellingOrder={isCancellingOrder}
                  locale={locale}
                  onCancelOrder={handleCancelDlnOrder}
                  onConfirm={handleConfirmOrder}
                  quoteWarning={quoteWarning}
                  snapshot={snapshot}
                  walletLabel={walletLabel}
                />
              )}

              {step === "transfer" && (
                <TransferStep
                  assets={transferAssets}
                  chainOptions={transferChainOptions}
                  copied={copied}
                  error={mergedTransferError}
                  isCreating={isCreatingTransferAddress}
                  locale={locale}
                  onAssetChange={setSelectedTransferAssetId}
                  onChainChange={setSelectedTransferChainId}
                  onCopy={handleCopy}
                  onCreate={handleCreateTransferAddress}
                  onRetryPolling={() => void transferStatus.mutate()}
                  selectedAssetId={selectedTransferAssetId}
                  selectedChainId={selectedTransferChainId}
                  statusText={getStatusText(locale, transferStatus.latestStatus)}
                  transferAddress={transferAddress}
                />
              )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function isHighWalletMismatchRisk(snapshot: ExecutionSnapshot): boolean {
  if (snapshot.kind === "direct-transfer") return false;
  const sendUsd = snapshot.sendUsd;
  const receiveUsd = snapshot.receiveUsd;
  if (!Number.isFinite(sendUsd) || !Number.isFinite(receiveUsd)) return false;
  if ((sendUsd ?? 0) < 5) return false;
  const diffRatio = Math.abs((sendUsd ?? 0) - (receiveUsd ?? 0)) / (sendUsd ?? 1);
  return diffRatio > 0.2;
}

export function DepositDrawer(props: DepositDrawerProps) {
  if (typeof document === "undefined") return null;

  return createPortal(<DrawerContent {...props} />, document.body);
}

