export type PrivyWalletListEntry =
  | "metamask"
  | "coinbase_wallet"
  | "rainbow"
  | "detected_ethereum_wallets"
  | "wallet_connect"
  | "wallet_connect_qr";

export function isMobileUserAgent(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Android/i.test(userAgent);
}

export function isMobileWalletInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const hasInjected = Boolean((window as Window & { ethereum?: unknown }).ethereum);
  return isMobileUserAgent(navigator.userAgent) && hasInjected;
}

/** ADR-0005 §3：客户端 mount 后解析 walletList */
export function resolvePrivyWalletList(): PrivyWalletListEntry[] {
  if (typeof window === "undefined") {
    return ["metamask", "coinbase_wallet", "detected_ethereum_wallets", "wallet_connect_qr"];
  }

  if (isMobileWalletInAppBrowser()) {
    return ["metamask"];
  }

  if (isMobileUserAgent(navigator.userAgent)) {
    return ["metamask", "coinbase_wallet", "wallet_connect"];
  }

  return ["metamask", "coinbase_wallet", "detected_ethereum_wallets", "wallet_connect_qr"];
}
