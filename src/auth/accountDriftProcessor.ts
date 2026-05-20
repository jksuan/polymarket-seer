import { isAccountDrift } from "@/lib/accountSwitchGuard";

/** 外链 accountsChanged 防抖间隔，与 ADR-0005 一致 */
export const EXTERNAL_ACCOUNT_DRIFT_DEBOUNCE_MS = 300;

export function createAccountDriftProcessor(options: {
  sessionAddress: string | null;
  onDriftDetected: () => void;
  debounceMs?: number;
  getIsCancelled?: () => boolean;
}): {
  processAccountCandidate: (candidate: string | null) => void;
  clearDebounce: () => void;
} {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debounceMs = options.debounceMs ?? EXTERNAL_ACCOUNT_DRIFT_DEBOUNCE_MS;

  const clearDebounce = () => {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const processAccountCandidate = (candidate: string | null) => {
    if (options.getIsCancelled?.()) return;
    if (!options.sessionAddress || !candidate) return;

    clearDebounce();
    debounceTimer = setTimeout(() => {
      if (options.getIsCancelled?.()) return;
      if (isAccountDrift(options.sessionAddress, candidate)) {
        options.onDriftDetected();
      }
    }, debounceMs);
  };

  return { processAccountCandidate, clearDebounce };
}
