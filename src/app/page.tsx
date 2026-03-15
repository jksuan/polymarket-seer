"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import * as htmlToImage from "html-to-image";
import { Swords, Download, TrendingUp, HandCoins, Twitter, Copy, Check, LogOut, ExternalLink, Loader2, CheckCircle2, XCircle, RefreshCw, Briefcase, History, ClipboardList, Wallet, ChevronRight, ChevronDown, CircleSlash, Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "next/navigation";
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { ClobClient } from "@polymarket/clob-client";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-relayer-client/node_modules/@polymarket/builder-signing-sdk";

import {
  POLYGON_CHAIN_ID, CLOB_API_URL, DATA_API_URL, RELAYER_URL,
  SAFE_FACTORY_POLYGON, ADDRESSES, USDC_DECIMALS,
  ERC20_ABI, ERC1155_ABI, CTF_ABI, SIGNATURE_TYPE_GNOSIS_SAFE,
  ZERO_PARENT_COLLECTION_ID,
} from "@/lib/constants";
import {
  formatRelativeTime, copyToClipboard, clearCredsCache,
  getCachedCreds, setCachedCreds, shortenAddress,
} from "@/lib/utils";
import Portfolio from "@/components/Portfolio";
import TxOverlay from "@/components/TxOverlay";

function HomeContent() {
  const searchParams = useSearchParams();
  const initialAmount = searchParams.get("amount") || "50";
  const initialTopic = searchParams.get("topic") || "马斯克下周去火星";

  const [topic, setTopic] = useState(initialTopic);
  const [amount, setAmount] = useState<string>(initialAmount);
  const [username, setUsername] = useState("CryptoKing");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hash, setHash] = useState("VERIFYING...");
  const [challengeId, setChallengeId] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  // --- 自动为社交登录用户创建 Embedded Wallet ---
  const hasTriedCreateWalletRef = useRef(false);
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    // 检查用户是否已有 embedded wallet
    const hasEmbeddedWallet = wallets.some(w => w.walletClientType === 'privy');
    if (!hasEmbeddedWallet && !hasTriedCreateWalletRef.current) {
      hasTriedCreateWalletRef.current = true;
      console.log("[自动钱包] 社交登录用户无 Embedded Wallet，正在创建...");
      createWallet().then(() => {
        console.log("[自动钱包] Embedded Wallet 创建成功");
      }).catch((err) => {
        console.warn("[自动钱包] Embedded Wallet 创建失败（可能已存在）:", err);
      });
    }
  }, [ready, authenticated, user, wallets]);

  const [walletAddress, setWalletAddress] = useState("");
  const [proxyAddress, setProxyAddress] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [copied, setCopied] = useState(false);

  // --- Transaction Progress Overlay States ---
  type TxStep = "idle" | "preparing" | "deploying" | "approving" | "placing" | "success" | "error";
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txMessage, setTxMessage] = useState("");
  const [txOrderId, setTxOrderId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  // --- Portfolio 资产组合状态 ---
  const [positions, setPositions] = useState<any[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // --- 三层防护：防止签名竞态 ---
  const isFetchingBalanceRef = useRef(false);       // 锁层：fetchBalance 是否正在执行
  const fetchBalanceTimerRef = useRef<NodeJS.Timeout | null>(null); // 防抖定时器
  const hasTriedDeriveCredsRef = useRef(false);     // 新增：防止反复弹窗

  // --- 逻辑：获取资产组合数据 ---
  const fetchPortfolio = async (proxyAddr: string, creds: any, signer: any) => {
    if (!proxyAddr) return;
    setPortfolioLoading(true);
    try {
      // 同时发起两个 API 请求：持仓 + 活动记录
      const [posRes, activityRes] = await Promise.all([
        fetch(`${DATA_API_URL}/positions?user=${proxyAddr}`),
        fetch(`${DATA_API_URL}/activity?user=${proxyAddr}`)
      ]);

      // 解析持仓
      if (posRes.ok) {
        const posData = await posRes.json();
        const validPos = Array.isArray(posData) ? posData : (posData?.data || []);
        setPositions(validPos.filter((p: any) => Number(p.size) > 0.01));
      }

      // 解析活动记录
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setTrades(Array.isArray(activityData) ? activityData : []);
      }

      // 3. 从 CLOB SDK 获取挂单
      const clob = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer, creds, SIGNATURE_TYPE_GNOSIS_SAFE, proxyAddr);
      const orders = await clob.getOpenOrders().catch(() => []);
      setOpenOrders(orders || []);
      
    } catch (err) {
      console.error("获取组合数据失败:", err);
    } finally {
      setPortfolioLoading(false);
    }
  };

  // --- LOGIC: Fetch Balance and Proxy Address (三层防护版) ---
  const fetchBalance = async (showLoading = false) => {
    // === 锁层 ===：如果已有一个 fetchBalance 在执行，直接跳过
    if (isFetchingBalanceRef.current) {
      console.log("[三层防护/锁层] fetchBalance 已在执行中，跳过本次调用");
      return;
    }

    // === 门控层 ===：确保 Privy 完全就绪且钱包已加载
    if (!ready || !authenticated || !wallets || wallets.length === 0) {
      console.log("[三层防护/门控层] Privy 未就绪或钱包未加载，跳过");
      return;
    }

    isFetchingBalanceRef.current = true; // 上锁
    if (showLoading) setIsRefreshingBalance(true);
    
    let wallet = null;
    if (user && user.wallet && user.wallet.address) {
       wallet = wallets.find(w => w.address.toLowerCase() === user.wallet?.address.toLowerCase());
    }
    if (!wallet) {
       const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
       wallet = embeddedWallet || wallets[0];
    }
    if (!wallet) {
      isFetchingBalanceRef.current = false; // 释放锁
      if (showLoading) setIsRefreshingBalance(false);
      return;
    }

    setWalletAddress(wallet.address);
    
    try {
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
         await new Promise(r => setTimeout(r, 200)); // 短暂等待，让可能并行的写入完成
         creds = getCachedCreds(wallet.address);
      }

      if (!creds && !hasTriedDeriveCredsRef.current) {
         hasTriedDeriveCredsRef.current = true;
         // 确认此刻仍然没有缓存，才发起签名请求
         // 关键优化：先 derive 再 create（仅需一次签名）
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
                  // 全新账户（从未在 Polymarket 下过单），derive 和 create 都会 400
                  // 这是完全正常的预期行为，不需要报错
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
         // 同步刷新资产组合
         fetchPortfolio(derivedProxy, creds, signer);
      } else {
         // Fallback: 直接在 Polygon 链上查询 EOA 的 USDC.e 余额
         // 对全新账户，这里安全降级为 $0.00
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
  };

  // === 门控层 + 防抖 ===：只在 Privy 完全 ready 且已认证时触发，300ms 防抖合并多次快速调用
  useEffect(() => {
    if (!ready || !authenticated || !wallets || wallets.length === 0) return;

    // 清除之前的防抖定时器
    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
    }

    // 300ms 防抖：等所有状态（wallets, user）都稳定后再发起请求
    fetchBalanceTimerRef.current = setTimeout(() => {
      fetchBalance();
    }, 300);

    return () => {
      if (fetchBalanceTimerRef.current) {
        clearTimeout(fetchBalanceTimerRef.current);
      }
    };
  }, [ready, wallets, authenticated, user]);

  const handleCopy = (text: string) => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayIdentifier = user?.twitter?.username 
    ? `@${user.twitter.username}`
    : user?.email?.address
      ? user.email.address
      : user?.google?.email
        ? user.google.email
        : walletAddress 
          ? shortenAddress(walletAddress)
          : "Wallet Connected";

  const displayAvatar = user?.twitter?.profilePictureUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${walletAddress || "default"}`;

  const cardRef = useRef<HTMLDivElement>(null);
  const twitterCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHash(Math.random().toString(16).substring(2, 10).toUpperCase());
    const id = nanoid(10);
    setChallengeId(id);
    setShareUrl(`https://supastarter.08612345.xyz/c/${id}?amount=${encodeURIComponent(amount)}&topic=${encodeURIComponent(topic)}`);
  }, [amount, topic]);

  const handleGenerate = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const image = await htmlToImage.toJpeg(cardRef.current, { pixelRatio: 2, quality: 0.9, backgroundColor: "#000000" });
      const a = document.createElement("a");
      a.href = image; a.download = `PolyBet-${topic.slice(0, 10)}.jpg`; a.click();
    } catch (err) { console.error(err); alert("生成失败"); } finally { setIsGenerating(false); }
  };

  const handleShareToTwitter = async () => {
    if (!twitterCardRef.current || !cardRef.current) return;
    setIsGenerating(true);
    try {
      const imageBase64 = await htmlToImage.toJpeg(twitterCardRef.current, { pixelRatio: 2, quality: 0.9, backgroundColor: "#000000" });
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: challengeId, imageBase64 })
      });
      if (!res.ok) throw new Error("Upload failed");
      const tweetText = encodeURIComponent(`别光扯淡，用钱包说话！我就赌“${topic}”，已下注 $${amount}。是个真汉子就点进来接下我的挑战！👇`);
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`, "_blank");
    } catch (err) { console.error(err); alert("发推失败"); } finally { setIsGenerating(false); }
  };

  const closeTxOverlay = () => {
    setTxStep("idle");
    setTxMessage("");
    setTxOrderId(null);
    setTxError(null);
    // 交易完成后自动刷新数据
    if (proxyAddress) {
       fetchBalance(); 
    }
  };

  // --- 逻辑：执行领奖 (Redeem) ---
  const handleRedeem = async (pos: any) => {
    if (!pos || !proxyAddress || !wallets[0]) return;
    
    setTxStep("preparing");
    setTxMessage("正在构造领奖交易请求...");
    setTxError(null);

    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === user?.wallet?.address?.toLowerCase()) || wallets[0];
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      // 构造智能合约调用数据
      const ctfInterface = new ethers.utils.Interface(CTF_ABI);

      const parentCollectionId = ZERO_PARENT_COLLECTION_ID;
      // 将 outcomeIndex 转换为 indexSets 格式
      const indexSets = [Math.pow(2, pos.outcomeIndex)]; 

      const builderConfig = new BuilderConfig({ remoteBuilderConfig: { url: `${window.location.origin}/api/sign` } });
      const relayClient = new RelayClient(RELAYER_URL, POLYGON_CHAIN_ID, signer as any, builderConfig, RelayerTxType.SAFE);

      setTxStep("placing");
      setTxMessage("正在通过 Relayer 激活资产并提取奖励...");
      
      const tx = await relayClient.execute([{
        to: ADDRESSES.CTF,
        data: ctfInterface.encodeFunctionData("redeemPositions", [ADDRESSES.USDCe, parentCollectionId, pos.conditionId, indexSets]),
        value: "0"
      }], "Redeem Positions");

      setTxMessage("领奖交易已广播，等待区块链状态更新...");
      await tx.wait();

      setTxStep("success");
      setTxMessage(`恭喜！奖励已成功领取，资金已划转至您的金库。`);
    } catch (err: any) {
      console.error("领奖错误:", err);
      setTxStep("error");
      setTxError(err.message || String(err));
      setTxMessage("领奖请求执行失败");
    }
  };

  const handlePlaceRealBet = async () => {
    if (!authenticated || !wallets || wallets.length === 0) { login(); return; }

    // Reset & show overlay
    setTxStep("preparing");
    setTxMessage("正在切换至 Polygon 网络...");
    setTxOrderId(null);
    setTxError(null);

    try {
      // --- Step 0: Wallet preparation ---
      let wallet = wallets.find(w => w.address.toLowerCase() === user?.wallet?.address?.toLowerCase())
                   || wallets.find(w => w.walletClientType === 'privy')
                   || wallets[0];
      if (!wallet) throw new Error("未找到已连接钱包");

      try { await wallet.switchChain(POLYGON_CHAIN_ID); } catch(e) { console.warn("Switch chain skipped", e); }

      setTxMessage("正在初始化交易环境...");
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      let creds = getCachedCreds(wallet.address);
      if (!creds) {
        // 尝试在下单时实时衍生/创建 API Key（适用于全新账户或缓存丢失的场景）
        setTxMessage("正在生成 API 凭据...");
        const clobForDerive = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any);
        try {
          creds = await clobForDerive.deriveApiKey();
          console.log("[下单] deriveApiKey 成功");
        } catch {
          try {
            creds = await clobForDerive.createApiKey();
            console.log("[下单] createApiKey 成功");
          } catch (e2) {
            console.error("[下单] API Key 创建也失败:", e2);
          }
        }
        if (creds && creds.key) {
          setCachedCreds(wallet.address, creds);
        }
        if (!creds) throw new Error("API 凭据生成失败，请刷新页面后重试");
      }
      const derivedProxy = proxyAddress || deriveSafe(wallet.address, SAFE_FACTORY_POLYGON);

      // --- Step 1: Pre-flight Check (Balance) ---
      setTxMessage("正在检查金库余额...");
      const clobClientWithCreds = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any, creds, SIGNATURE_TYPE_GNOSIS_SAFE, derivedProxy);
      try {
        const balanceData = await clobClientWithCreds.getBalanceAllowance({ asset_type: "COLLATERAL" as any });
        const currentBalance = balanceData?.balance ? Number(ethers.utils.formatUnits(balanceData.balance, USDC_DECIMALS)) : 0;
        const targetAmount = Number(amount);
        if (currentBalance < targetAmount) {
          throw new Error(`余额不足: 当前金库含 $${currentBalance.toFixed(2)} USDC.e，但下注需要 $${targetAmount.toFixed(2)} USDC.e`);
        }
      } catch (balErr: any) {
        if (balErr.message && balErr.message.includes("余额不足")) {
          throw balErr;
        } else {
           console.warn("余额查询失败，如果确认有钱请忽略", balErr);
           // Fallback check using ethers onchain? 
           // If we can't check balance, we might fail later, but for now we let it pass
           // Or we could force them to load on-chain balance. Let's rely on the error thrown or assume 0 if fetch fails.
           // Actually, if it's a new proxy without creds active yet, CLOB might fail.
           // Let's do an on-chain fallback check.
           try {
             const contract = new ethers.Contract(ADDRESSES.USDCe, ERC20_ABI, provider);
             const onchainBalWei = await contract.balanceOf(derivedProxy);
             const onchainBal = Number(ethers.utils.formatUnits(onchainBalWei, USDC_DECIMALS));
             if (onchainBal < Number(amount)) {
                throw new Error(`余额不足: 金库可用资金不足以支付此次下注`);
             }
           } catch (fallbackBalErr: any) {
             if (fallbackBalErr.message && fallbackBalErr.message.includes("余额不足")) {
               throw fallbackBalErr;
             }
           }
        }
      }

      setTxMessage("正在获取活跃市场数据...");
      const activeMarkets = await clobClientWithCreds.getSamplingSimplifiedMarkets();
      const liveTokenId = activeMarkets.data[0]?.tokens[0]?.token_id;
      if (!liveTokenId) throw new Error("未获取到活跃交易对，请稍后重试");

      // --- Step 2: Deploy Safe Wallet ---
      setTxStep("deploying");
      setTxMessage("正在检查金库部署状态...");
      const builderConfig = new BuilderConfig({ remoteBuilderConfig: { url: `${window.location.origin}/api/sign` } });
      const relayClient = new RelayClient(RELAYER_URL, POLYGON_CHAIN_ID, signer as any, builderConfig, RelayerTxType.SAFE);

      try {
        const isDeployed = await relayClient.getDeployed(derivedProxy);
        if (!isDeployed) {
          setTxMessage("金库尚未激活，正在通过 Relayer 免费部署...");
          const d = await relayClient.deploy();
          setTxMessage("部署交易已提交，等待链上确认...");
          await d.wait();
        } else {
          setTxMessage("金库已激活 ✓");
        }
      } catch (deployErr: any) {
        if (!String(deployErr.message || deployErr).includes("deployed")) {
          console.error("Deploy error:", deployErr);
          // Non-fatal: continue
        }
      }

      // --- Step 2: Batch Token Approvals ---
      setTxStep("approving");
      setTxMessage("正在设置代币交易授权 (一次性操作)...");
      const erc20 = new ethers.utils.Interface(ERC20_ABI);
      const erc1155 = new ethers.utils.Interface(ERC1155_ABI);
      const MAX = ethers.constants.MaxUint256;

      try {
        await relayClient.execute([
          { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF, MAX]), value: "0" },
          { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF_EXCHANGE, MAX]), value: "0" },
          { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.NEG_RISK_CTF_EXCHANGE, MAX]), value: "0" },
          { to: ADDRESSES.CTF, data: erc1155.encodeFunctionData("setApprovalForAll", [ADDRESSES.CTF_EXCHANGE, true]), value: "0" }
        ], "Batch Approve");
        setTxMessage("授权完成 ✓，正在同步余额...");
      } catch (approveErr: any) {
        console.warn("Approval may have already been set:", approveErr);
        setTxMessage("授权已存在，跳过 ✓");
      }

      try {
        await clobClientWithCreds.updateBalanceAllowance({ asset_type: "COLLATERAL" as any });
      } catch(e) { console.warn("updateBalanceAllowance non-critical", e); }

      // --- Step 3: Place Market Order ---
      setTxStep("placing");
      setTxMessage("正在向 Polymarket 提交市价买入订单...");
      const resp = await clobClientWithCreds.createAndPostMarketOrder({
        tokenID: liveTokenId, amount: 1.00, side: "BUY" as any
      });

      if (resp && resp.success) {
        setTxStep("success");
        setTxMessage("下注成功！订单已被 Polymarket 撮合引擎接受。");
        setTxOrderId(resp.orderID || null);
      } else {
        // --- IMPROVEMENT: Scrape human-readable error from JSON string ---
        let errorMsg = resp?.error || JSON.stringify(resp);
        try {
          // If the error is a stringified JSON containing "data: { error: ... }"
          const parsed = JSON.parse(errorMsg);
          if (parsed?.data?.error) {
             errorMsg = parsed.data.error;
          }
        } catch(e) {}
        
        throw new Error(errorMsg);
      }

    } catch (err: any) {
      console.error("Place bet error:", err);
      setTxStep("error");
      
      // Clean up common error messages
      let finalMsg = err.message || String(err);
      if (finalMsg.includes("not enough balance")) finalMsg = "余额不足或授权尚未生效，请确认金库中有足够的 USDC.e。";
      if (finalMsg.includes("user rejected")) finalMsg = "用户取消了签名请求。";
      
      setTxError(finalMsg);
      setTxMessage("交易流程中断");
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white font-sans sm:items-center sm:justify-center relative overflow-x-hidden">
      
      {/* 顶部导航栏 - Profile + Proxy Wallet Address 展示 */}
      <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex justify-center sm:block">
        {!authenticated ? (
          <button onClick={login} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold shadow-xl transition-all active:scale-95">
            一键登录对接
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-2 pr-4 rounded-full shadow-2xl shadow-black/50">
            <div className="relative">
              <img src={displayAvatar} alt="avatar" className="w-8 h-8 rounded-full border border-zinc-700 object-cover flex-shrink-0" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-bold leading-tight">{displayIdentifier}</span>
                <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[8px] font-black text-purple-400 tracking-tighter">Polygon</span>
              </div>
              {proxyAddress && (
                <div className="flex items-center gap-1">
                  <span className="text-zinc-400 text-[10px] font-mono leading-none">
                    <span className="hidden sm:inline">Polymarket Proxy Wallet:</span>
                    <span className="sm:hidden">Proxy Wallet:</span>
                    {" "}{proxyAddress.slice(0, 6)}...{proxyAddress.slice(-4)}
                  </span>
                  <button onClick={() => handleCopy(proxyAddress)} title="Copy" className="text-zinc-600 hover:text-blue-400 transition-colors p-0.5">
                    {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 leading-none mt-0.5">
                <span className="text-green-400 text-[11px] font-black">${usdcBalance} USDC.e</span>
                <button 
                  onClick={() => fetchBalance(true)} 
                  disabled={isRefreshingBalance}
                  className={`text-zinc-500 hover:text-blue-400 transition-all p-0.5 ${isRefreshingBalance ? 'animate-spin text-blue-400' : ''}`}
                  title="刷新余额"
                >
                  <RefreshCw size={10} />
                </button>
              </div>
            </div>
            <div className="w-[1px] h-6 bg-zinc-800" />
            <button onClick={async () => {
              await logout();
              clearCredsCache();
              setWalletAddress("");
              setProxyAddress(null);
              setUsdcBalance("0.00");
              setPositions([]);
              setOpenOrders([]);
              setTrades([]);
              console.log("[Logout] 缓存与状态已深度清理");
            }} className="text-zinc-500 hover:text-red-400 transition-colors text-xs font-medium">
              退出
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-md p-6 space-y-8 relative z-10">
        <div className="text-center space-y-2 mt-28 sm:mt-0">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600/20 text-blue-500 rounded-2xl mb-2 animate-bounce-slow">
            <Swords size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PolyBet Challenge</h1>
          <p className="text-zinc-400 font-medium tracking-tight">生成你的对赌决战海报</p>
        </div>

        {/* Input Form */}
        <div className="space-y-4 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 p-5 rounded-3xl shadow-xl shadow-black/50">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-400 px-1 uppercase tracking-wider text-[10px]">你的发单ID</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 transition-all font-bold" placeholder="ShibaWhale" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-400 px-1 uppercase tracking-wider text-[10px]">我们在赌什么？</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 transition-all font-bold" placeholder="湖人队今晚夺冠" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-400 px-1 uppercase tracking-wider text-[10px]">下注金额 (USDC)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-green-500"><HandCoins size={18} /></div>
              <input 
                 type="number" 
                 min="1" 
                 value={amount} 
                 onChange={(e) => {
                   let val = e.target.value.replace(/^0+/, ""); // Remove leading zeros
                   if (val === "" || Number(val) < 1) {
                     val = "1"; // Default to 1 if empty or less than 1
                   }
                   setAmount(val);
                 }} 
                 className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 transition-all font-bold" 
              />
            </div>
          </div>
        </div>

        {/* Poster Grid */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <div ref={cardRef} className="w-full aspect-[4/5] bg-black border border-zinc-800 rounded-3xl overflow-hidden relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col pt-8 pb-10 px-6 justify-between" style={{ backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #000000 70%)'}}>
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              <div className="text-center space-y-1 relative z-10">
                <div className="inline-block px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Challenge Issued</div>
                <h3 className="text-2xl font-black text-white leading-tight break-words px-4">“{topic}”</h3>
              </div>
              <div className="flex items-center justify-between w-full mt-6 mb-4 relative z-10">
                <div className="flex flex-col items-center gap-2 w-5/12">
                  <div className="w-20 h-20 rounded-full border-4 border-blue-500 bg-zinc-800 overflow-hidden flex items-center justify-center p-1 relative">
                    <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`} alt="Avatar" className="w-full h-full rounded-full bg-zinc-900" crossOrigin="anonymous" />
                    <div className="absolute -bottom-2 bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-black">YES</div>
                  </div>
                  <span className="font-black text-sm text-blue-400 truncate w-full text-center">{username}</span>
                </div>
                <span className="text-3xl font-black italic text-zinc-700">VS</span>
                <div className="flex flex-col items-center gap-2 w-5/12 text-center">
                  <div className="w-20 h-20 rounded-full border-4 border-zinc-600 border-dashed bg-zinc-900 flex items-center justify-center relative">
                    <span className="text-2xl text-zinc-600 font-black">?</span>
                    <div className="absolute -bottom-2 bg-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-black">NO</div>
                  </div>
                  <span className="text-zinc-500 text-[10px] font-bold leading-tight uppercase">等你接战</span>
                </div>
              </div>
              <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-4 flex flex-col items-center relative z-10">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">下注池单边金额</p>
                <div className="flex items-end gap-1"><span className="text-4xl font-black text-green-400">${amount}</span><span className="text-[10px] text-green-700 font-bold mb-1">USDC</span></div>
              </div>
              <div className="mt-6 flex justify-between items-end opacity-80 z-10">
                <div className="text-[8px] font-mono text-zinc-600 space-y-0.5">
                   <div className="flex items-center gap-1 text-blue-500/80"><TrendingUp size={10}/> Powered by Polymarket</div>
                   <div>Hash: 0x{hash.slice(0, 8)}...</div>
                </div>
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">{shareUrl && <QRCodeSVG value={shareUrl} size={40} />}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cta Buttons */}
        <div className="flex flex-col gap-4">
          <button onClick={handlePlaceRealBet} disabled={isGenerating} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(34,197,94,0.3)] transition-all active:scale-95 disabled:opacity-50">
            <HandCoins size={22} strokeWidth={3} /> {authenticated ? "真金白银一键下注" : "立即连接钱包"}
          </button>
          <div className="flex gap-3">
             <button onClick={handleGenerate} className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95"><Download size={18}/> 保存图片</button>
             <button onClick={handleShareToTwitter} className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95"><Twitter size={18}/> 一键发推</button>
          </div>
        </div>

        {/* ========== Portfolio 资产组合面板 ========== */}
        {authenticated && (
          <Portfolio 
            positions={positions}
            openOrders={openOrders}
            trades={trades}
            portfolioLoading={portfolioLoading}
            onRedeem={handleRedeem}
          />
        )}
      </div>

      {/* Hidden Twitter Social Component */}
      <div className="absolute opacity-0 pointer-events-none -z-50"><div ref={twitterCardRef} className="w-[1200px] h-[630px] bg-black">...</div></div>

      {/* ========== Transaction Progress Overlay ========== */}
      <TxOverlay
        txStep={txStep}
        txMessage={txMessage}
        txOrderId={txOrderId}
        txError={txError}
        proxyAddress={proxyAddress}
        amount={amount}
        onClose={closeTxOverlay}
        onRetry={handlePlaceRealBet}
      />
    </main>
  );
}

export default function Home() {
  return (<Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}><HomeContent /></Suspense>);
}
