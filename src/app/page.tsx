"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import * as htmlToImage from "html-to-image";
import { Swords, Download, TrendingUp, HandCoins, Twitter, Copy, Check, LogOut, ExternalLink } from "lucide-react";
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

  const handlePlaceRealBet = async () => {
    if (!authenticated || !wallets || wallets.length === 0) { login(); return; }
    setIsGenerating(true);
    try {
      let wallet = wallets.find(w => w.address.toLowerCase() === user?.wallet?.address?.toLowerCase()) 
                   || wallets.find(w => w.walletClientType === 'privy') 
                   || wallets[0];
      if (!wallet) throw new Error("No wallet connected");
      await wallet.switchChain(137);
      
      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      const cachedBody = localStorage.getItem(`poly_creds_${wallet.address}`);
      if (!cachedBody) throw new Error("Credentials missing, please refresh.");
      const creds = JSON.parse(cachedBody);
      const derivedProxy = proxyAddress || deriveSafe(wallet.address, "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b");

      const clobClientWithCreds = new ClobClient("https://clob.polymarket.com", 137, signer as any, creds, 2, derivedProxy);
      const activeMarkets = await clobClientWithCreds.getSamplingSimplifiedMarkets();
      const liveTokenId = activeMarkets.data[0]?.tokens[0]?.token_id;
      if (!liveTokenId) throw new Error("Could not fetch active token ID.");

      // Deployment & Approvals via Relayer
      const builderConfig = new BuilderConfig({ remoteBuilderConfig: { url: `${window.location.origin}/api/sign` } });
      const relayClient = new RelayClient("https://relayer-v2.polymarket.com/", 137, signer as any, builderConfig, RelayerTxType.SAFE);
      
      const isDeployed = await relayClient.getDeployed(derivedProxy);
      if (!isDeployed) {
          alert("发现金库尚未部署，正在通过 Relayer 激活中...");
          const d = await relayClient.deploy(); await d.wait();
      }

      // Batch Approvals
      const ADDRESSES = {
        USDCe: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        CTF: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
        CTF_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
        NEG_RISK_CTF_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
      };
      const erc20 = new ethers.utils.Interface(["function approve(address spender, uint256 amount) returns (bool)"]);
      const erc1155 = new ethers.utils.Interface(["function setApprovalForAll(address operator, bool approved)"]);
      const MAX = ethers.constants.MaxUint256;

      await relayClient.execute([
        { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF, MAX]), value: "0" },
        { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.CTF_EXCHANGE, MAX]), value: "0" },
        { to: ADDRESSES.USDCe, data: erc20.encodeFunctionData("approve", [ADDRESSES.NEG_RISK_CTF_EXCHANGE, MAX]), value: "0" },
        { to: ADDRESSES.CTF, data: erc1155.encodeFunctionData("setApprovalForAll", [ADDRESSES.CTF_EXCHANGE, true]), value: "0" }
      ], "Market Launch Approvals");

      await clobClientWithCreds.updateBalanceAllowance({ asset_type: "COLLATERAL" as any });

      const resp = await clobClientWithCreds.createAndPostMarketOrder({
        tokenID: liveTokenId, amount: 1.00, side: "BUY" as any
      });
      
      if (resp.success) alert("🏆 下注且成交成功！\n订单ID: " + resp.orderID);
      else alert("❌ 报错: " + JSON.stringify(resp));

    } catch (err: any) { alert("Error: " + (err.message || String(err))); } finally { setIsGenerating(false); }
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
    </main>
  );
}

export default function Home() {
  return (<Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}><HomeContent /></Suspense>);
}
