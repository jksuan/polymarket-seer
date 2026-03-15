"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import { getCachedCreds, setCachedCreds, shortenAddress } from "@/lib/utils";

// --- Custom Hook ---
export function usePolymarketAuth() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const [walletAddress, setWalletAddress] = useState("");
  const [proxyAddress, setProxyAddress] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  // --- 三层防护：防止签名竞态 ---
  const isFetchingBalanceRef = useRef(false);
  const fetchBalanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriedCreateWalletRef = useRef(false);
  const hasTriedDeriveCredsRef = useRef(false); // 新增：防止对全新账户反复弹签名框

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
    
    // 锁层：fetchBalance 是否正在执行
    isFetchingBalanceRef.current = true;
    if (showLoading) setIsRefreshingBalance(true);

    try {
      // 优先取 privy 托管钱包，或者 fallback 到任意 connected 钱包
      const wallet = wallets.find(w => w.address.toLowerCase() === user?.wallet?.address?.toLowerCase()) 
                     || wallets.find(w => w.walletClientType === "privy") 
                     || wallets[0];
      if (!wallet) throw new Error("No connected wallet found");

      setWalletAddress(wallet.address);
      
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();
      const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any);
      
      // 1. 计算 Proxy 地址
      const derivedProxy = deriveSafe(wallet.address, SAFE_FACTORY_POLYGON);
      setProxyAddress(derivedProxy);

      // 2. 加载或衍生 API 凭证
      let creds = getCachedCreds(wallet.address);

      if (!creds) {
         // === 缓存层 ===：弹签名框前最后一刻，再检查一次缓存（防止并发写入后未读到）
         await new Promise(r => setTimeout(r, 200));
         creds = getCachedCreds(wallet.address);
      }

      if (!creds && !hasTriedDeriveCredsRef.current) {
         hasTriedDeriveCredsRef.current = true; // 标记只尝试一次
         // 确认此刻仍然没有缓存，才发起签名请求
         console.log("[三层防护] 缓存中无 API Key，尝试衍生...");
         try {
            await wallet.switchChain(POLYGON_CHAIN_ID);
            // 优先尝试 derive（适用于已存在 API Key 的账户，只需一次签名）
            try {
               creds = await clobClient.deriveApiKey();
               console.log("[三层防护] deriveApiKey 成功（仅一次签名）");
            } catch (deriveErr) {
               // derive 失败，尝试 create（全新账户注册场景）
               console.log("[三层防护] deriveApiKey 失败，尝试 createApiKey...");
               try {
                  creds = await clobClient.createApiKey();
                  console.log("[三层防护] createApiKey 成功");
               } catch (createErr) {
                  // 全新账户，derive 和 create 都会 400，不需要报错
                  console.log("[三层防护] 全新 Polymarket 账户，API Key 暂不可用（首次下单后生效）");
               }
            }
            if (creds && creds.key) {
              setCachedCreds(wallet.address, creds);
              console.log("[三层防护] API Key 已生成并缓存");
            }
         } catch (keyErr) {
            console.warn("[三层防护] API Key 获取流程异常:", keyErr);
         }
      }

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
         // Fallback: 直接在 Polygon 链上查询 EOA 的 USDC.e 余额
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
      isFetchingBalanceRef.current = false; // 释放锁
      if (showLoading) setIsRefreshingBalance(false);
    }
  }, [authenticated, wallets, user]);

  // === 门控层 + 防抖 ===：只在 Privy 完全 ready 且已认证时触发，300ms 防抖
  useEffect(() => {
    if (!ready || !authenticated || !wallets || wallets.length === 0) return;

    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
    }

    fetchBalanceTimerRef.current = setTimeout(() => {
      fetchBalance();
    }, 300);

    return () => {
      if (fetchBalanceTimerRef.current) {
        clearTimeout(fetchBalanceTimerRef.current);
      }
    };
  }, [ready, wallets, authenticated, user, fetchBalance]);

  // Derived Values
  const displayIdentifier = user?.twitter?.username 
    ? `@${user.twitter.username}`
    : user?.email?.address
      ? user.email.address
      : user?.google?.email
        ? user.google.email
        : walletAddress 
          ? shortenAddress(walletAddress)
          : "Wallet Connected";

  const displayAvatar = user?.twitter?.profilePictureUrl 
    || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${walletAddress || "default"}`;

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
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
    displayAvatar
  };
}
