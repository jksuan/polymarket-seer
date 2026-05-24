import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { useSupportedAssets } from "@/hooks/useBridge";
import { getDlnCancelTx } from "@/hooks/useDln";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import type { CreateDepositResponse } from "@/types/bridge";
import {
  estimateUsdValue,
  normalizeSupportedAssets,
  readAssetBalance,
  sumVisibleWalletUsd,
} from "./assets";
import { shouldOfferConnectedWalletFunds } from "@/auth/privyUserIdentity";
import { formatExecutionError } from "./errors";
import { getWalletEthereumProvider, sendPreparedEvmTx, switchEvmChain } from "./evm";
import { parseAmountUsd } from "./format";
import { isHighWalletMismatchRisk } from "./risk";
import { abandonConfirmAttempt } from "./connected/confirmAttemptGeneration";
import type { DepositAsset, ExecutionSnapshot, FlowStep } from "./types";

const CONNECTED_SUBMIT_FAST_POLL_MS = 120_000;

export type UseDepositDrawerControllerParams = {
  isOpen: boolean;
  sessionEpoch: number;
  proxyAddress: string;
  locale: string;
  resetTransferState: () => void;
};

export function useDepositDrawerController({
  isOpen,
  sessionEpoch,
  proxyAddress,
  locale,
  resetTransferState,
}: UseDepositDrawerControllerParams) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { primaryWalletSelectOptions, sessionMode } = usePolymarketAuth();
  const { data: supportedAssets, isLoading: assetsLoading } = useSupportedAssets();

  const [step, setStep] = useState<FlowStep>("home");
  const [fundsTermsOpen, setFundsTermsOpen] = useState(false);
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
  const [quoteAutoRefreshNonce, setQuoteAutoRefreshNonce] = useState(0);

  const quoteRequestRef = useRef(0);
  const confirmAttemptGenerationRef = useRef(0);
  const isExecutingRef = useRef(false);

  const activeWallet = useMemo(
    () =>
      selectPrimaryWallet(wallets, user?.wallet?.address, primaryWalletSelectOptions),
    [wallets, user?.wallet?.address, primaryWalletSelectOptions]
  );
  const walletAddress = activeWallet?.address ?? "";

  const depositAssets = useMemo(
    () => normalizeSupportedAssets(supportedAssets),
    [supportedAssets]
  );
  const assetsWithBalances = useMemo(
    () =>
      depositAssets.map((asset) => ({
        ...asset,
        balance: assetBalances[asset.id],
        usdValue: assetUsdValues[asset.id] ?? 0,
      })),
    [assetBalances, assetUsdValues, depositAssets]
  );
  const totalWalletUsd = useMemo(
    () => sumVisibleWalletUsd(assetsWithBalances),
    [assetsWithBalances]
  );

  const showConnectedWalletOption = useMemo(
    () => shouldOfferConnectedWalletFunds(sessionMode, walletAddress),
    [sessionMode, walletAddress]
  );

  const amountNumber = parseAmountUsd(amountUsd);
  const selectedUsdValue = selectedAsset ? assetUsdValues[selectedAsset.id] : undefined;
  const hasSubmittedTx = Boolean(executionTxHash || submittedOrderId);
  const connectedSubmitFastUntilMs =
    executionSubmittedAtMs > 0
      ? executionSubmittedAtMs + CONNECTED_SUBMIT_FAST_POLL_MS
      : 0;

  const hasHighWalletMismatchRiskValue = useMemo(
    () => (snapshot ? isHighWalletMismatchRisk(snapshot) : false),
    [snapshot]
  );

  const resetConnectedFlowState = useCallback(() => {
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
    setFundsTermsOpen(false);
  }, [resetTransferState]);

  useEffect(() => {
    if (!isOpen) return;
    resetConnectedFlowState();
  }, [isOpen, sessionEpoch, resetConnectedFlowState]);

  useEffect(() => {
    setHasAcknowledgedRiskWarning(false);
    setExecutionRiskWarning("");
  }, [snapshot?.quotedAtMs]);

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

    void loadBalances();
    return () => {
      cancelled = true;
    };
  }, [
    activeWallet,
    assetsLoading,
    depositAssets,
    isOpen,
    proxyAddress,
    showConnectedWalletOption,
    walletAddress,
  ]);

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

  return {
    step,
    setStep,
    fundsTermsOpen,
    setFundsTermsOpen,
    selectedAsset,
    setSelectedAsset,
    amountUsd,
    setAmountUsd,
    snapshot,
    setSnapshot,
    quoteError,
    setQuoteError,
    quoteWarning,
    setQuoteWarning,
    isQuoting,
    setIsQuoting,
    isExecuting,
    setIsExecuting,
    executionError,
    setExecutionError,
    executionRiskWarning,
    setExecutionRiskWarning,
    hasAcknowledgedRiskWarning,
    setHasAcknowledgedRiskWarning,
    executionTxHash,
    setExecutionTxHash,
    executionSubmittedAtMs,
    setExecutionSubmittedAtMs,
    submittedOrderId,
    setSubmittedOrderId,
    isCancellingOrder,
    cancelTxHash,
    setCancelTxHash,
    setDepositResponse,
    quoteAutoRefreshNonce,
    setQuoteAutoRefreshNonce,
    quoteRequestRef,
    confirmAttemptGenerationRef,
    isExecutingRef,
    activeWallet,
    walletAddress,
    depositAssets,
    assetsWithBalances,
    assetsLoading,
    totalWalletUsd,
    walletBalancesLoading,
    showConnectedWalletOption,
    amountNumber,
    selectedUsdValue,
    hasSubmittedTx,
    connectedSubmitFastUntilMs,
    hasHighWalletMismatchRisk: hasHighWalletMismatchRiskValue,
    user,
    resetConfirmProgress,
    handleCancelDlnOrder,
    goBack,
  };
}
