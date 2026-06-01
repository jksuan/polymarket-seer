const STORAGE_KEY = "seer_funds_pending_transfer";

export type PendingTransferDeposit = {
  proxyAddress: string;
  bridgeStatusAddress: string;
  addressCreatedAtMs: number;
};

export function savePendingTransferDeposit(pending: PendingTransferDeposit): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // ignore quota errors
  }
}

export function readPendingTransferDeposit(): PendingTransferDeposit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingTransferDeposit;
    if (
      typeof parsed.proxyAddress !== "string" ||
      typeof parsed.bridgeStatusAddress !== "string"
    ) {
      return null;
    }
    return {
      proxyAddress: parsed.proxyAddress,
      bridgeStatusAddress: parsed.bridgeStatusAddress,
      addressCreatedAtMs: Number(parsed.addressCreatedAtMs) || 0,
    };
  } catch {
    return null;
  }
}

export function clearPendingTransferDeposit(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
