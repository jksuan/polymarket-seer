export type WalletLike = {
  address: string;
  walletClientType?: string;
};

/** 主钱包选择：有 sticky 时禁止跨扩展、且不回退 embedded */
export type SelectPrimaryWalletOptions = {
  /**
   * 本会话已绑定的外链 walletClientType（建议小写存库）。
   * 有值且首选地址对不上时：只在该扩展下找；找不到则 undefined，不选其它扩展、不用 embedded。
   */
  stickyClientType?: string | null;
  /** embedded 会话：优先 privy，且无 embedded 时不回退外链 */
  preferEmbedded?: boolean;
};

function normalizeClientType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  return type.toLowerCase();
}

export function selectPrimaryWallet<T extends WalletLike>(
  wallets: T[] | undefined,
  preferredAddress?: string | null,
  options?: SelectPrimaryWalletOptions
): T | undefined {
  if (!wallets || wallets.length === 0) return undefined;

  const normalizedPreferred = preferredAddress?.toLowerCase();
  if (normalizedPreferred) {
    const matched = wallets.find(
      (wallet) => wallet.address.toLowerCase() === normalizedPreferred
    );
    if (matched) return matched;
  }

  const stickyRaw = options?.stickyClientType ?? null;
  const sticky = stickyRaw ? normalizeClientType(stickyRaw) : null;
  if (sticky) {
    const sameConnector = wallets.find((wallet) => {
      const t = normalizeClientType(wallet.walletClientType);
      return Boolean(t && t !== "privy" && t === sticky);
    });
    return sameConnector ?? undefined;
  }

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );
  const externalWallet = wallets.find(
    (wallet) => wallet.walletClientType && wallet.walletClientType !== "privy"
  );

  if (options?.preferEmbedded) {
    if (embeddedWallet) return embeddedWallet;
    return undefined;
  }

  if (externalWallet) return externalWallet;
  if (embeddedWallet) return embeddedWallet;

  return wallets[0];
}
