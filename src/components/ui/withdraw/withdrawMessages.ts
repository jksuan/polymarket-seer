import en from "@/i18n/locales/en";
import zh from "@/i18n/locales/zh";

export type WithdrawFlowMessages = {
  submitted: string;
  completed: string;
  processing: string;
  failed: string;
  userRejected: string;
  noWallet: string;
  noWithdrawAddress: string;
  quoteError: string;
};

export function getWithdrawFlowMessages(locale: string): WithdrawFlowMessages {
  const wf = locale === "zh" ? zh.withdrawFlow : en.withdrawFlow;
  return {
    submitted: wf.submitted,
    completed: wf.completed,
    processing: wf.processing,
    failed: wf.failed,
    userRejected: wf.userRejected,
    noWallet: wf.noWallet,
    noWithdrawAddress: wf.noWithdrawAddress,
    quoteError: wf.quoteError,
  };
}

/** Map wallet/ethers rejection copy to localized withdraw feedback. */
export function formatWithdrawExecutionError(locale: string, message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return getWithdrawFlowMessages(locale).failed;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("action_rejected") ||
    lower.includes("request rejected")
  ) {
    return getWithdrawFlowMessages(locale).userRejected;
  }

  if (locale === "zh") {
    if (/withdrawal failed/i.test(trimmed) || trimmed === "Withdrawal failed") {
      return getWithdrawFlowMessages(locale).failed;
    }
  }

  return trimmed;
}
