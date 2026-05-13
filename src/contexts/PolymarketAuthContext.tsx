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
import { getCachedCreds, setCachedCreds, clearCredsCache, shortenAddress } from "@/lib/utils";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { shouldSyncPrivyActiveWallet } from "@/lib/privyActiveWalletSync";
import { isAccountDrift, normalizeAddress } from "@/lib/accountSwitchGuard";

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
  /** 外链账户切换阻断中（账户与当前会话地址不一致） */
  isAccountSwitchBlocked: boolean;
  displayIdentifier: string;
  displayAvatar: string;
  hasCreds: boolean;
}

const PolymarketAuthContext = createContext<PolymarketAuthContextValue | null>(null);

// --- 判断是否为用户主动拒绝签名 ---
function isUserRejection(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("denied") || msg.includes("rejected") || msg.includes("user refused")
    || msg.includes("user cancelled") || msg.includes("user canceled");
}

// --- 判断是否为 CLOB 永久性失败（账户不存在） ---
function isPermanentClobFailure(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  const data = err?.response?.data || err?.data;
  const dataStr = JSON.stringify(data || "").toLowerCase();
  return msg.includes("could not derive api key") || dataStr.includes("could not derive api key")
    || msg.includes("could not create api key") || dataStr.includes("could not create api key");
}

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
  const [accountSwitchBlockOpen, setAccountSwitchBlockOpen] = useState(false);
  const [accountSwitchAwaitingRevert, setAccountSwitchAwaitingRevert] = useState(false);
  const [observedExternalAddress, setObservedExternalAddress] = useState<string | null>(null);
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
    setAccountSwitchBlockOpen(false);
    setAccountSwitchAwaitingRevert(false);
    setObservedExternalAddress(null);
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
    setAccountSwitchBlockOpen(false);
    setAccountSwitchAwaitingRevert(false);
    setObservedExternalAddress(null);
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

  const handleCancelSwitchToNewAccount = useCallback(() => {
    setAccountSwitchAwaitingRevert(true);
  }, []);

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

      let creds = getCachedCreds(wallet.address);

      if (!creds) {
        await new Promise((r) => setTimeout(r, 200));
        creds = getCachedCreds(wallet.address);
      }

      // --- CLOB API Key 获取（仅一次）：先 derive 再 create ---
      if (!creds && !hasTriedDeriveCredsRef.current) {
        hasTriedDeriveCredsRef.current = true;
        console.log("[CLOB] 缓存中无 API Key，尝试获取...");
        try {
          await wallet.switchChain(POLYGON_CHAIN_ID);
          try {
            creds = await clobClient.deriveApiKey();
            console.log("[CLOB] deriveApiKey 成功 ✅");
          } catch (deriveErr: any) {
            if (isUserRejection(deriveErr)) {
              console.log("[CLOB] 用户拒绝签名");
            } else {
              if (isPermanentClobFailure(deriveErr)) {
                console.log("[CLOB] 链上无可用 API Key（新账号），准备注册...");
              } else {
                console.log("[CLOB] deriveApiKey 发生未知错误，尝试备用注册...");
              }

              try {
                creds = await clobClient.createApiKey();
                console.log("[CLOB] createApiKey 成功 ✅");
              } catch (createErr: any) {
                if (isUserRejection(createErr)) {
                  console.log("[CLOB] 用户拒绝签名");
                } else if (isPermanentClobFailure(createErr)) {
                  console.log("[CLOB] 注册被拒绝。可能原因：账号在 Polygon 上无资金记录或未发生交互");
                } else {
                  console.log("[CLOB] 无法注册 API Key。原因：" + (createErr?.message || "未知报错"));
                }
              }
            }
          }
          if (creds && creds.key) {
            setCachedCreds(wallet.address, creds);
            setHasCreds(true);
            console.log("[CLOB] API Key 已生成并缓存");
          }
        } catch (keyErr: any) {
          console.warn("[CLOB] API Key 获取流程异常:", keyErr);
        }
      } else if (creds) {
        setHasCreds(true);
      }

      // --- 余额：优先 CLOB，失败或无有效数据则链上 USDC.e ---
      if (creds) {
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
          const bal = await contract.balanceOf(wallet.address);
          setUsdcBalance(Number(ethers.utils.formatUnits(bal, USDC_DECIMALS)).toFixed(2));
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

  // === 外链扩展账户切换检测（accountsChanged）===
  useEffect(() => {
    if (suppressAccountDrift) {
      clearAccountChangeDebounce();
      setAccountSwitchBlockOpen(false);
      setAccountSwitchAwaitingRevert(false);
      setObservedExternalAddress(null);
      return;
    }

    if (!ready || !authenticated || !sessionAddress || !Array.isArray(wallets) || wallets.length === 0) {
      setAccountSwitchBlockOpen(false);
      setAccountSwitchAwaitingRevert(false);
      setObservedExternalAddress(null);
      clearAccountChangeDebounce();
      return;
    }

    const primaryWallet = selectPrimaryWallet(wallets, user?.wallet?.address, {
      stickyClientType: stickyExternalWalletClientType,
    });
    if (!primaryWallet || !primaryWallet.walletClientType || primaryWallet.walletClientType === "privy") {
      setAccountSwitchBlockOpen(false);
      setAccountSwitchAwaitingRevert(false);
      setObservedExternalAddress(null);
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
          setObservedExternalAddress(candidate);
          setAccountSwitchBlockOpen(true);
          return;
        }
        setObservedExternalAddress(null);
        setAccountSwitchBlockOpen(false);
        setAccountSwitchAwaitingRevert(false);
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
    isAccountSwitchBlocked: accountSwitchBlockOpen,
    displayIdentifier,
    displayAvatar,
    hasCreds,
  };

  return (
    <PolymarketAuthContext.Provider value={value}>
      {children}
      {accountSwitchBlockOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950/95 p-6 shadow-2xl">
            <h2 className="text-white text-lg font-bold">检测到账户已变更</h2>
            {!accountSwitchAwaitingRevert ? (
              <p className="mt-2 text-sm text-zinc-300 leading-6">
                当前钱包地址与登录会话不一致。请选择登录新账户，或取消切换并在钱包中切回原账户。
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-300 leading-6">
                请在钱包中切回原账户后继续。切回成功后将自动恢复页面操作。
              </p>
            )}
            <div className="mt-4 space-y-1 text-xs text-zinc-400">
              <p>会话账户：{sessionAddress ? shortenAddress(sessionAddress) : "-"}</p>
              <p>当前钱包：{observedExternalAddress ? shortenAddress(observedExternalAddress) : "-"}</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  void handleReloginWithNewAccount();
                }}
                disabled={isReloginPending}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReloginPending ? "处理中..." : "登录新账户"}
              </button>
              <button
                type="button"
                onClick={handleCancelSwitchToNewAccount}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
              >
                取消切换，继续原账户
              </button>
            </div>
          </div>
        </div>
      )}
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
