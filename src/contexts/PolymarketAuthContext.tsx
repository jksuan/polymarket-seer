"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { usePrivy, useWallets, useCreateWallet, useActiveWallet, useLogin } from "@privy-io/react-auth";

import { resolveAuthDisplayIdentity } from "@/auth/privyUserIdentity";
import { clearCredsCache } from "@/lib/utils";
import { selectPrimaryWallet, type SelectPrimaryWalletOptions } from "@/lib/primaryWallet";
import { shouldSyncPrivyActiveWallet } from "@/lib/privyActiveWalletSync";
import { disconnectExternalWallets } from "@/lib/disconnectExternalWallets";
import { clearWalletConnectStorage } from "@/lib/clearWalletConnectStorage";
import {
  hasMatchingEmbeddedWallet,
  normalizeAddress,
  walletListFingerprint,
} from "@/lib/accountSwitchGuard";
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

/** embedded 换账号后，wallets 指纹未变时仍尝试解除同步等待的毫秒数 */
const EMBEDDED_WALLET_SYNC_FALLBACK_MS = 1_500;
/** 换账号后 Privy 仍无法对齐 embedded 钱包时整页刷新（与 ADR-0005 external 登出 reload 同理） */
const EMBEDDED_WALLET_RELOAD_AFTER_MS = 12_000;

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
  const [awaitingEmbeddedWalletSync, setAwaitingEmbeddedWalletSync] = useState(false);

  const persistSessionMode = useCallback((mode: AuthSessionMode) => {
    setSessionMode(mode);
    writeStoredSessionMode(mode);
  }, []);

  const preferEmbedded = preferEmbeddedPrimaryWallet(sessionMode);
  const walletsAtUserSwitchRef = useRef("");
  const embeddedSwitchAtRef = useRef(0);
  const prevPrivyUserIdRef = useRef<string | null>(null);
  const embeddedReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmbeddedUnavailableAtRef = useRef(0);
  const primaryWalletOptions = useMemo(
    () => ({
      stickyClientType: stickyExternalWalletClientType,
      preferEmbedded,
      awaitingWalletSync: awaitingEmbeddedWalletSync,
    }),
    [stickyExternalWalletClientType, preferEmbedded, awaitingEmbeddedWalletSync]
  );

  const isEvmSignerReady = useMemo(
    () => Boolean(selectPrimaryWallet(wallets, user?.wallet?.address, primaryWalletOptions)),
    [wallets, user?.wallet?.address, primaryWalletOptions]
  );

  const sessionAddress = useMemo(() => normalizeAddress(user?.wallet?.address), [user?.wallet?.address]);
  const hasTriedCreateWalletRef = useRef(false);
  const clobAuthRejectionLogoutInFlightRef = useRef(false);
  const performSessionLogoutRef = useRef<() => Promise<void>>(async () => {});
  const { sessionEpoch, bumpSessionEpoch } = useSessionOverlays(authenticated);

  const clearEmbeddedReloadTimer = useCallback(() => {
    if (embeddedReloadTimerRef.current != null) {
      clearTimeout(embeddedReloadTimerRef.current);
      embeddedReloadTimerRef.current = null;
    }
  }, []);

  const scheduleEmbeddedWalletReloadFallback = useCallback(() => {
    if (typeof window === "undefined") return;
    clearEmbeddedReloadTimer();
    embeddedReloadTimerRef.current = setTimeout(() => {
      console.warn("[embedded 钱包] Privy 长时间未对齐，整页刷新以恢复 Signer EOA");
      window.location.reload();
    }, EMBEDDED_WALLET_RELOAD_AFTER_MS);
  }, [clearEmbeddedReloadTimer]);

  const beginEmbeddedWalletSync = useCallback(() => {
    walletsAtUserSwitchRef.current = walletListFingerprint(wallets);
    embeddedSwitchAtRef.current = Date.now();
    setAwaitingEmbeddedWalletSync(true);
    scheduleEmbeddedWalletReloadFallback();
  }, [wallets, scheduleEmbeddedWalletReloadFallback]);

  const finishEmbeddedWalletSync = useCallback(() => {
    setAwaitingEmbeddedWalletSync(false);
    clearEmbeddedReloadTimer();
  }, [clearEmbeddedReloadTimer]);

  const ensureEmbeddedWalletForUser = useCallback(() => {
    if (hasTriedCreateWalletRef.current) return;
    hasTriedCreateWalletRef.current = true;
    console.log("[自动钱包] embedded 会话缺少与当前 user 匹配的 Embedded Wallet，正在创建...");
    void createWallet()
      .then(() => console.log("[自动钱包] Embedded Wallet 创建成功"))
      .catch((err) => console.warn("[自动钱包] Embedded Wallet 创建失败（可能已存在）:", err));
  }, [createWallet]);

  const handleEmbeddedWalletUnavailable = useCallback(() => {
    const now = Date.now();
    if (now - lastEmbeddedUnavailableAtRef.current < 5_000) return;
    lastEmbeddedUnavailableAtRef.current = now;
    hasTriedCreateWalletRef.current = false;
    beginEmbeddedWalletSync();
    ensureEmbeddedWalletForUser();
  }, [beginEmbeddedWalletSync, ensureEmbeddedWalletForUser]);

  const handleClobAuthRejected = useCallback(async () => {
    if (clobAuthRejectionLogoutInFlightRef.current) return;
    clobAuthRejectionLogoutInFlightRef.current = true;
    try {
      await performSessionLogoutRef.current();
    } catch (err) {
      clobAuthRejectionLogoutInFlightRef.current = false;
      console.warn("[ClobAuth] 取消签名后登出失败:", err);
    }
  }, []);

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
    privyUserId: user?.id,
    stickyExternalWalletClientType,
    preferEmbeddedForPrimaryWallet: preferEmbedded,
    awaitingEmbeddedWalletSync,
    onEmbeddedWalletUnavailable: handleEmbeddedWalletUnavailable,
    onClobAuthRejected: () => {
      void handleClobAuthRejected();
    },
    setStickyExternalWalletClientType,
    setHasCreds,
    setWalletAddress,
    setProxyAddress,
  });

  const resetForPrivyUserSwitch = useCallback(() => {
    clearCredsCache();
    setWalletAddress("");
    setProxyAddress(null);
    setHasCreds(false);
    resetBalanceState();
    hasTriedCreateWalletRef.current = false;
    setStickyExternalWalletClientType(null);
    bumpSessionEpoch();
    beginEmbeddedWalletSync();
  }, [resetBalanceState, bumpSessionEpoch, beginEmbeddedWalletSync]);

  const { login } = useLogin({
    onComplete: ({ loginMethod }) => {
      const mode = loginMethodToSessionMode(loginMethod);
      if (mode) persistSessionMode(mode);
    },
  });

  useEffect(() => {
    const userId = user?.id ?? null;
    const prev = prevPrivyUserIdRef.current;
    if (prev !== null && userId !== null && prev !== userId) {
      resetForPrivyUserSwitch();
    }
    prevPrivyUserIdRef.current = userId;
  }, [user?.id, resetForPrivyUserSwitch]);

  useEffect(() => {
    if (!awaitingEmbeddedWalletSync || !preferEmbedded || !authenticated) return;

    const currentKey = walletListFingerprint(wallets);
    const walletsChanged = currentKey !== walletsAtUserSwitchRef.current;
    const userWalletInList = hasMatchingEmbeddedWallet(wallets, user?.wallet?.address);
    const elapsed = Date.now() - embeddedSwitchAtRef.current;

    if (userWalletInList && (walletsChanged || elapsed >= EMBEDDED_WALLET_SYNC_FALLBACK_MS)) {
      finishEmbeddedWalletSync();
    }
  }, [
    awaitingEmbeddedWalletSync,
    preferEmbedded,
    authenticated,
    wallets,
    user?.wallet?.address,
    finishEmbeddedWalletSync,
  ]);

  useEffect(() => {
    if (!ready || !authenticated || !user || sessionMode !== "embedded") return;
    if (hasMatchingEmbeddedWallet(wallets, user?.wallet?.address)) return;
    ensureEmbeddedWalletForUser();
  }, [ready, authenticated, user, wallets, sessionMode, ensureEmbeddedWalletForUser]);

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
    clearEmbeddedReloadTimer();
    clearCredsCache();
    setWalletAddress("");
    setProxyAddress(null);
    setHasCreds(false);
    resetBalanceState();
    hasTriedCreateWalletRef.current = false;
    setStickyExternalWalletClientType(null);
    setAwaitingEmbeddedWalletSync(false);
    setSessionMode(null);
    clearStoredSessionMode();
    if (modeForCleanup === "external") {
      await disconnectExternalWallets(wallets);
      await clearWalletConnectStorage();
    }
    await logout();
    console.log("[退出登录] 已清除所有状态 ✅");
    if (modeForCleanup === "embedded" && typeof window !== "undefined") {
      window.location.reload();
    }
  }, [logout, resetBalanceState, bumpSessionEpoch, sessionMode, wallets, clearEmbeddedReloadTimer]);

  performSessionLogoutRef.current = performSessionLogout;

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
    return () => {
      clearEmbeddedReloadTimer();
    };
  }, [clearEmbeddedReloadTimer]);

  useEffect(() => {
    if (!ready || !authenticated || !user || sessionMode !== "embedded") return;
    const hasEmbeddedWallet = wallets.some((w) => w.walletClientType === "privy");
    if (!hasEmbeddedWallet && !hasTriedCreateWalletRef.current) {
      ensureEmbeddedWalletForUser();
    }
  }, [ready, authenticated, user, wallets, sessionMode, ensureEmbeddedWalletForUser]);

  const { identifier: displayIdentifier, avatarUrl: displayAvatar } = useMemo(
    () =>
      resolveAuthDisplayIdentity(user, {
        sessionMode,
        walletAddress,
      }),
    [user, sessionMode, walletAddress]
  );

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
