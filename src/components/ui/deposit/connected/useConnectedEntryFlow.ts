import { useCallback, useMemo, type MutableRefObject } from "react";
import { useTranslation } from "@/i18n";
import { shortenAddress } from "@/lib/utils";
import { DEPOSIT_SINGLE_TX_CAP_USD } from "../constants";
import { abandonConfirmAttempt } from "./confirmAttemptGeneration";
import { formatAmountUsdInput } from "../format";
import { getConnectedDefaultAmountUsd, getTransferChainMinUsd } from "../minimums";
import type { DepositAsset, ExecutionSnapshot, FlowStep } from "../types";

type UseConnectedEntryFlowArgs = {
  activeWalletAddress: string;
  confirmAttemptGenerationRef: MutableRefObject<number>;
  depositAssets: DepositAsset[];
  isExecutingRef: MutableRefObject<boolean>;
  quoteRequestRef: MutableRefObject<number>;
  setAmountUsd: (value: string) => void;
  setCancelTxHash: (value: string) => void;
  setExecutionError: (value: string) => void;
  setExecutionTxHash: (value: string) => void;
  setIsExecuting: (value: boolean) => void;
  setQuoteError: (value: string) => void;
  setQuoteWarning: (value: string) => void;
  setSelectedAsset: (value: DepositAsset | null) => void;
  setSnapshot: (value: ExecutionSnapshot | null) => void;
  setStep: (value: FlowStep) => void;
  setSubmittedOrderId: (value: string) => void;
};

export function useConnectedEntryFlow({
  activeWalletAddress,
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
}: UseConnectedEntryFlowArgs) {
  const { t } = useTranslation();
  const walletLabel = useMemo(() => {
    if (!activeWalletAddress) return t.depositFlow.walletStandalone;
    return t.depositFlow.walletWithAddress(shortenAddress(activeWalletAddress, 4, 4));
  }, [activeWalletAddress, t]);

  const openConnectedAssetStep = useCallback(() => {
    setStep("asset");
  }, [setStep]);

  const handleSelectAsset = useCallback((asset: DepositAsset) => {
    quoteRequestRef.current += 1;
    abandonConfirmAttempt(confirmAttemptGenerationRef);
    setIsExecuting(false);
    isExecutingRef.current = false;
    const chainMinUsd = getTransferChainMinUsd(asset.chainName, asset.chainId, depositAssets);
    const defaultAmountUsd = getConnectedDefaultAmountUsd({
      asset,
      chainMinUsd,
      singleTxCapUsd: DEPOSIT_SINGLE_TX_CAP_USD,
    });
    setAmountUsd(formatAmountUsdInput(defaultAmountUsd));
    setSelectedAsset(asset);
    setSnapshot(null);
    setQuoteError("");
    setQuoteWarning("");
    setExecutionError("");
    setExecutionTxHash("");
    setSubmittedOrderId("");
    setCancelTxHash("");
    setStep("amount");
  }, [
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
  ]);

  return {
    handleSelectAsset,
    openConnectedAssetStep,
    walletAddress: activeWalletAddress,
    walletLabel,
  };
}
