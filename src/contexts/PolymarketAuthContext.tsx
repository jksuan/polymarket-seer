"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
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

// --- Context Value Type ---
interface PolymarketAuthContextValue {
  ready: boolean;
  authenticated: boolean;
  user: any;
  login: () => void;
  handleLogout: () => Promise<void>;
  wallets: any[];
  walletAddress: string;
  setWalletAddress: (addr: string) => void;
  proxyAddress: string | null;
  setProxyAddress: (addr: string | null) => void;
  usdcBalance: string;
  setUsdcBalance: (bal: string) => void;
  isRefreshingBalance: boolean;
  fetchBalance: (showLoading?: boolean) => Promise<void>;
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
  const { createWallet } = useCreateWallet();

  const [walletAddress, setWalletAddress] = useState("");
  const [proxyAddress, setProxyAddress] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [hasCreds, setHasCreds] = useState(false);

  // --- 防护机制（Provider 级别） ---
  const isFetchingBalanceRef = useRef(false);
  const fetchBalanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriedCreateWalletRef = useRef(false);
  const hasTriedDeriveCredsRef = useRef(false); // 只尝试衍生一次

  // --- 完整退出登录：清除所有缓存 + 重置所有 ref ---
  const handleLogout = useCallback(async () => {
    // 1. 清除 localStorage 中的 CLOB creds
    clearCredsCache();
    // 2. 重置内存状态
    setWalletAddress("");
    setProxyAddress(null);
    setUsdcBalance("0.00");
    setHasCreds(false);
    // 3. 重置所有 ref，让下次登录时能重新触发
    hasTriedCreateWalletRef.current = false;
    hasTriedDeriveCredsRef.current = false;
    isFetchingBalanceRef.current = false;
    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
      fetchBalanceTimerRef.current = null;
    }
    // 4. 调用 Privy logout（清除 session/cookie/JWT）
    await logout();
    console.log("[退出登录] 已清除所有状态 ✅");
  }, [logout]);

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
  const fetchBalance = useCallback(async (showLoading = false) => {
    if (isFetchingBalanceRef.current || !authenticated || !wallets || wallets.length === 0) return;
    
    isFetchingBalanceRef.current = true;
    if (showLoading) setIsRefreshingBalance(true);

    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === user?.wallet?.address?.toLowerCase()) 
                     || wallets.find(w => w.walletClientType === "privy") 
                     || wallets[0];
      if (!wallet) throw new Error("No connected wallet found");

      setWalletAddress(wallet.address);
      
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();
      const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any);
      
      const derivedProxy = deriveSafe(wallet.address, SAFE_FACTORY_POLYGON);
      setProxyAddress(derivedProxy);

      let creds = getCachedCreds(wallet.address);

      if (!creds) {
         await new Promise(r => setTimeout(r, 200));
         creds = getCachedCreds(wallet.address);
      }

      // --- CLOB API Key 获取（仅一次）：先 derive 再 create ---
      // deriveApiKey 优先：老账号已有 Key，此处能直接拿到，不会报错。新账号会失败（抛出 400 Could not derive）。
      // createApiKey 备用：当 derive 失败且确定无 Key 时，发起注册。
      if (!creds && !hasTriedDeriveCredsRef.current) {
         hasTriedDeriveCredsRef.current = true;
         console.log("[CLOB] 缓存中无 API Key，尝试获取...");
         try {
            await wallet.switchChain(POLYGON_CHAIN_ID);
            // 第一步：尝试 deriveApiKey（针对老账号）
            try {
               creds = await clobClient.deriveApiKey();
               console.log("[CLOB] deriveApiKey 成功 ✅");
            } catch (deriveErr: any) {
               if (isUserRejection(deriveErr)) {
                  console.log("[CLOB] 用户拒绝签名");
               } else {
                  // 第二步：derive 失败时（通常是新账号没有 Key），尝试 createApiKey 注册
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

      // --- 余额查询 ---
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
            if (balanceData && balanceData.balance) {
               const formatted = ethers.utils.formatUnits(balanceData.balance, USDC_DECIMALS);
               setUsdcBalance(Number(formatted).toFixed(2));
            }
         } catch (balErr) {
            console.warn("[余额查询] CLOB 余额查询失败，回退到链上查询:", balErr);
         }
      } else {
         try {
            await wallet.switchChain(POLYGON_CHAIN_ID);
            const contract = new ethers.Contract(ADDRESSES.USDCe, ERC20_ABI, provider);
            const bal = await contract.balanceOf(wallet.address);
            if (bal) {
               setUsdcBalance(Number(ethers.utils.formatUnits(bal, USDC_DECIMALS)).toFixed(2));
            }
         } catch (fallbackErr) {
            console.log("[余额查询] 链上余额查询失败（全新账户正常现象），默认显示 $0.00");
            setUsdcBalance("0.00");
         }
      }
    } catch (err) {
      console.error("Balance fetch failed", err);
    } finally {
      isFetchingBalanceRef.current = false;
      if (showLoading) setIsRefreshingBalance(false);
    }
  }, [authenticated, wallets, user]);

  // === 门控层 + 防抖（外部钱包给更长延迟） ===
  useEffect(() => {
    if (!ready || !authenticated || !wallets || wallets.length === 0) return;

    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
    }

    // 外部钱包（非 privy embedded）需要更长的延迟等待就绪
    const hasExternalWallet = wallets.some(w => w.walletClientType !== "privy");
    const delay = hasExternalWallet ? 1500 : 300;

    fetchBalanceTimerRef.current = setTimeout(() => {
      fetchBalance();
    }, delay);

    return () => {
      if (fetchBalanceTimerRef.current) {
        clearTimeout(fetchBalanceTimerRef.current);
      }
    };
  }, [ready, wallets, authenticated, user, fetchBalance]);

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
    walletAddress,
    setWalletAddress,
    proxyAddress,
    setProxyAddress,
    usdcBalance,
    setUsdcBalance,
    isRefreshingBalance,
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
