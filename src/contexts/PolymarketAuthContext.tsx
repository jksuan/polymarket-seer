"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { usePrivy, useWallets, useCreateWallet, useActiveWallet } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { ClobClient } from "@polymarket/clob-client";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";

import {
  POLYGON_CHAIN_ID,
  CLOB_API_URL,
  SAFE_FACTORY_POLYGON,
  ADDRESSES,
  USDC_DECIMALS,
  ERC20_ABI,
  SIGNATURE_TYPE_GNOSIS_SAFE,
} from "@/lib/constants";
import {
  getCachedCreds,
  setCachedCreds,
  clearCredsCache,
  clearCachedCredsForWallet,
  shortenAddress,
} from "@/lib/utils";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { shouldSyncPrivyActiveWallet } from "@/lib/privyActiveWalletSync";
import { isAccountDrift, normalizeAddress } from "@/lib/accountSwitchGuard";
import { isValidApiKeyCreds } from "@/lib/clobApiKeyCreds";
import { resolveClobApiKeyCreds } from "@/auth/resolveClobApiKeyCreds";

/** 首次进入后拉余额的最大尝试次数（含第一次） */
const BALANCE_INITIAL_MAX_ATTEMPTS = 4;
/** 静默刷新间隔：网络恢复后可自动对齐余额 */
const BALANCE_SILENT_REFRESH_INTERVAL_MS = 90_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isInitialBalanceLoading, setIsInitialBalanceLoading] = useState(false);
  const [hasCreds, setHasCreds] = useState(false);
  const [stickyExternalWalletClientType, setStickyExternalWalletClientType] = useState<string | null>(null);
  const [isReloginPending, setIsReloginPending] = useState(false);
  const [reloginRequested, setReloginRequested] = useState(false);
  /** 重登流程中暂停漂移检测，避免登出窗口期内再次弹出阻断层 */
  const [suppressAccountDrift, setSuppressAccountDrift] = useState(false);

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

  // --- 防护机制（Provider 级别） ---
  const isFetchingBalanceRef = useRef(false);
  const fetchBalanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silentRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriedCreateWalletRef = useRef(false);
  const hasTriedDeriveCredsRef = useRef(false); // 只尝试衍生一次
  const accountChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevAuthenticatedRef = useRef<boolean | null>(null);
  const reloginAfterExternalDriftRef = useRef<() => Promise<void>>(async () => {});

  const clearAccountChangeDebounce = useCallback(() => {
    if (accountChangeDebounceRef.current) {
      clearTimeout(accountChangeDebounceRef.current);
      accountChangeDebounceRef.current = null;
    }
  }, []);

  // --- 完整退出登录：清除所有缓存 + 重置所有 ref ---
  const handleLogout = useCallback(async () => {
    // 1. 清除 localStorage 中的 CLOB creds
    clearCredsCache();
    // 2. 重置内存状态
    setWalletAddress("");
    setProxyAddress(null);
    setUsdcBalance("0.00");
    setHasCreds(false);
    setIsInitialBalanceLoading(false);
    if (silentRefreshIntervalRef.current != null) {
      clearInterval(silentRefreshIntervalRef.current);
      silentRefreshIntervalRef.current = null;
    }
    // 3. 重置所有 ref，让下次登录时能重新触发
    hasTriedCreateWalletRef.current = false;
    hasTriedDeriveCredsRef.current = false;
    isFetchingBalanceRef.current = false;
    setStickyExternalWalletClientType(null);
    clearAccountChangeDebounce();
    setIsReloginPending(false);
    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
      fetchBalanceTimerRef.current = null;
    }
    // 4. 调用 Privy logout（清除 session/cookie/JWT）
    await logout();
    console.log("[退出登录] 已清除所有状态 ✅");
  }, [logout, clearAccountChangeDebounce]);

  const handleReloginWithNewAccount = useCallback(async () => {
    if (isReloginPending) return;
    setSuppressAccountDrift(true);
    clearAccountChangeDebounce();
    setIsReloginPending(true);
    try {
      await handleLogout();
      setReloginRequested(true);
    } catch (error) {
      console.warn("[账户切换检测] 重新登录流程失败:", error);
      setIsReloginPending(false);
      setSuppressAccountDrift(false);
    }
  }, [handleLogout, isReloginPending, clearAccountChangeDebounce]);

  useEffect(() => {
    reloginAfterExternalDriftRef.current = handleReloginWithNewAccount;
  }, [handleReloginWithNewAccount]);

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

  // --- 核心拉取和状态验证方法 ---
  const fetchBalance = useCallback(async (showLoading = false): Promise<boolean> => {
    if (isFetchingBalanceRef.current || !authenticated || !wallets || wallets.length === 0) return false;

    isFetchingBalanceRef.current = true;
    if (showLoading) setIsRefreshingBalance(true);

    let readOk = false;

    try {
      const wallet = selectPrimaryWallet(wallets, user?.wallet?.address, {
        stickyClientType: stickyExternalWalletClientType,
      });
      if (!wallet) {
        setHasCreds(false);
        setUsdcBalance("0.00");
        return false;
      }

      if (wallet.walletClientType && wallet.walletClientType !== "privy") {
        setStickyExternalWalletClientType(wallet.walletClientType.toLowerCase());
      } else {
        setStickyExternalWalletClientType(null);
      }

      setWalletAddress(wallet.address);

      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();
      const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any);

      const derivedProxy = deriveSafe(wallet.address, SAFE_FACTORY_POLYGON);
      setProxyAddress(derivedProxy);

      if (!getCachedCreds(wallet.address)) {
        await new Promise((r) => setTimeout(r, 200));
      }

      const { creds, hasCreds: resolvedHasCreds } = await resolveClobApiKeyCreds({
        walletAddress: wallet.address,
        getCachedCreds,
        clearCachedCredsForWallet,
        setCachedCreds,
        switchChain: () => wallet.switchChain(POLYGON_CHAIN_ID),
        clobClient,
        hasAttemptedDerive: hasTriedDeriveCredsRef.current,
        markDeriveAttempted: () => {
          hasTriedDeriveCredsRef.current = true;
        },
      });
      setHasCreds(resolvedHasCreds);

      // --- 余额：优先 CLOB，失败或无有效数据则链上 USDC.e（读 proxy Safe）---
      if (isValidApiKeyCreds(creds)) {
        const clobWithCreds = new ClobClient(
          CLOB_API_URL,
          POLYGON_CHAIN_ID,
          signer as any,
          creds,
          SIGNATURE_TYPE_GNOSIS_SAFE,
          derivedProxy
        );
        try {
          const balanceData = await clobWithCreds.getBalanceAllowance({ asset_type: "COLLATERAL" as any });
          if (balanceData != null && balanceData.balance != null && balanceData.balance !== undefined) {
            const formatted = ethers.utils.formatUnits(balanceData.balance, USDC_DECIMALS);
            setUsdcBalance(Number(formatted).toFixed(2));
            readOk = true;
          }
        } catch (balErr) {
          console.warn("[余额查询] CLOB 余额查询失败，尝试链上查询:", balErr);
        }
      }

      if (!readOk) {
        try {
          await wallet.switchChain(POLYGON_CHAIN_ID);
          const contract = new ethers.Contract(ADDRESSES.USDCe, ERC20_ABI, provider);
          const proxyBal = await contract.balanceOf(derivedProxy);
          setUsdcBalance(Number(ethers.utils.formatUnits(proxyBal, USDC_DECIMALS)).toFixed(2));
          readOk = true;
        } catch (fallbackErr) {
          console.log("[余额查询] 链上余额查询失败:", fallbackErr);
          setUsdcBalance("0.00");
        }
      }
    } catch (err) {
      console.error("Balance fetch failed", err);
      readOk = false;
    } finally {
      isFetchingBalanceRef.current = false;
      if (showLoading) setIsRefreshingBalance(false);
    }

    return readOk;
  }, [authenticated, wallets, user, stickyExternalWalletClientType]);

  // === 门控层 + 防抖 + 首拉指数退避重试 ===
  useEffect(() => {
    if (!ready || !authenticated || !wallets || wallets.length === 0) {
      setIsInitialBalanceLoading(false);
      return;
    }

    setIsInitialBalanceLoading(true);

    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
    }

    const hasExternalWallet = wallets.some((w) => w.walletClientType !== "privy");
    const delay = hasExternalWallet ? 1500 : 300;

    let cancelled = false;

    fetchBalanceTimerRef.current = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        let ok = false;
        for (let attempt = 0; attempt < BALANCE_INITIAL_MAX_ATTEMPTS && !ok && !cancelled; attempt += 1) {
          ok = await fetchBalance(false);
          if (ok || cancelled) break;
          const backoffMs = Math.min(1000 * 2 ** attempt, 8000);
          await sleep(backoffMs);
        }
        if (!cancelled) setIsInitialBalanceLoading(false);
      })();
    }, delay);

    return () => {
      cancelled = true;
      if (fetchBalanceTimerRef.current) {
        clearTimeout(fetchBalanceTimerRef.current);
        fetchBalanceTimerRef.current = null;
      }
      setIsInitialBalanceLoading(false);
    };
  }, [ready, wallets, authenticated, user, fetchBalance]);

  // === 低频静默刷新（不打断顶栏首拉状态） ===
  useEffect(() => {
    if (!ready || !authenticated || !wallets || wallets.length === 0) {
      if (silentRefreshIntervalRef.current != null) {
        clearInterval(silentRefreshIntervalRef.current);
        silentRefreshIntervalRef.current = null;
      }
      return;
    }

    if (silentRefreshIntervalRef.current != null) {
      clearInterval(silentRefreshIntervalRef.current);
    }

    silentRefreshIntervalRef.current = setInterval(() => {
      void fetchBalance(false);
    }, BALANCE_SILENT_REFRESH_INTERVAL_MS);

    return () => {
      if (silentRefreshIntervalRef.current != null) {
        clearInterval(silentRefreshIntervalRef.current);
        silentRefreshIntervalRef.current = null;
      }
    };
  }, [ready, authenticated, wallets, fetchBalance]);

  // === 状态驱动自动重登：登出完成（authenticated=false）后自动触发 login ===
  useEffect(() => {
    if (!reloginRequested || !ready || authenticated) return;
    login();
    setReloginRequested(false);
    setIsReloginPending(false);
  }, [reloginRequested, ready, authenticated, login]);

  // === 重登完成后恢复漂移检测（仅在一次「未登录 -> 已登录」跃迁时解除抑制）===
  useEffect(() => {
    if (prevAuthenticatedRef.current === null) {
      prevAuthenticatedRef.current = authenticated;
      return;
    }
    const prev = prevAuthenticatedRef.current;
    prevAuthenticatedRef.current = authenticated;
    if (prev === false && authenticated && user) {
      setSuppressAccountDrift(false);
    }
  }, [authenticated, user]);

  // === 外链扩展账户切换检测（accountsChanged）：漂移后与 Polymarket 一致，自动登出并拉起登录 ===
  useEffect(() => {
    if (suppressAccountDrift) {
      clearAccountChangeDebounce();
      return;
    }

    if (!ready || !authenticated || !sessionAddress || !Array.isArray(wallets) || wallets.length === 0) {
      clearAccountChangeDebounce();
      return;
    }

    const primaryWallet = selectPrimaryWallet(wallets, user?.wallet?.address, {
      stickyClientType: stickyExternalWalletClientType,
    });
    if (!primaryWallet || !primaryWallet.walletClientType || primaryWallet.walletClientType === "privy") {
      return;
    }

    let cancelled = false;
    type EthereumProviderLike = {
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
      request?: (args: { method: string }) => Promise<unknown>;
    };

    const processAccountCandidate = (candidate: string | null) => {
      if (cancelled || !sessionAddress || !candidate) return;
      if (accountChangeDebounceRef.current) {
        clearTimeout(accountChangeDebounceRef.current);
      }
      accountChangeDebounceRef.current = setTimeout(() => {
        if (cancelled) return;
        if (isAccountDrift(sessionAddress, candidate)) {
          void reloginAfterExternalDriftRef.current();
        }
      }, 300);
    };

    let provider: EthereumProviderLike | null = null;
    const accountsChangedHandler = (accounts: string[]) => {
      const latest = normalizeAddress(accounts?.[0]);
      processAccountCandidate(latest);
    };

    void (async () => {
      try {
        provider = (await primaryWallet.getEthereumProvider()) as EthereumProviderLike;
        if (cancelled || !provider) return;
        provider.on?.("accountsChanged", accountsChangedHandler);
        const initialAccounts = await provider.request?.({ method: "eth_accounts" });
        const initial = Array.isArray(initialAccounts) ? normalizeAddress(initialAccounts[0]) : null;
        processAccountCandidate(initial);
      } catch (error) {
        console.warn("[账户切换检测] 监听 provider 失败:", error);
      }
    })();

    return () => {
      cancelled = true;
      clearAccountChangeDebounce();
      provider?.removeListener?.("accountsChanged", accountsChangedHandler);
    };
  }, [
    ready,
    authenticated,
    wallets,
    sessionAddress,
    user?.wallet?.address,
    stickyExternalWalletClientType,
    suppressAccountDrift,
    clearAccountChangeDebounce,
  ]);

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
