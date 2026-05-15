import type { BridgeTransaction } from "@/types/bridge";
import { isBridgeCompletedStatus } from "./status";

const BRIDGE_STATUS_FALLBACK_BEFORE_SUBMIT_MS = 45_000;
const BRIDGE_STATUS_FALLBACK_AFTER_SUBMIT_MS = 10 * 60_000;

export function computeDepositBridgeComplete(params: {
  hasSubmittedTx: boolean;
  transferAddress: string;
  executionTxHash: string;
  executionSubmittedAtMs: number;
  transactions: BridgeTransaction[] | undefined;
}): boolean {
  const transactions = params.transactions ?? [];
  const normalizeHash = (hash?: string) => hash?.trim().toLowerCase();
  const submittedTxHash = normalizeHash(params.executionTxHash);
  let currentSubmissionTransaction: BridgeTransaction | undefined;

  if (submittedTxHash) {
    currentSubmissionTransaction = transactions.find(
      (tx) => normalizeHash(tx.txHash) === submittedTxHash
    );
  }

  if (!currentSubmissionTransaction) {
    const lowerBound =
      params.executionSubmittedAtMs > 0
        ? params.executionSubmittedAtMs - BRIDGE_STATUS_FALLBACK_BEFORE_SUBMIT_MS
        : 0;
    const upperBound =
      params.executionSubmittedAtMs > 0
        ? params.executionSubmittedAtMs + BRIDGE_STATUS_FALLBACK_AFTER_SUBMIT_MS
        : Number.POSITIVE_INFINITY;
    const fallbackCandidates = transactions.filter((tx) => {
      if (params.executionSubmittedAtMs <= 0) return true;
      const createdTimeMs = Number(tx.createdTimeMs ?? 0);
      if (!Number.isFinite(createdTimeMs) || createdTimeMs <= 0) return false;
      return createdTimeMs >= lowerBound && createdTimeMs <= upperBound;
    });
    currentSubmissionTransaction = fallbackCandidates.reduce<BridgeTransaction | undefined>(
      (latest, tx) => {
        if (!latest) return tx;
        const latestTime = Number(latest.createdTimeMs ?? 0);
        const txTime = Number(tx.createdTimeMs ?? 0);
        return txTime >= latestTime ? tx : latest;
      },
      undefined
    );
  }

  return Boolean(
    params.hasSubmittedTx &&
      params.transferAddress &&
      isBridgeCompletedStatus(currentSubmissionTransaction?.status)
  );
}
