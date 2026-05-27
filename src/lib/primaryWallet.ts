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
  /**
   * Privy 换账号后 wallets 尚未与 user 对齐：暂勿选路，避免误选上一用户的 embedded EOA。
   */
  awaitingWalletSync?: boolean;
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

  if (options?.preferEmbedded && options.awaitingWalletSync) {
    return undefined;
  }

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

  const privyWallets = wallets.filter((wallet) => wallet.walletClientType === "privy");
  const embeddedWallet = privyWallets[0];
  const externalWallet = wallets.find(
    (wallet) => wallet.walletClientType && wallet.walletClientType !== "privy"
  );

  if (options?.preferEmbedded) {
    // 有 user.wallet 锚点但未命中：勿回退「第一个 privy」，等待 Privy 同步
    if (normalizedPreferred) return undefined;
    if (privyWallets.length === 1) return privyWallets[0];
    if (privyWallets.length > 1) return undefined;
    return undefined;
  }

  if (externalWallet) return externalWallet;
  if (embeddedWallet) return embeddedWallet;

  return wallets[0];
}
