import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { useSupportedAssets } from "@/hooks/useBridge";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { getDlnCancelTx, useDlnOrderStatus } from "@/hooks/useDln";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { useTranslation } from "@/i18n";
import type { BridgeTransaction, CreateDepositResponse } from "@/types/bridge";
import type {
  DepositAddressMap,
  DepositAsset,
  DepositDrawerProps,
  ExecutionSnapshot,
  FlowStep,
} from "./deposit/types";
import { CONNECTED_MAX_BUFFER_USD, DEPOSIT_SINGLE_TX_CAP_USD } from "./deposit/constants";
import { ensureEvmDepositAddress } from "./deposit/addresses";
import {
  estimateUsdValue,
  normalizeSupportedAssets,
  readAssetBalance,
} from "./deposit/assets";
import { getWalletEthereumProvider, sendPreparedEvmTx, switchEvmChain } from "./deposit/evm";
import { executeConnectedOrder } from "./deposit/executor";
import {
  buildExecutionSnapshot,
  isQuotePriceChanged,
  resolveExecutionEngine,
  validateBridgeReceiveMinimum,
  validateDepositSelection,
} from "./deposit/execution";
import { formatExecutionError } from "./deposit/errors";
import { formatAmountUsdInput, parseAmountUsd, sanitizeAmountUsdInput } from "./deposit/format";
import {
  getConnectedDefaultAmountUsd,
  getConnectedMaxAllowedUsd,
  getTransferChainMinUsd,
} from "./deposit/minimums";
import {
  isBridgeCompletedStatus,
} from "./deposit/status";
import { QuoteCountdownRing } from "./deposit/quote-countdown-ring";
import { HomeStep } from "./deposit/connected/HomeStep";
import { AssetStep } from "./deposit/connected/AssetStep";
import { AmountStep } from "./deposit/connected/AmountStep";
import { useConnectedAmountInput } from "./deposit/connected/useConnectedAmountInput";
import { useConnectedConfirmFlow } from "./deposit/connected/useConnectedConfirmFlow";
import { useConnectedQuoteFlow } from "./deposit/connected/useConnectedQuoteFlow";
import {
  abandonConfirmAttempt,
} from "./deposit/connected/confirmAttemptGeneration";
import { ConfirmStep } from "./deposit/confirm/ConfirmStep";
import { TransferStep } from "./deposit/transfer/TransferStep";
import { useTransferDepositFlow } from "./deposit/transfer/useTransferDepositFlow";
import { useConnectedEntryFlow } from "./deposit/connected/useConnectedEntryFlow";
import { FundsMovementTermsPanel } from "./FundsMovementTermsPanel";

function DrawerContent({
  balanceUsd = "0.00",
  isOpen,
  onClose,
  proxyAddress,
  onBalanceRefresh,
}: DepositDrawerProps) {
  const BRIDGE_STATUS_FALLBACK_BEFORE_SUBMIT_MS = 45_000;
  const BRIDGE_STATUS_FALLBACK_AFTER_SUBMIT_MS = 10 * 60_000;
  useLockBodyScroll(isOpen);
  const { locale, t } = useTranslation();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { stickyExternalWalletClientType } = usePolymarketAuth();
  const { data: supportedAssets, isLoading: assetsLoading } = useSupportedAssets();
  const [step, setStep] = useState<FlowStep>("home");
  const [fundsTermsOpen, setFundsTermsOpen] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setFundsTermsOpen(false);
    }
  }, [isOpen]);
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
  const [assetBalances, setAssetBalances] = useState<Record<string, string>>({});
  const [assetUsdValues, setAssetUsdValues] = useState<Record<string, number>>({});
  const [walletBalancesLoading, setWalletBalancesLoading] = useState(false);
  /** 入账完成边沿检测：避免 transfer 与 connected 共用一次性标记导致后者跳过刷新 */
  const prevDepositBridgeCompleteRef = useRef(false);
  const prevTransferBridgeCompleteRef = useRef(false);
  /** 报价自动刷新失败时递增，用于重新挂载确认页定时器（避免 snapshot 未变导致不再调度） */
  const [quoteAutoRefreshNonce, setQuoteAutoRefreshNonce] = useState(0);
  const quoteRequestRef = useRef(0);
  /** Connected 确认订单：返回上一页或改选资产时递增，丢弃仍在等待钱包的旧提交 */
  const confirmAttemptGenerationRef = useRef(0);
  const isExecutingRef = useRef(false);
  const balanceRefreshRetryTimersRef = useRef<number[]>([]);

  const activeWallet = useMemo(
    () =>
      selectPrimaryWallet(wallets, user?.wallet?.address, {
        stickyClientType: stickyExternalWalletClientType,
      }),
    [wallets, user?.wallet?.address, stickyExternalWalletClientType]
  );
  const depositAssets = useMemo(
    () => normalizeSupportedAssets(supportedAssets),
    [supportedAssets]
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
  const amountNumber = parseAmountUsd(amountUsd);
  const selectedUsdValue = selectedAsset ? assetUsdValues[selectedAsset.id] : undefined;
  const hasSubmittedTx = Boolean(executionTxHash || submittedOrderId);
  const CONNECTED_SUBMIT_FAST_POLL_MS = 120_000;
  const connectedSubmitFastUntilMs =
    executionSubmittedAtMs > 0
      ? executionSubmittedAtMs + CONNECTED_SUBMIT_FAST_POLL_MS
      : 0;
  // Connected: home/asset/amount 的入口编排。
  const {
    handleSelectAsset,
    openConnectedAssetStep,
    showConnectedWalletOption,
    walletAddress,
    walletLabel,
  } = useConnectedEntryFlow({
    activeWalletAddress: activeWallet?.address ?? "",
    confirmAttemptGenerationRef,
    depositAssets,
    isExecutingRef,
    quoteRequestRef,
    setAmountUsd,
    setCancelTxHash,
    setExecutionError,
    setExecutionTxHash,
    setIsExecuting,
    setQuoteError,
    setQuoteWarning,
    setSelectedAsset,
    setSnapshot,
    setStep,
    setSubmittedOrderId,
    user,
  });
  const {
    copied,
    handleCopy,
    handleCreateTransferAddress,
    isCreatingTransferAddress,
    openTransferStep,
    resetTransferState,
    selectedTransferAssetId,
    selectedTransferChainId,
    setSelectedTransferAssetId,
    setSelectedTransferChainId,
    setTransferAddress,
    transferAddress,
    transferAssets,
    transferBridgeComplete,
    transferChainOptions,
    transferError,
    transferLatestStatus,
    transferStatus,
  } = useTransferDepositFlow({
    connectedSubmitFastUntilMs,
    depositAssets,
    isOpen,
    locale,
    onDepositResponse: setDepositResponse,
    proxyAddress,
    setStep,
    step,
  });
  // Transfer: 资产筛选、地址创建、轮询与状态展示。
  const dlnStatus = useDlnOrderStatus(submittedOrderId, Boolean(submittedOrderId && isOpen));

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
      isBridgeCompletedStatus(currentSubmissionTransaction?.status)
  );

  const hasHighWalletMismatchRisk = useMemo(
    () => (snapshot ? isHighWalletMismatchRisk(snapshot) : false),
    [snapshot]
  );

  useEffect(() => {
    if (!isOpen) return;
    quoteRequestRef.current += 1;
    confirmAttemptGenerationRef.current = 0;
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
    resetTransferState();
    setQuoteAutoRefreshNonce(0);
  }, [isOpen, resetTransferState]);

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

  const scheduleBalanceRefreshRetries = useCallback(() => {
    balanceRefreshRetryTimersRef.current.forEach((timerId) =>
      window.clearTimeout(timerId)
    );
    balanceRefreshRetryTimersRef.current = [];
    const retryDelays = [8_000, 20_000];
    balanceRefreshRetryTimersRef.current = retryDelays.map((delayMs) =>
      window.setTimeout(() => {
        onBalanceRefresh?.();
      }, delayMs)
    );
  }, [onBalanceRefresh]);

  useEffect(() => {
    const rose =
      depositBridgeComplete &&
      !prevDepositBridgeCompleteRef.current;
    prevDepositBridgeCompleteRef.current = depositBridgeComplete;

    if (!rose) return;

    onBalanceRefresh?.();
    scheduleBalanceRefreshRetries();
  }, [depositBridgeComplete, onBalanceRefresh, scheduleBalanceRefreshRetries]);

  useEffect(() => {
    const rose =
      transferBridgeComplete &&
      !prevTransferBridgeCompleteRef.current;
    prevTransferBridgeCompleteRef.current = transferBridgeComplete;

    if (!rose) return;

    onBalanceRefresh?.();
    scheduleBalanceRefreshRetries();
  }, [onBalanceRefresh, scheduleBalanceRefreshRetries, transferBridgeComplete]);

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
    if (!isOpen) setFundsTermsOpen(false);
  }, [isOpen]);

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
          executionEngine: resolveExecutionEngine(snapshot.asset),
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

  const {
    handleAmountBlur,
    handleAmountChange,
    handlePercent,
  } = useConnectedAmountInput({
    amountNumber,
    amountUsd,
    selectedAsset,
    selectedUsdValue,
    setAmountUsd,
  });

  const { handleQuote } = useConnectedQuoteFlow({
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
  });

  const { handleConfirmOrder } = useConnectedConfirmFlow({
    activeWallet,
    confirmAttemptGenerationRef,
    depositAssets,
    hasAcknowledgedRiskWarning,
    isExecutingRef,
    isHighWalletMismatchRisk,
    locale,
    proxyAddress,
    quoteRequestRef,
    selectedAsset,
    setCancelTxHash,
    setDepositResponse,
    setExecutionError,
    setExecutionRiskWarning,
    setExecutionSubmittedAtMs,
    setExecutionTxHash,
    setHasAcknowledgedRiskWarning,
    setIsExecuting,
    setQuoteWarning,
    setSnapshot,
    setSubmittedOrderId,
    setTransferAddress,
    snapshot,
    transferAddress,
    walletAddress,
  });

  const resetConfirmProgress = useCallback(() => {
    abandonConfirmAttempt(confirmAttemptGenerationRef);
    quoteRequestRef.current += 1;
    setIsExecuting(false);
    isExecutingRef.current = false;
    setExecutionError("");
    setExecutionRiskWarning("");
    setHasAcknowledgedRiskWarning(false);
  }, []);

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

  const goBack = useCallback(() => {
    if (step === "home") return;
    if (step === "confirm") {
      resetConfirmProgress();
      setStep("amount");
      return;
    }
    if (step === "asset" || step === "transfer") setStep("home");
    if (step === "amount") setStep("asset");
  }, [resetConfirmProgress, step]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 touch-none bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] min-h-0 w-full max-w-[448px] touch-pan-y flex-col overflow-y-auto overscroll-y-contain rounded-t-3xl border-t border-white/10 mx-auto"
            style={{
              // 与 SettingsDrawer 主面板一致（仅抽屉壳背景/阴影）
              background: "linear-gradient(180deg, #1A0D2E 0%, #0D0518 100%)",
              boxShadow: "0 -24px 80px rgba(0,0,0,0.8)",
            }}
          >
            <div className="flex w-full shrink-0 justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="flex flex-col px-6 pb-7">
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

              {step === "home" && (
                <HomeStep
                  fundsTermsLinkLabel={t.fundsMovementTerms.linkLabel}
                  onOpenFundsTerms={() => setFundsTermsOpen(true)}
                  showConnectedWalletOption={showConnectedWalletOption}
                  walletLabel={walletLabel}
                  walletUsdLoading={walletBalancesLoading}
                  walletUsd={totalWalletUsd}
                  onWallet={openConnectedAssetStep}
                  onTransfer={openTransferStep}
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
                (() => {
                  const connectedMinDepositUsd = getTransferChainMinUsd(
                    selectedAsset.chainName,
                    selectedAsset.chainId,
                    depositAssets
                  );
                  return (
                <AmountStep
                  amountUsd={amountUsd}
                  asset={selectedAsset}
                  error={quoteError}
                  isQuoting={isQuoting}
                  minDepositUsd={connectedMinDepositUsd}
                  onAmountBlur={handleAmountBlur}
                  onAmountChange={handleAmountChange}
                  onContinue={handleQuote}
                  onPercent={handlePercent}
                />
                  );
                })()
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
                  isCancellingOrder={isCancellingOrder}
                  isExecuting={isExecuting}
                  isQuoting={isQuoting}
                  onCancelOrder={handleCancelDlnOrder}
                  onConfirm={handleConfirmOrder}
                  onFallbackToTransfer={openTransferStep}
                  quoteWarning={quoteWarning}
                  snapshot={snapshot}
                  walletLabel={walletLabel}
                />
              )}

              {step === "transfer" && (
                // 红条仅展示收款地址生成等业务错误；桥 status 轮询失败由 SWR 间隔自动重试，不并入 error
                <TransferStep
                  assets={transferAssets}
                  chainOptions={transferChainOptions}
                  copied={copied}
                  error={transferError}
                  isCreating={isCreatingTransferAddress}
                  locale={locale}
                  onAssetChange={setSelectedTransferAssetId}
                  onChainChange={setSelectedTransferChainId}
                  onCopy={handleCopy}
                  onCreate={handleCreateTransferAddress}
                  onRetryPolling={() => void transferStatus.mutate()}
                  selectedAssetId={selectedTransferAssetId}
                  selectedChainId={selectedTransferChainId}
                  statusCode={transferLatestStatus}
                  statusText={locale === "zh" ? "等待转账" : "Waiting"}
                  transferAddress={transferAddress}
                />
              )}
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>
      <FundsMovementTermsPanel isOpen={fundsTermsOpen} onClose={() => setFundsTermsOpen(false)} />
    </>
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

