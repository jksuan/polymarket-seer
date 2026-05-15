/**
 * Connected 确认页执行流。已知问题：Polygon 原生 POL 充值老/新账户仍失败，非 gas 不足，见 issue。
 */
import { useCallback, type MutableRefObject } from "react";
import type { CreateDepositResponse } from "@/types/bridge";
import { ensureEvmDepositAddress } from "../addresses";
import { DEPOSIT_SINGLE_TX_CAP_USD } from "../constants";
import { formatNativeGasReserveError } from "../nativeGas";
import { buildExecutionSnapshot, isQuotePriceChanged, resolveExecutionEngine, validateBridgeReceiveMinimum, validateDepositSelection } from "../execution";
import { formatExecutionError } from "../errors";
import { executeConnectedOrder } from "../executor";
import {
  formatNativeAmountClampedWarning,
  prepareNativeTransferTx,
} from "../prepareNativeTransfer";
import { shouldApplyConfirmResult, startConfirmAttempt } from "./confirmAttemptGeneration";
import type { DepositAsset, ExecutionSnapshot } from "../types";

type UseConnectedConfirmFlowArgs = {
  activeWallet: unknown;
  confirmAttemptGenerationRef: MutableRefObject<number>;
  depositAssets: DepositAsset[];
  hasAcknowledgedRiskWarning: boolean;
  isExecutingRef: MutableRefObject<boolean>;
  isHighWalletMismatchRisk: (snapshot: ExecutionSnapshot) => boolean;
  locale: string;
  proxyAddress: string;
  quoteRequestRef: MutableRefObject<number>;
  selectedAsset: DepositAsset | null;
  setCancelTxHash: (value: string) => void;
  setDepositResponse: (response: CreateDepositResponse | null) => void;
  setExecutionError: (value: string) => void;
  setExecutionRiskWarning: (value: string) => void;
  setExecutionSubmittedAtMs: (value: number) => void;
  setExecutionTxHash: (value: string) => void;
  setHasAcknowledgedRiskWarning: (value: boolean) => void;
  setIsExecuting: (value: boolean) => void;
  setQuoteWarning: (value: string) => void;
  setSnapshot: (value: ExecutionSnapshot | null) => void;
  setSubmittedOrderId: (value: string) => void;
  setTransferAddress: (value: string) => void;
  snapshot: ExecutionSnapshot | null;
  transferAddress: string;
  walletAddress: string;
};

export function useConnectedConfirmFlow({
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
}: UseConnectedConfirmFlowArgs) {
  const handleConfirmOrder = useCallback(async () => {
    if (!selectedAsset || !activeWallet || !walletAddress || !snapshot) {
      setExecutionError(locale === "zh" ? "钱包或报价尚未就绪，请返回重试。" : "Wallet or quote is not ready. Please go back and retry.");
      return;
    }

    const confirmAttemptId = startConfirmAttempt(confirmAttemptGenerationRef);

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

    try {
      const validationError = validateDepositSelection({
        amountUsd: snapshot.amountUsd,
        asset: snapshot.asset,
        allAssets: depositAssets,
        connectedSingleTxCapUsd: DEPOSIT_SINGLE_TX_CAP_USD,
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
        const executionEngine = resolveExecutionEngine(activeSnapshot.asset);
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
          executionEngine,
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

      if (activeSnapshot.asset.isNative) {
        try {
          const prepared = await prepareNativeTransferTx(activeSnapshot, walletAddress, locale);
          if (prepared.wasClamped) {
            setQuoteWarning(formatNativeAmountClampedWarning(locale));
          }
        } catch (nativeErr) {
          setExecutionError(
            nativeErr instanceof Error
              ? nativeErr.message
              : formatNativeGasReserveError(locale, activeSnapshot.asset.chainId)
          );
          return;
        }
      }

      const { txHash, orderId } = await executeConnectedOrder({
        locale,
        snapshot: activeSnapshot,
        wallet: activeWallet as never,
        walletAddress,
      });
      if (!shouldApplyConfirmResult(confirmAttemptId, confirmAttemptGenerationRef)) {
        return;
      }
      setExecutionSubmittedAtMs(Date.now());
      setExecutionTxHash(txHash);
      if (orderId) {
        setSubmittedOrderId(orderId);
      }
    } catch (error) {
      setExecutionError(formatExecutionError(error, locale, "execute"));
    } finally {
      isExecutingRef.current = false;
      setIsExecuting(false);
    }
  }, [
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
  ]);

  return { handleConfirmOrder };
}

