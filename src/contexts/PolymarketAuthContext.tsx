"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { usePrivy, useWallets, useCreateWallet, useActiveWallet } from "@privy-io/react-auth";

import { clearCredsCache, shortenAddress } from "@/lib/utils";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { shouldSyncPrivyActiveWallet } from "@/lib/privyActiveWalletSync";
import { normalizeAddress } from "@/lib/accountSwitchGuard";
import { useBalanceSync } from "@/auth/useBalanceSync";
import { useExternalAccountDrift } from "@/auth/useExternalAccountDrift";

// --- Context Value Type ---
interface PolymarketAuthContextValue {
  ready: boolean;
  authenticated: boolean;
  user: any;
  login: () => void;
  handleLogout: () => Promise<void>;
  wallets: any[];
  /** 本会话锁定的外链 walletClientType（小写），用于主钱包选择不跨扩展 */
  stickyExternalWalletClientType: string | null;
  /** 与 fetchBalance 选主逻辑一致：当前是否解析得到用于 EVM 签名的主钱包 */
  isEvmSignerReady: boolean;
  walletAddress: string;
  setWalletAddress: (addr: string) => void;
  proxyAddress: string | null;
  setProxyAddress: (addr: string | null) => void;
  usdcBalance: string;
  setUsdcBalance: (bal: string) => void;
  isRefreshingBalance: boolean;
  /** 首屏/钱包就绪后的首次余额拉取进行中（顶栏转圈） */
  isInitialBalanceLoading: boolean;
  /** 拉取余额；返回是否从 CLOB 或链上成功读到（用于重试） */
  fetchBalance: (showLoading?: boolean) => Promise<boolean>;
  displayIdentifier: string;
  displayAvatar: string;
  hasCreds: boolean;
}

const PolymarketAuthContext = createContext<PolymarketAuthContextValue | null>(null);

// --- Provider ---
export function PolymarketAuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { wallet: privyActiveWallet, setActiveWallet } = useActiveWallet();
  const { createWallet } = useCreateWallet();

  const [walletAddress, setWalletAddress] = useState("");
  const [proxyAddress, setProxyAddress] = useState<string | null>(null);
  const [hasCreds, setHasCreds] = useState(false);
  const [stickyExternalWalletClientType, setStickyExternalWalletClientType] = useState<string | null>(null);

  const isEvmSignerReady = useMemo(
    () =>
      Boolean(
        selectPrimaryWallet(wallets, user?.wallet?.address, {
          stickyClientType: stickyExternalWalletClientType,
        })
      ),
    [wallets, user?.wallet?.address, stickyExternalWalletClientType]
  );
  const sessionAddress = useMemo(() => normalizeAddress(user?.wallet?.address), [user?.wallet?.address]);
  const hasTriedCreateWalletRef = useRef(false);

  const {
    usdcBalance,
    setUsdcBalance,
    isRefreshingBalance,
    isInitialBalanceLoading,
    fetchBalance,
    resetBalanceState,
  } = useBalanceSync({
    ready,
    authenticated,
    wallets,
    userWalletAddress: user?.wallet?.address,
    stickyExternalWalletClientType,
    setStickyExternalWalletClientType,
    setHasCreds,
    setWalletAddress,
    setProxyAddress,
  });

  const performSessionLogout = useCallback(async () => {
    clearCredsCache();
    setWalletAddress("");
    setProxyAddress(null);
    setHasCreds(false);
    resetBalanceState();
    hasTriedCreateWalletRef.current = false;
    setStickyExternalWalletClientType(null);
    await logout();
    console.log("[退出登录] 已清除所有状态 ✅");
  }, [logout, resetBalanceState]);

  const { clearAccountChangeDebounce, resetReloginState } = useExternalAccountDrift({
    ready,
    authenticated,
    user,
    wallets,
    sessionAddress,
    stickyExternalWalletClientType,
    login,
    performLogout: performSessionLogout,
  });

  // --- 与 Privy active wallet 对齐：选主结果与 SDK 当前 active 地址不一致时显式 setActiveWallet ---
  useEffect(() => {
    if (!ready || !authenticated || !Array.isArray(wallets) || wallets.length === 0) return;

    const desired = selectPrimaryWallet(wallets, user?.wallet?.address, {
      stickyClientType: stickyExternalWalletClientType,
    });

    if (!shouldSyncPrivyActiveWallet(privyActiveWallet?.address, desired)) return;

    setActiveWallet(desired);
  }, [
    ready,
    authenticated,
    wallets,
    user?.wallet?.address,
    stickyExternalWalletClientType,
    privyActiveWallet?.address,
    setActiveWallet,
  ]);

  const handleLogout = useCallback(async () => {
    clearAccountChangeDebounce();
    resetReloginState();
    await performSessionLogout();
  }, [clearAccountChangeDebounce, resetReloginState, performSessionLogout]);

  // --- 自动为社交登录用户创建 Embedded Wallet ---
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    const hasEmbeddedWallet = wallets.some(w => w.walletClientType === "privy");
    if (!hasEmbeddedWallet && !hasTriedCreateWalletRef.current) {
      hasTriedCreateWalletRef.current = true;
      console.log("[自动钱包] 社交登录用户无 Embedded Wallet，正在创建...");
      createWallet()
        .then(() => console.log("[自动钱包] Embedded Wallet 创建成功"))
        .catch(err => console.warn("[自动钱包] Embedded Wallet 创建失败（可能已存在）:", err));
    }
  }, [ready, authenticated, user, wallets, createWallet]);

  // Derived Values — Google 登录时 email 存在 user.google.email 而非 user.email.address
  const displayIdentifier = user?.twitter?.username 
    ? `@${user.twitter.username}`
    : user?.google?.email
      ? user.google.email
      : user?.email?.address
        ? user.email.address
        : walletAddress 
          ? shortenAddress(walletAddress)
          : "Wallet Connected";

  const displayAvatar = user?.twitter?.profilePictureUrl 
    || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${walletAddress || "default"}`;

  const value: PolymarketAuthContextValue = {
    ready,
    authenticated,
    user,
    login,
    handleLogout,
    wallets,
    stickyExternalWalletClientType,
    isEvmSignerReady,
    walletAddress,
    setWalletAddress,
    proxyAddress,
    setProxyAddress,
    usdcBalance,
    setUsdcBalance,
    isRefreshingBalance,
    isInitialBalanceLoading,
    fetchBalance,
    displayIdentifier,
    displayAvatar,
    hasCreds,
  };

  return (
    <PolymarketAuthContext.Provider value={value}>
      {children}
    </PolymarketAuthContext.Provider>
  );
}

// --- Consumer Hook ---
export function usePolymarketAuth(): PolymarketAuthContextValue {
  const ctx = useContext(PolymarketAuthContext);
  if (!ctx) {
    throw new Error("usePolymarketAuth must be used within a <PolymarketAuthProvider>");
  }
  return ctx;
}
