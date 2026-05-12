import { useCallback, useMemo, type MutableRefObject } from "react";
import { useTranslation } from "@/i18n";
import { shortenAddress } from "@/lib/utils";
import { CONNECTED_MAX_BUFFER_USD, DEPOSIT_SINGLE_TX_CAP_USD } from "../constants";
import { abandonConfirmAttempt } from "./confirmAttemptGeneration";
import { formatAmountUsdInput } from "../format";
import { getConnectedDefaultAmountUsd, getTransferChainMinUsd } from "../minimums";
import type { DepositAsset, ExecutionSnapshot, FlowStep } from "../types";

type PrivyLoginIdentity = {
  email?: { address?: string | null } | null;
  google?: { email?: string | null } | null;
  twitter?: { username?: string | null; subject?: string | null } | null;
};

function isEmailOrSocialLogin(user: unknown): boolean {
  const identity = user as PrivyLoginIdentity | null | undefined;
  return Boolean(
    identity?.email?.address ||
      identity?.google?.email ||
      identity?.twitter?.username ||
      identity?.twitter?.subject
  );
}

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
  user: unknown;
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
  user,
}: UseConnectedEntryFlowArgs) {
  const { t } = useTranslation();
  const walletLabel = useMemo(() => {
    if (!activeWalletAddress) return t.depositFlow.walletStandalone;
    return t.depositFlow.walletWithAddress(shortenAddress(activeWalletAddress, 4, 4));
  }, [activeWalletAddress, t]);

  const showConnectedWalletOption = useMemo(
    () => Boolean(activeWalletAddress) && !isEmailOrSocialLogin(user),
    [activeWalletAddress, user]
  );

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
      walletUsdValue: Number(asset.usdValue ?? 0),
      chainMinUsd,
      singleTxCapUsd: DEPOSIT_SINGLE_TX_CAP_USD,
      maxBufferUsd: CONNECTED_MAX_BUFFER_USD,
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
    showConnectedWalletOption,
    walletAddress: activeWalletAddress,
    walletLabel,
  };
}
