import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
import { useDlnOrderStatus } from "@/hooks/useDln";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { useTranslation } from "@/i18n";
import type { DepositDrawerProps } from "./deposit/types";
import { ensureEvmDepositAddress } from "./deposit/addresses";
import {
  buildExecutionSnapshot,
  resolveExecutionEngine,
} from "./deposit/execution";
import { isHighWalletMismatchRisk } from "./deposit/risk";
import { computeDepositBridgeComplete } from "./deposit/computeDepositBridgeComplete";
import { QuoteCountdownRing } from "./deposit/quote-countdown-ring";
import { HomeStep } from "./deposit/connected/HomeStep";
import { AssetStep } from "./deposit/connected/AssetStep";
import { AmountStep } from "./deposit/connected/AmountStep";
import { useConnectedAmountInput } from "./deposit/connected/useConnectedAmountInput";
import { useConnectedConfirmFlow } from "./deposit/connected/useConnectedConfirmFlow";
import { useConnectedQuoteFlow } from "./deposit/connected/useConnectedQuoteFlow";
import { useConnectedEntryFlow } from "./deposit/connected/useConnectedEntryFlow";
import { ConfirmStep } from "./deposit/confirm/ConfirmStep";
import { TransferStep } from "./deposit/transfer/TransferStep";
import { useTransferDepositFlow } from "./deposit/transfer/useTransferDepositFlow";
import { useDepositDrawerController } from "./deposit/useDepositDrawerController";
import { useDepositBalanceRefresh } from "./deposit/useDepositBalanceRefresh";
import { getTransferChainMinUsd } from "./deposit/minimums";
import { FundsMovementTermsPanel } from "./FundsMovementTermsPanel";

function DrawerContent({
  balanceUsd = "0.00",
  isOpen,
  onClose,
  proxyAddress,
  onBalanceRefresh,
}: DepositDrawerProps) {
  useLockBodyScroll(isOpen);
  const { locale, t } = useTranslation();
  const { sessionEpoch } = usePolymarketAuth();
  const resetTransferStateRef = useRef<() => void>(() => {});
  const resetTransferStateStable = useCallback(() => {
    resetTransferStateRef.current();
  }, []);

  const c = useDepositDrawerController({
    isOpen,
    sessionEpoch,
    proxyAddress,
    locale,
    resetTransferState: resetTransferStateStable,
  });

  const tf = useTransferDepositFlow({
    connectedSubmitFastUntilMs: c.connectedSubmitFastUntilMs,
    depositAssets: c.depositAssets,
    isOpen,
    locale,
    onDepositResponse: c.setDepositResponse,
    proxyAddress,
    setStep: c.setStep,
    step: c.step,
  });

  resetTransferStateRef.current = tf.resetTransferState;

  const depositBridgeComplete = useMemo(
    () =>
      computeDepositBridgeComplete({
        hasSubmittedTx: c.hasSubmittedTx,
        transferAddress: tf.transferAddress,
        executionTxHash: c.executionTxHash,
        executionSubmittedAtMs: c.executionSubmittedAtMs,
        transactions: tf.transferStatus.data?.transactions,
      }),
    [
      c.executionSubmittedAtMs,
      c.executionTxHash,
      c.hasSubmittedTx,
      tf.transferAddress,
      tf.transferStatus.data?.transactions,
    ]
  );

  useDepositBalanceRefresh({
    depositBridgeComplete,
    transferBridgeComplete: tf.transferBridgeComplete,
    onBalanceRefresh,
  });

  const dlnStatus = useDlnOrderStatus(c.submittedOrderId, Boolean(c.submittedOrderId && isOpen));

  const {
    handleSelectAsset,
    openConnectedAssetStep,
    walletLabel,
  } = useConnectedEntryFlow({
    activeWalletAddress: c.walletAddress,
    confirmAttemptGenerationRef: c.confirmAttemptGenerationRef,
    depositAssets: c.depositAssets,
    isExecutingRef: c.isExecutingRef,
    quoteRequestRef: c.quoteRequestRef,
    setAmountUsd: c.setAmountUsd,
    setCancelTxHash: c.setCancelTxHash,
    setExecutionError: c.setExecutionError,
    setExecutionTxHash: c.setExecutionTxHash,
    setIsExecuting: c.setIsExecuting,
    setQuoteError: c.setQuoteError,
    setQuoteWarning: c.setQuoteWarning,
    setSelectedAsset: c.setSelectedAsset,
    setSnapshot: c.setSnapshot,
    setStep: c.setStep,
    setSubmittedOrderId: c.setSubmittedOrderId,
    user: c.user,
  });

  useEffect(() => {
    if (!isOpen || !tf.transferAddress || !c.executionTxHash) return;
    void tf.transferStatus.mutate();
  }, [c.executionTxHash, isOpen, tf.transferAddress, tf.transferStatus]);

  useEffect(() => {
    if (c.step !== "confirm" || !c.snapshot || c.isExecuting || c.hasSubmittedTx) {
      return;
    }
    if (c.isQuoting) {
      return;
    }

    const remain = c.snapshot.expiresAtMs - Date.now();
    const delay = remain > 0 ? Math.max(1_000, remain) : 1_000;
    const snapshot = c.snapshot;

    const timeout = window.setTimeout(async () => {
      if (c.isExecutingRef.current) return;
      const requestId = ++c.quoteRequestRef.current;
      c.setIsQuoting(true);
      c.setQuoteWarning("");
      try {
        const depositAddress = await ensureEvmDepositAddress({
          existingAddress: tf.transferAddress,
          onAddress: tf.setTransferAddress,
          onResponse: c.setDepositResponse,
          proxyAddress,
        });
        const next = await buildExecutionSnapshot({
          amountUsd: snapshot.amountUsd,
          asset: snapshot.asset,
          depositAddress,
          executionEngine: resolveExecutionEngine(snapshot.asset),
          proxyAddress,
        });
        if (c.quoteRequestRef.current !== requestId) return;
        if (c.isExecutingRef.current) return;
        c.setSnapshot(next);
      } catch {
        if (c.quoteRequestRef.current === requestId) {
          c.setQuoteWarning(
            locale === "zh"
              ? "报价可能已过期，提交时会再次刷新。"
              : "Quote may be stale. It will refresh again before submission."
          );
          c.setQuoteAutoRefreshNonce((n) => n + 1);
        }
      } finally {
        if (c.quoteRequestRef.current === requestId) {
          c.setIsQuoting(false);
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    c.hasSubmittedTx,
    c.isExecuting,
    c.isQuoting,
    c.snapshot,
    c.step,
    locale,
    proxyAddress,
    tf.setTransferAddress,
    tf.transferAddress,
    c.quoteAutoRefreshNonce,
    c.setDepositResponse,
    c.setIsQuoting,
    c.setQuoteWarning,
    c.setSnapshot,
  ]);

  const { handleAmountBlur, handleAmountChange, handlePercent } = useConnectedAmountInput({
    amountNumber: c.amountNumber,
    amountUsd: c.amountUsd,
    selectedAsset: c.selectedAsset,
    selectedUsdValue: c.selectedUsdValue,
    setAmountUsd: c.setAmountUsd,
  });

  const { handleQuote } = useConnectedQuoteFlow({
    amountNumber: c.amountNumber,
    depositAssets: c.depositAssets,
    locale,
    proxyAddress,
    quoteRequestRef: c.quoteRequestRef,
    selectedAsset: c.selectedAsset,
    selectedUsdValue: c.selectedUsdValue,
    setDepositResponse: c.setDepositResponse,
    setExecutionError: c.setExecutionError,
    setExecutionRiskWarning: c.setExecutionRiskWarning,
    setIsQuoting: c.setIsQuoting,
    setQuoteError: c.setQuoteError,
    setQuoteWarning: c.setQuoteWarning,
    setSnapshot: c.setSnapshot,
    setStep: c.setStep,
    setTransferAddress: tf.setTransferAddress,
    transferAddress: tf.transferAddress,
  });

  const { handleConfirmOrder } = useConnectedConfirmFlow({
    activeWallet: c.activeWallet,
    confirmAttemptGenerationRef: c.confirmAttemptGenerationRef,
    depositAssets: c.depositAssets,
    hasAcknowledgedRiskWarning: c.hasAcknowledgedRiskWarning,
    isExecutingRef: c.isExecutingRef,
    isHighWalletMismatchRisk,
    locale,
    proxyAddress,
    quoteRequestRef: c.quoteRequestRef,
    selectedAsset: c.selectedAsset,
    setCancelTxHash: c.setCancelTxHash,
    setDepositResponse: c.setDepositResponse,
    setExecutionError: c.setExecutionError,
    setExecutionRiskWarning: c.setExecutionRiskWarning,
    setExecutionSubmittedAtMs: c.setExecutionSubmittedAtMs,
    setExecutionTxHash: c.setExecutionTxHash,
    setHasAcknowledgedRiskWarning: c.setHasAcknowledgedRiskWarning,
    setIsExecuting: c.setIsExecuting,
    setQuoteWarning: c.setQuoteWarning,
    setSnapshot: c.setSnapshot,
    setSubmittedOrderId: c.setSubmittedOrderId,
    setTransferAddress: tf.setTransferAddress,
    snapshot: c.snapshot,
    transferAddress: tf.transferAddress,
    walletAddress: c.walletAddress,
  });

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
              background: "linear-gradient(180deg, #1A0D2E 0%, #0D0518 100%)",
              boxShadow: "0 -24px 80px rgba(0,0,0,0.8)",
            }}
          >
            <div className="flex w-full shrink-0 justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="flex flex-col px-6 pb-7">
              <div className="relative mb-6 flex shrink-0 items-center justify-center">
                {c.step !== "home" && (
                  <button
                    type="button"
                    onClick={c.goBack}
                    className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div className="text-center">
                  <h2 className="text-xl font-black text-white">
                    {c.step === "transfer"
                      ? (locale === "zh" ? "转入加密货币" : "Transfer Crypto")
                      : (locale === "zh" ? "充值" : "Deposit")}
                  </h2>
                  <p className="text-xs text-white/40">
                    {t.fundsMenu.balanceLabel(Number(balanceUsd || 0).toFixed(2))}
                  </p>
                </div>
                {c.step === "confirm" && c.snapshot && !c.hasSubmittedTx ? (
                  <QuoteCountdownRing
                    key={`${c.snapshot.quotedAtMs}-${c.snapshot.expiresAtMs}-${c.quoteAutoRefreshNonce}`}
                    expiresAtMs={c.snapshot.expiresAtMs}
                    locale={locale}
                    quotedAtMs={c.snapshot.quotedAtMs}
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

              {c.step === "home" && (
                <>
                  <HomeStep
                    showConnectedWalletOption={c.showConnectedWalletOption}
                    walletLabel={walletLabel}
                    walletUsdLoading={c.walletBalancesLoading}
                    walletUsd={c.totalWalletUsd}
                    onWallet={openConnectedAssetStep}
                    onTransfer={tf.openTransferStep}
                  />
                  <button
                    type="button"
                    onClick={() => c.setFundsTermsOpen(true)}
                    className="mt-4 w-full text-center text-xs font-medium text-white/35 underline-offset-2 hover:text-white/55 hover:underline"
                  >
                    {t.fundsMovementTerms.linkLabel}
                  </button>
                </>
              )}

              {c.step === "asset" && (
                <AssetStep
                  assets={c.assetsWithBalances}
                  assetsLoading={c.assetsLoading}
                  locale={locale}
                  onSelect={handleSelectAsset}
                />
              )}

              {c.step === "amount" && c.selectedAsset && (
                (() => {
                  const connectedMinDepositUsd = getTransferChainMinUsd(
                    c.selectedAsset.chainName,
                    c.selectedAsset.chainId,
                    c.depositAssets
                  );
                  return (
                <AmountStep
                  amountUsd={c.amountUsd}
                  asset={c.selectedAsset}
                  error={c.quoteError}
                  isQuoting={c.isQuoting}
                  minDepositUsd={connectedMinDepositUsd}
                  onAmountBlur={handleAmountBlur}
                  onAmountChange={handleAmountChange}
                  onContinue={handleQuote}
                  onPercent={handlePercent}
                />
                  );
                })()
              )}

              {c.step === "confirm" && c.selectedAsset && c.snapshot && (
                <ConfirmStep
                  cancelTxHash={c.cancelTxHash}
                  depositBridgeComplete={depositBridgeComplete}
                  dlnStatus={dlnStatus.status}
                  error={c.executionError}
                  executionRiskWarning={c.executionRiskWarning}
                  hasSubmittedTx={c.hasSubmittedTx}
                  hasUnconfirmedRiskWarning={c.hasHighWalletMismatchRisk && !c.hasAcknowledgedRiskWarning}
                  isCancellingOrder={c.isCancellingOrder}
                  isExecuting={c.isExecuting}
                  isQuoting={c.isQuoting}
                  onCancelOrder={c.handleCancelDlnOrder}
                  onConfirm={handleConfirmOrder}
                  onFallbackToTransfer={tf.openTransferStep}
                  quoteWarning={c.quoteWarning}
                  snapshot={c.snapshot}
                  walletLabel={walletLabel}
                />
              )}

              {c.step === "transfer" && (
                <TransferStep
                  assets={tf.transferAssets}
                  chainOptions={tf.transferChainOptions}
                  copied={tf.copied}
                  error={tf.transferError}
                  isCreating={tf.isCreatingTransferAddress}
                  locale={locale}
                  onAssetChange={tf.setSelectedTransferAssetId}
                  onChainChange={tf.setSelectedTransferChainId}
                  onCopy={tf.handleCopy}
                  onCreate={tf.handleCreateTransferAddress}
                  onRetryPolling={() => void tf.transferStatus.mutate()}
                  selectedAssetId={tf.selectedTransferAssetId}
                  selectedChainId={tf.selectedTransferChainId}
                  statusCode={tf.transferLatestStatus}
                  statusText={locale === "zh" ? "等待转账" : "Waiting"}
                  transferAddress={tf.transferAddress}
                />
              )}
            </div>
          </motion.div>
        </>
        )}
      </AnimatePresence>
      <FundsMovementTermsPanel isOpen={c.fundsTermsOpen} onClose={() => c.setFundsTermsOpen(false)} />
    </>
  );
}

export function DepositDrawer(props: DepositDrawerProps) {
  if (typeof document === "undefined") return null;

  return createPortal(<DrawerContent {...props} />, document.body);
}
