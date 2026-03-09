"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import * as htmlToImage from "html-to-image";
import { Swords, Download, TrendingUp, HandCoins, Twitter } from "lucide-react";
import { nanoid } from "nanoid";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "next/navigation";

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

  const cardRef = useRef<HTMLDivElement>(null);
  const twitterCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHash(Math.random().toString(16).substring(2, 10).toUpperCase());
    // Create a deterministic dummy ID for the session
    const id = nanoid(10);
    setChallengeId(id);
    
    // We are now using your Cloudflare Tunnel perfectly!
    // Include the topic and amount so when others return, they see what the challenger saw!
    setShareUrl(`https://supastarter.08612345.xyz/c/${id}?amount=${encodeURIComponent(amount)}&topic=${encodeURIComponent(topic)}`);
  }, [amount, topic]);

  const handleGenerate = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      const image = await htmlToImage.toJpeg(cardRef.current, {
        pixelRatio: 2, // Lighter ratio for social crawler speed
        quality: 0.9,
        backgroundColor: "#000000",
      });
      
      const a = document.createElement("a");
      a.href = image;
      a.download = `PolyBet-${topic.slice(0, 10)}.jpg`;
      a.click();
    } catch (err) {
      console.error(err);
      alert("生成海报失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToTwitter = async () => {
    if (!twitterCardRef.current || !cardRef.current) return;
    setIsGenerating(true);
    
    try {
      // 1. Generate JPEG base64 from the HIDDEN 1.91:1 UI component designed exclusively for Twitter
      const imageBase64 = await htmlToImage.toJpeg(twitterCardRef.current, {
        pixelRatio: 2,
        quality: 0.9,
        backgroundColor: "#000000",
      });
      
      // 2. Upload to our local API (which saves it into the public folder)
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: challengeId, imageBase64 })
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      // 3. Open Twitter Web Intent URL! Because Twitter scraper can hit supastarter.08612345.xyz, this URL works for auto-generating Twitter Cards!
      const tweetText = encodeURIComponent(`别光扯淡，用钱包说话！我就赌“${topic}”，已下注 $${amount}。是个真汉子就点进来接下我的挑战！👇`);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, "_blank");

    } catch (err) {
      console.error(err);
      alert("发推失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white font-sans sm:items-center sm:justify-center">
      <div className="w-full max-w-md p-6 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600/20 text-blue-500 rounded-2xl mb-2">
            <Swords size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            PolyBet Challenge
          </h1>
          <p className="text-zinc-400 font-medium">生成你的对赌决战海报</p>
        </div>

        {/* Input Form */}
        <div className="space-y-4 bg-zinc-900 border border-zinc-800 p-5 rounded-3xl shadow-xl shadow-black/50">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-300 px-1">你的发单ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              placeholder="e.g. ShibaWhale"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-300 px-1">我们在赌什么？</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              placeholder="e.g. 湖人队今晚夺冠"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-300 px-1">下注金额 (USDC)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <HandCoins size={18} />
              </div>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => {
                  let val = e.target.value.replace(/^0+(?=\d)/, '');
                  if (val === '') val = '0';
                  setAmount(val);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pl-10 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                placeholder="50"
              />
            </div>
          </div>
        </div>

        {/* Preview Container */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider text-center">海报预览</p>
          
          <div className="flex justify-center">
            {/* The actual card to snapshot - Vertical Mobile App Poster */}
            <div 
              ref={cardRef} 
              className="w-full aspect-[4/5] bg-black border border-zinc-800 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col pt-8 pb-10 px-6 justify-between"
              style={{
                backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #000000 70%)',
              }}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
              
              <div className="text-center space-y-1 relative z-10">
                <div className="inline-block px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-widest mb-2">
                  Challenge Issued
                </div>
                <h2 className="text-sm text-zinc-400 font-medium">关于：</h2>
                <h3 className="text-2xl font-black text-white leading-tight break-words px-4 line-clamp-2">
                  “{topic}”
                </h3>
              </div>

              <div className="flex items-center justify-between w-full mt-6 mb-4 relative z-10">
                <div className="flex flex-col items-center gap-2 w-5/12">
                  <div className="w-20 h-20 rounded-full border-4 border-blue-500 bg-zinc-800 overflow-hidden flex items-center justify-center p-1 relative shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`} alt="Avatar" className="w-full h-full rounded-full bg-zinc-900" crossOrigin="anonymous" />
                    <div className="absolute -bottom-2 bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-black">
                      YES
                    </div>
                  </div>
                  <span className="font-bold text-sm text-center text-blue-400 truncate w-full">{username}</span>
                </div>

                <div className="w-2/12 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black italic text-zinc-500 bg-clip-text">VS</span>
                </div>

                <div className="flex flex-col items-center gap-2 w-5/12">
                  <div className="w-20 h-20 rounded-full border-4 border-zinc-600 bg-zinc-900 flex items-center justify-center border-dashed relative shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                    <span className="text-2xl text-zinc-600 font-black">?</span>
                    <div className="absolute -bottom-2 bg-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-black text-zinc-300">
                      NO
                    </div>
                  </div>
                  <span className="font-bold text-sm text-center text-zinc-500 truncate w-full leading-tight">等你来战<br/><span className="text-[10px] font-normal">(扫码迎战)</span></span>
                </div>
              </div>

              <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-4 flex flex-col items-center relative z-10 mt-2">
                <p className="text-xs text-zinc-400 font-medium mb-1 uppercase tracking-widest">下注池资金</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-green-400">${amount}</span>
                  <span className="text-base text-green-500/60 font-bold mb-1">USDC</span>
                </div>
              </div>

              {/* Real QR code for link */}
              <div className="mt-6 flex justify-between items-end opacity-80 w-full z-10">
                <div className="text-[10px] font-mono text-zinc-500 space-y-0.5 flex flex-col">
                  <div className="flex items-center gap-1 text-blue-400"><TrendingUp size={12}/> Powered by Polymarket</div>
                  <span>Hash: 0x{hash.slice(0, 8)}...</span>
                  <span className="text-zinc-600">ID: {challengeId}</span>
                </div>
                <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center p-1 relative shadow-lg">
                  {shareUrl ? (
                    <QRCodeSVG 
                      value={shareUrl} 
                      size={48} 
                      bgColor={"#ffffff"} 
                      fgColor={"#000000"} 
                      level={"L"}
                    />
                  ) : null}
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-600/20 rounded-full blur-[50px] pointer-events-none"></div>
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-600/20 rounded-full blur-[50px] pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 pb-12 flex flex-col gap-3">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-70 disabled:pointer-events-none"
          >
            {isGenerating ? "生成中..." : <><Download size={20} /> 保存高清海报图片</>}
          </button>
          
          <button 
            onClick={handleShareToTwitter}
            disabled={isGenerating}
            className="w-full bg-black border border-zinc-800 hover:bg-zinc-900 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
          >
            <Twitter size={20} className="fill-current" /> 一键去推特挑衅发推
          </button>
        </div>
      </div>

      {/* 
        ====================================================================
        HIDDEN TWITTER CARD (1.91:1 Ratio)
        To ensure html-to-image correctly renders this, we use fixed absolute 
        positioning in the background (z-index: -50) and opacity: 0 instead of 
        throwing it to -9999px which can cause layout parsing issues.
        ====================================================================
      */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-50 opacity-0">
        <div 
          ref={twitterCardRef} 
          className="w-[1200px] h-[630px] bg-black border border-zinc-800 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col pt-12 pb-12 px-12 justify-between"
          style={{
            backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #000000 70%)',
          }}
        >
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <div className="text-center space-y-3 relative z-10 mt-4">
            <div className="inline-block px-5 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 text-lg font-bold uppercase tracking-widest">
              Challenge Issued
            </div>
            <h3 className="text-6xl font-black text-white leading-tight break-words px-12 line-clamp-2">
              “{topic}”
            </h3>
          </div>

          <div className="flex items-center justify-between w-full relative z-10 my-auto px-4">
            {/* Challenger */}
            <div className="flex flex-col items-center gap-4 w-1/3">
              <div className="w-40 h-40 rounded-full border-[6px] border-blue-500 bg-zinc-800 overflow-hidden flex items-center justify-center p-2 relative shadow-[0_0_40px_rgba(59,130,246,0.5)]">
                <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`} alt="Avatar" className="w-full h-full rounded-full bg-zinc-900" crossOrigin="anonymous" />
                <div className="absolute -bottom-3 bg-blue-600 text-lg font-bold px-4 py-1 rounded border-2 border-black">YES</div>
              </div>
              <span className="font-bold text-3xl text-center text-blue-400 truncate w-full">{username}</span>
            </div>

            {/* VS and Amount */}
            <div className="w-1/3 flex flex-col items-center justify-center gap-6">
              <span className="text-7xl font-black italic text-zinc-500 leading-none drop-shadow-lg">VS</span>
              <div className="bg-green-500/10 border-2 border-green-500/30 rounded-3xl px-10 py-5 flex flex-col items-center shadow-inner backdrop-blur-sm">
                <span className="text-xl text-green-500/80 font-bold uppercase tracking-widest mb-2">下注池</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-7xl font-black text-green-400 leading-none">${amount}</span>
                </div>
              </div>
            </div>

            {/* Defender */}
            <div className="flex flex-col items-center gap-4 w-1/3">
              <div className="w-40 h-40 rounded-full border-[6px] border-zinc-600 bg-zinc-900 flex items-center justify-center border-dashed relative shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                <span className="text-7xl text-zinc-600 font-black">?</span>
                <div className="absolute -bottom-3 bg-zinc-700 text-lg font-bold px-4 py-1 rounded border-2 border-black text-zinc-300">NO</div>
              </div>
              <span className="font-bold text-3xl text-center text-zinc-500 truncate w-full leading-tight">等你接单</span>
            </div>
          </div>

          <div className="flex justify-between items-end opacity-80 w-full z-10 mb-4 px-4">
            <div className="text-xl font-mono text-zinc-500 space-y-1 flex flex-col">
              <div className="flex items-center gap-2 text-blue-400"><TrendingUp size={24}/> Powered by Polymarket</div>
              <span>Hash: 0x{hash.slice(0, 8)}</span>
              <span className="text-zinc-600">ID: {challengeId}</span>
            </div>
            <div className="shrink-0 bg-white rounded-2xl flex items-center justify-center p-3 shadow-lg">
              {shareUrl ? (
                <QRCodeSVG value={shareUrl} size={80} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} />
              ) : null}
            </div>
          </div>

          <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] pointer-events-none"></div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
