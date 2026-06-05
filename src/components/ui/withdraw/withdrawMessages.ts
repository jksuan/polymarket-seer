import en from "@/i18n/locales/en";
import zh from "@/i18n/locales/zh";
import {
  formatCollateralBalanceFromAtomicUnits,
  InsufficientOnChainPusdError,
} from "@/auth/collateralBalance";

export type WithdrawFlowMessages = {
  submitted: string;
  completedPusd: string;
  processing: string;
  failed: string;
  userRejected: string;
  noWallet: string;
  noWithdrawAddress: string;
  quoteError: string;
  statusPollError: string;
  statusPollTimeout: string;
  retryStatusPoll: string;
  insufficientOnChainPusd: string;
  batchReverted: string;
};

export function getWithdrawFlowMessages(locale: string): WithdrawFlowMessages {
  const wf = locale === "zh" ? zh.withdrawFlow : en.withdrawFlow;
  return {
    submitted: wf.submitted,
    completedPusd: wf.completedPusd,
    processing: wf.processing,
    failed: wf.failed,
    userRejected: wf.userRejected,
    noWallet: wf.noWallet,
    noWithdrawAddress: wf.noWithdrawAddress,
    quoteError: wf.quoteError,
    statusPollError: wf.statusPollError,
    statusPollTimeout: wf.statusPollTimeout,
    retryStatusPoll: wf.retryStatusPoll,
    insufficientOnChainPusd: wf.insufficientOnChainPusd,
    batchReverted: wf.batchReverted,
  };
}

export function isWithdrawUserRejection(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("action_rejected") ||
    lower.includes("request rejected")
  );
}

/** Map wallet/ethers rejection copy to localized withdraw feedback. */
export function formatWithdrawExecutionError(locale: string, message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return getWithdrawFlowMessages(locale).failed;
  }

  if (isWithdrawUserRejection(trimmed)) {
    return getWithdrawFlowMessages(locale).userRejected;
  }

  const wf = getWithdrawFlowMessages(locale);

  if (trimmed.includes("batch would revert") || trimmed.includes("execution reverted")) {
    return wf.batchReverted;
  }

  if (trimmed === "INSUFFICIENT_ON_CHAIN_PUSD" || trimmed.includes("INSUFFICIENT_ON_CHAIN_PUSD")) {
    return wf.insufficientOnChainPusd;
  }

  if (locale === "zh") {
    if (/withdrawal failed/i.test(trimmed) || trimmed === "Withdrawal failed") {
      return getWithdrawFlowMessages(locale).failed;
    }
  }

  return trimmed;
}

export function formatInsufficientOnChainPusdError(
  locale: string,
  error: InsufficientOnChainPusdError
): string {
  const wf = getWithdrawFlowMessages(locale);
  const available = formatCollateralBalanceFromAtomicUnits(error.onChainPusdAtomic);
  const requested = formatCollateralBalanceFromAtomicUnits(error.requestedAtomic);
  if (locale === "zh") {
    return `${wf.insufficientOnChainPusd}（链上 pUSD 约 $${available}，本次 $${requested}）`;
  }
  return `${wf.insufficientOnChainPusd} (on-chain pUSD ~$${available}, requested $${requested})`;
}
