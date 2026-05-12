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

  // 无 sticky：首次解析，外链优先再 embedded
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
