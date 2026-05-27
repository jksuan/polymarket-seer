export function normalizeAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  return address.toLowerCase();
}

export type WalletFingerprintLike = {
  walletClientType?: string;
  address: string;
};

export function walletListFingerprint(wallets: WalletFingerprintLike[] | undefined): string {
  return (wallets ?? [])
    .map((w) => `${w.walletClientType ?? ""}:${w.address.toLowerCase()}`)
    .join("|");
}

export function hasMatchingEmbeddedWallet(
  wallets: WalletFingerprintLike[] | undefined,
  userWalletAddress: string | null | undefined
): boolean {
  const userWallet = normalizeAddress(userWalletAddress);
  if (!userWallet) return false;
  return (wallets ?? []).some(
    (w) => w.walletClientType === "privy" && normalizeAddress(w.address) === userWallet
  );
}

/** Privy 换账号后 useWallets 残留对象签名时的典型报错 */
export function isEmbeddedWalletUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("No embedded or connected wallet found");
}

export function isAccountDrift(
  sessionAddress: string | null | undefined,
  currentExternalAddress: string | null | undefined
): boolean {
  const session = normalizeAddress(sessionAddress);
  const current = normalizeAddress(currentExternalAddress);
  if (!session || !current) return false;
  return session !== current;
}
