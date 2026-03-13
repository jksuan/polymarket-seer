"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import * as htmlToImage from "html-to-image";
import { Swords, Download, TrendingUp, HandCoins, Twitter, Copy, Check, LogOut, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { nanoid } from "nanoid";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { ClobClient } from "@polymarket/clob-client";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
// Use specific import to avoid type mismatch
import { BuilderConfig } from "@polymarket/builder-relayer-client/node_modules/@polymarket/builder-signing-sdk";

// Prevents double-signature popups in React Dev Mode
let isDerivingPolymarketKeyDialogActive = false;

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

  // --- LOGIC: Fetch Balance and Proxy Address ---
  useEffect(() => {
    let active = true;

    async function fetchBalance() {
      if (!wallets || wallets.length === 0) return;
      
      let wallet = null;
      if (user && user.wallet && user.wallet.address) {
         wallet = wallets.find(w => w.address.toLowerCase() === user.wallet?.address.toLowerCase());
      }
      if (!wallet) {
         const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
         wallet = embeddedWallet || wallets[0];
      }
      if (!wallet) return;

      if (active) setWalletAddress(wallet.address);
      
      try {
        const ethereumProvider = await wallet.getEthereumProvider();
        const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
        const signer = provider.getSigner();

        const clobClient = new ClobClient("https://clob.polymarket.com", 137, signer as any);
        
        // 1. Calculate Proxy
        const SAFE_FACTORY_POLYGON = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b";
        const derivedProxy = deriveSafe(wallet.address, SAFE_FACTORY_POLYGON);
        if (active) setProxyAddress(derivedProxy);

        // 2. Derive/Load API Credentials for Polymarket
        const cacheKey = `poly_creds_${wallet.address}`;
        let creds = null;
        try {
           const cachedBody = localStorage.getItem(cacheKey);
           if (cachedBody) creds = JSON.parse(cachedBody);
        } catch(e) {}

        if (!creds && authenticated) {
           if (isDerivingPolymarketKeyDialogActive) return;
           isDerivingPolymarketKeyDialogActive = true;
           try {
              await wallet.switchChain(137);
              creds = await clobClient.createOrDeriveApiKey();
              if (creds && creds.key) localStorage.setItem(cacheKey, JSON.stringify(creds));
           } finally {
              isDerivingPolymarketKeyDialogActive = false;
           }
        }

        if (creds) {
           const clobWithCreds = new ClobClient(
              "https://clob.polymarket.com",
              137,
              signer as any,
              creds,
              2, // GNOSIS_SAFE
              derivedProxy
           );
           const balanceData = await clobWithCreds.getBalanceAllowance({ asset_type: "COLLATERAL" as any });
           if (balanceData && balanceData.balance) {
              const formatted = ethers.utils.formatUnits(balanceData.balance, 6);
              if (active) setUsdcBalance(Number(formatted).toFixed(2));
           }
        } else {
           // Fallback to direct EOA USDC.e check
           const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
           const USDC_ABI = ["function balanceOf(address owner) view returns (uint256)"];
           const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
           const bal = await contract.balanceOf(wallet.address);
           if (active) setUsdcBalance(Number(ethers.utils.formatUnits(bal, 6)).toFixed(2));
        }
      } catch (err) {
        console.error("Balance fetch failed", err);
      }
    }

    if (authenticated) fetchBalance();
    return () => { active = false; };
  }, [wallets, authenticated, user]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayIdentifier = user?.twitter?.username 
    ? `@${user.twitter.username}`
    : user?.email?.address
      ? user.email.address
      : walletAddress 
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
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

      try { await wallet.switchChain(137); } catch(e) { console.warn("Switch chain skipped", e); }

      setTxMessage("正在初始化交易环境...");
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      const cachedBody = localStorage.getItem(`poly_creds_${wallet.address}`);
      if (!cachedBody) throw new Error("API 凭据丢失，请刷新页面重新签名");
      const creds = JSON.parse(cachedBody);
      const derivedProxy = proxyAddress || deriveSafe(wallet.address, "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b");

      setTxMessage("正在获取活跃市场数据...");
      const clobClientWithCreds = new ClobClient("https://clob.polymarket.com", 137, signer as any, creds, 2, derivedProxy);
      const activeMarkets = await clobClientWithCreds.getSamplingSimplifiedMarkets();
      const liveTokenId = activeMarkets.data[0]?.tokens[0]?.token_id;
      if (!liveTokenId) throw new Error("未获取到活跃交易对，请稍后重试");

      // --- Step 1: Deploy Safe Wallet ---
      setTxStep("deploying");
      setTxMessage("正在检查金库部署状态...");
      const builderConfig = new BuilderConfig({ remoteBuilderConfig: { url: `${window.location.origin}/api/sign` } });
      const relayClient = new RelayClient("https://relayer-v2.polymarket.com/", 137, signer as any, builderConfig, RelayerTxType.SAFE);

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
      const ADDRESSES = {
        USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        CTF: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
        CTF_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
        NEG_RISK_CTF_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
      };
      const erc20 = new ethers.utils.Interface(["function approve(address spender, uint256 amount) returns (bool)"]);
      const erc1155 = new ethers.utils.Interface(["function setApprovalForAll(address operator, bool approved)"]);
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
      <div className="absolute top-4 right-4 z-50">
        {!authenticated ? (
          <button onClick={login} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold shadow-xl transition-all active:scale-95">
            一键登录对接
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-2 pr-4 rounded-full shadow-lg">
            <img src={displayAvatar} alt="avatar" className="w-8 h-8 rounded-full border border-zinc-700 object-cover flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-white text-sm font-bold leading-tight">{displayIdentifier}</span>
              {proxyAddress && (
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 text-[10px] font-mono">PolyMarket Proxy Wallet: {proxyAddress.slice(0, 6)}...{proxyAddress.slice(-4)}</span>
                  <button onClick={() => handleCopy(proxyAddress)} title="Copy" className="text-zinc-600 hover:text-blue-400 transition-colors p-0.5">
                    {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  </button>
                </div>
              )}
              <span className="text-green-400 text-[11px] font-black leading-tight">${usdcBalance} USDC.e</span>
            </div>
            <div className="w-[1px] h-6 bg-zinc-800" />
            <button onClick={() => logout()} className="text-zinc-500 hover:text-red-400 transition-colors text-xs font-medium">
              退出
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-md p-6 space-y-8 relative z-10">
        <div className="text-center space-y-2 mt-12 sm:mt-0">
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
              <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
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
        <div className="flex flex-col gap-4 pb-12">
          <button onClick={handlePlaceRealBet} disabled={isGenerating} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(34,197,94,0.3)] transition-all active:scale-95 disabled:opacity-50">
            <HandCoins size={22} strokeWidth={3} /> {authenticated ? "真金白银一键下注" : "立即连接钱包"}
          </button>
          <div className="flex gap-3">
             <button onClick={handleGenerate} className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95"><Download size={18}/> 保存图片</button>
             <button onClick={handleShareToTwitter} className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95"><Twitter size={18}/> 一键发推</button>
          </div>
        </div>
      </div>

      {/* Hidden Twitter Social Component */}
      <div className="absolute opacity-0 pointer-events-none -z-50"><div ref={twitterCardRef} className="w-[1200px] h-[630px] bg-black">...</div></div>

      {/* ========== Transaction Progress Overlay ========== */}
      {txStep !== "idle" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl shadow-black/80 flex flex-col items-center gap-5 text-center">
            
            {/* Spinner / Success / Error Icon */}
            {(txStep === "preparing" || txStep === "deploying" || txStep === "approving" || txStep === "placing") && (
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-zinc-800 border-t-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                </div>
              </div>
            )}
            {txStep === "success" && (
              <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
            )}
            {txStep === "error" && (
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
                <XCircle size={40} className="text-red-500" />
              </div>
            )}

            {/* Step Indicators */}
            {txStep !== "success" && txStep !== "error" && (
              <div className="flex items-center gap-2 w-full justify-center">
                {["preparing", "deploying", "approving", "placing"].map((step, i) => {
                  const steps: TxStep[] = ["preparing", "deploying", "approving", "placing"];
                  const currentIdx = steps.indexOf(txStep as any);
                  const stepIdx = i;
                  const isActive = stepIdx === currentIdx;
                  const isDone = stepIdx < currentIdx;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        isDone ? "bg-green-500" : isActive ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-zinc-700"
                      }`} />
                      {i < 3 && <div className={`w-6 h-0.5 transition-all duration-300 ${isDone ? "bg-green-500" : "bg-zinc-800"}`} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step Label */}
            <div>
              {txStep === "preparing" && <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">准备中</p>}
              {txStep === "deploying" && <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">部署金库</p>}
              {txStep === "approving" && <p className="text-purple-400 text-xs font-bold uppercase tracking-widest">代币授权</p>}
              {txStep === "placing" && <p className="text-green-400 text-xs font-bold uppercase tracking-widest">提交订单</p>}
              {txStep === "success" && <p className="text-green-400 text-sm font-black uppercase tracking-widest">交易成功</p>}
              {txStep === "error" && <p className="text-red-400 text-sm font-black uppercase tracking-widest">交易失败</p>}
            </div>

            {/* Dynamic Message */}
            <p className="text-white text-sm font-medium leading-relaxed">{txMessage}</p>

            {/* Order ID on success */}
            {txStep === "success" && txOrderId && (
              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">订单 ID</p>
                <p className="text-xs font-mono text-zinc-300 break-all">{txOrderId}</p>
              </div>
            )}

            {/* Error detail */}
            {txStep === "error" && txError && (
              <div className="w-full bg-red-500/5 border border-red-500/20 rounded-xl p-3 max-h-24 overflow-y-auto">
                <p className="text-xs text-red-300/80 font-mono break-all">{txError}</p>
              </div>
            )}

            {/* Action Buttons */}
            {(txStep === "success" || txStep === "error") && (
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={closeTxOverlay}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    txStep === "success"
                      ? "bg-green-500 hover:bg-green-400 text-black"
                      : "bg-zinc-800 hover:bg-zinc-700 text-white"
                  }`}
                >
                  {txStep === "success" ? "完成" : "关闭"}
                </button>
                {txStep === "error" && (
                  <button
                    onClick={() => { closeTxOverlay(); handlePlaceRealBet(); }}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
                  >
                    重试
                  </button>
                )}
              </div>
            )}

            {/* Subtle hint during processing */}
            {txStep !== "success" && txStep !== "error" && (
              <p className="text-amber-400/90 text-[10px] mt-2 font-medium animate-pulse px-4 py-1.5 bg-amber-400/5 rounded-full border border-amber-400/10">
                ⚠️ 请勿关闭页面，交易正在链上处理中...
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (<Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}><HomeContent /></Suspense>);
}
