export type WalletLike = {
  address: string;
  walletClientType?: string;
};

export function selectPrimaryWallet<T extends WalletLike>(
  wallets: T[] | undefined,
  preferredAddress?: string | null
): T | undefined {
  if (!wallets || wallets.length === 0) return undefined;

  const normalizedPreferred = preferredAddress?.toLowerCase();
  if (normalizedPreferred) {
    const matched = wallets.find(
      (wallet) => wallet.address.toLowerCase() === normalizedPreferred
    );
    if (matched) return matched;
  }

  // Prefer explicitly connected external wallets over embedded wallet.
  const externalWallet = wallets.find(
    (wallet) => wallet.walletClientType && wallet.walletClientType !== "privy"
  );
  if (externalWallet) return externalWallet;

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );
  if (embeddedWallet) return embeddedWallet;

  return wallets[0];
}
