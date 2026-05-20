"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { usePrivy, useWallets, useCreateWallet, useActiveWallet, useLogin } from "@privy-io/react-auth";

import { clearCredsCache, shortenAddress } from "@/lib/utils";
import { selectPrimaryWallet, type SelectPrimaryWalletOptions } from "@/lib/primaryWallet";
import { shouldSyncPrivyActiveWallet } from "@/lib/privyActiveWalletSync";
import { disconnectExternalWallets } from "@/lib/disconnectExternalWallets";
import { clearWalletConnectStorage } from "@/lib/clearWalletConnectStorage";
import { normalizeAddress } from "@/lib/accountSwitchGuard";
import {
  type AuthSessionMode,
  clearStoredSessionMode,
  inferSessionModeFromUser,
  loginMethodToSessionMode,
  preferEmbeddedPrimaryWallet,
  readStoredSessionMode,
  writeStoredSessionMode,
} from "@/auth/sessionMode";
import { useBalanceSync } from "@/auth/useBalanceSync";
import { useExternalAccountDrift } from "@/auth/useExternalAccountDrift";
import { useSessionOverlays } from "@/auth/useSessionOverlays";

interface PolymarketAuthContextValue {
  ready: boolean;
  authenticated: boolean;
  user: any;
  login: () => void;
  handleLogout: () => Promise<void>;
  wallets: any[];
  /** ADR-0005：本会话登录路线 */
  sessionMode: AuthSessionMode | null;
  stickyExternalWalletClientType: string | null;
  primaryWalletSelectOptions: SelectPrimaryWalletOptions;
  isEvmSignerReady: boolean;
  walletAddress: string;
  setWalletAddress: (addr: string) => void;
  proxyAddress: string | null;
  setProxyAddress: (addr: string | null) => void;
  usdcBalance: string;
  setUsdcBalance: (bal: string) => void;
  isRefreshingBalance: boolean;
  isInitialBalanceLoading: boolean;
  fetchBalance: (showLoading?: boolean) => Promise<boolean>;
  displayIdentifier: string;
  displayAvatar: string;
  hasCreds: boolean;
  sessionEpoch: number;
  /** ADR-0005：外链漂移登出后提示用户手动重登 */
  accountDriftRequiresRelogin: boolean;
  clearAccountDriftPrompt: () => void;
}

const PolymarketAuthContext = createContext<PolymarketAuthContextValue | null>(null);

export function PolymarketAuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { wallet: privyActiveWallet, setActiveWallet } = useActiveWallet();
  const { createWallet } = useCreateWallet();

  const [sessionMode, setSessionMode] = useState<AuthSessionMode | null>(() => readStoredSessionMode());
  const [walletAddress, setWalletAddress] = useState("");
  const [proxyAddress, setProxyAddress] = useState<string | null>(null);
  const [hasCreds, setHasCreds] = useState(false);
  const [stickyExternalWalletClientType, setStickyExternalWalletClientType] = useState<string | null>(null);

  const persistSessionMode = useCallback((mode: AuthSessionMode) => {
    setSessionMode(mode);
    writeStoredSessionMode(mode);
  }, []);

  const { login } = useLogin({
    onComplete: ({ loginMethod }) => {
      const mode = loginMethodToSessionMode(loginMethod);
      if (mode) persistSessionMode(mode);
    },
  });

  const preferEmbedded = preferEmbeddedPrimaryWallet(sessionMode);
  const primaryWalletOptions = useMemo(
    () => ({
      stickyClientType: stickyExternalWalletClientType,
      preferEmbedded,
    }),
    [stickyExternalWalletClientType, preferEmbedded]
  );

  const isEvmSignerReady = useMemo(
    () => Boolean(selectPrimaryWallet(wallets, user?.wallet?.address, primaryWalletOptions)),
    [wallets, user?.wallet?.address, primaryWalletOptions]
  );

  const sessionAddress = useMemo(() => normalizeAddress(user?.wallet?.address), [user?.wallet?.address]);
  const hasTriedCreateWalletRef = useRef(false);
  const { sessionEpoch, bumpSessionEpoch } = useSessionOverlays(authenticated);

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
    preferEmbeddedForPrimaryWallet: preferEmbedded,
    setStickyExternalWalletClientType,
    setHasCreds,
    setWalletAddress,
    setProxyAddress,
  });

  useEffect(() => {
    if (!authenticated) {
      setSessionMode(null);
      clearStoredSessionMode();
      return;
    }
    if (sessionMode) return;

    const stored = readStoredSessionMode();
    if (stored) {
      setSessionMode(stored);
      return;
    }

    const inferred = inferSessionModeFromUser(user);
    if (inferred) {
      persistSessionMode(inferred);
    }
  }, [authenticated, user, sessionMode, persistSessionMode]);

  useEffect(() => {
    if (!ready || !authenticated || !sessionAddress || sessionMode !== "external") return;
    if (stickyExternalWalletClientType || !Array.isArray(wallets) || wallets.length === 0) return;

    const matchedExternal = wallets.find((w) => {
      if (!w.walletClientType || w.walletClientType === "privy") return false;
      return normalizeAddress(w.address) === sessionAddress;
    });
    if (matchedExternal?.walletClientType) {
      setStickyExternalWalletClientType(matchedExternal.walletClientType.toLowerCase());
    }
  }, [ready, authenticated, sessionAddress, sessionMode, wallets, stickyExternalWalletClientType]);

  const performSessionLogout = useCallback(async () => {
    const modeForCleanup = sessionMode ?? readStoredSessionMode();
    bumpSessionEpoch();
    clearCredsCache();
    setWalletAddress("");
    setProxyAddress(null);
    setHasCreds(false);
    resetBalanceState();
    hasTriedCreateWalletRef.current = false;
    setStickyExternalWalletClientType(null);
    setSessionMode(null);
    clearStoredSessionMode();
    if (modeForCleanup === "external") {
      await disconnectExternalWallets(wallets);
      await clearWalletConnectStorage();
    }
    await logout();
    console.log("[退出登录] 已清除所有状态 ✅");
  }, [logout, resetBalanceState, bumpSessionEpoch, sessionMode, wallets]);

  const {
    accountDriftRequiresRelogin,
    clearAccountChangeDebounce,
    clearAccountDriftPrompt,
    resetReloginState,
  } = useExternalAccountDrift({
    ready,
    authenticated,
    sessionMode,
    user,
    wallets,
    sessionAddress,
    stickyExternalWalletClientType,
    performLogout: performSessionLogout,
  });

  useEffect(() => {
    if (!ready || !authenticated || !Array.isArray(wallets) || wallets.length === 0) return;
    if (preferEmbedded && !wallets.some((w) => w.walletClientType === "privy")) return;

    const desired = selectPrimaryWallet(wallets, user?.wallet?.address, primaryWalletOptions);
    if (!shouldSyncPrivyActiveWallet(privyActiveWallet?.address, desired)) return;

    setActiveWallet(desired);
  }, [
    ready,
    authenticated,
    wallets,
    user?.wallet?.address,
    primaryWalletOptions,
    preferEmbedded,
    privyActiveWallet?.address,
    setActiveWallet,
  ]);

  const handleLogout = useCallback(async () => {
    clearAccountChangeDebounce();
    resetReloginState();
    await performSessionLogout();
  }, [clearAccountChangeDebounce, resetReloginState, performSessionLogout]);

  useEffect(() => {
    if (!ready || !authenticated || !user || sessionMode !== "embedded") return;
    const hasEmbeddedWallet = wallets.some((w) => w.walletClientType === "privy");
    if (!hasEmbeddedWallet && !hasTriedCreateWalletRef.current) {
      hasTriedCreateWalletRef.current = true;
      console.log("[自动钱包] embedded 会话无 Embedded Wallet，正在创建...");
      createWallet()
        .then(() => console.log("[自动钱包] Embedded Wallet 创建成功"))
        .catch((err) => console.warn("[自动钱包] Embedded Wallet 创建失败（可能已存在）:", err));
    }
  }, [ready, authenticated, user, wallets, createWallet, sessionMode]);

  const displayIdentifier = user?.twitter?.username
    ? `@${user.twitter.username}`
    : user?.google?.email
      ? user.google.email
      : user?.email?.address
        ? user.email.address
        : walletAddress
          ? shortenAddress(walletAddress)
          : "Wallet Connected";

  const displayAvatar =
    user?.twitter?.profilePictureUrl ||
    `https://api.dicebear.com/7.x/pixel-art/svg?seed=${walletAddress || "default"}`;

  const value: PolymarketAuthContextValue = {
    ready,
    authenticated,
    user,
    login,
    handleLogout,
    wallets,
    sessionMode,
    stickyExternalWalletClientType,
    primaryWalletSelectOptions: primaryWalletOptions,
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
    sessionEpoch,
    accountDriftRequiresRelogin,
    clearAccountDriftPrompt,
  };

  return (
    <PolymarketAuthContext.Provider value={value}>
      {children}
    </PolymarketAuthContext.Provider>
  );
}

export function usePolymarketAuth(): PolymarketAuthContextValue {
  const ctx = useContext(PolymarketAuthContext);
  if (!ctx) {
    throw new Error("usePolymarketAuth must be used within a <PolymarketAuthProvider>");
  }
  return ctx;
}
