import { useState, useRef, useEffect } from "react";
import * as htmlToImage from "html-to-image";
import { Swords, Download, HandCoins, Twitter, TrendingUp } from "lucide-react";
import { nanoid } from "nanoid";
import { QRCodeSVG } from "qrcode.react";

interface ChallengeCardProps {
  topic: string;
  setTopic: (t: string) => void;
  amount: string;
  setAmount: (a: string) => void;
  username: string;
  setUsername: (u: string) => void;
  authenticated: boolean;
  onPlaceBet: () => void;
  isGeneratingTx: boolean;
  usdcBalance: string;
}

export default function ChallengeCard({
  topic, setTopic, amount, setAmount, username, setUsername, authenticated, onPlaceBet, isGeneratingTx, usdcBalance
}: ChallengeCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hash, setHash] = useState("VERIFYING...");
  const [challengeId, setChallengeId] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  
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

  return (
    <>
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
          <div className="space-y-3">
            {/* Polymarket-style Input Box */}
            <div className="flex items-center justify-between w-full bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              {/* Left Side: Labels */}
              <div className="flex flex-col gap-1">
                <span className="text-zinc-300 font-bold">金额</span>
                <span className="text-zinc-500 text-xs font-mono">余额 ${Number(usdcBalance || 0).toFixed(2)}</span>
              </div>
              
              {/* Right Side: Input */}
              <div className="relative flex flex-1 items-center justify-end pl-4">
                <input 
                 type="text" 
                 inputMode="numeric"
                 placeholder="$0"
                 value={amount ? `$${amount}` : ""} 
                 onChange={(e) => {
                   let val = e.target.value.replace(/[^0-9]/g, "");
                   if (val !== "") {
                     val = val.replace(/^0+/, "");
                     if (val === "" && e.target.value.match(/[0-9]/)) val = "0";
                   }
                   setAmount(val);
                 }}
                 className={`w-full bg-transparent outline-none text-right text-4xl font-black transition-all ${
                    amount ? "text-white" : "text-zinc-600 placeholder:text-zinc-600"
                 }`} 
                />
              </div>
            </div>
            
            {/* Quick Amount Presets */}
            <div className="flex gap-2">
              {["10", "20", "50", "100"].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`flex-1 py-2 rounded-xl border text-[11px] font-black transition-all active:scale-95 ${
                    amount === val 
                      ? "bg-green-500/20 border-green-500/50 text-green-400" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  ${val}
                </button>
              ))}
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
          <button onClick={onPlaceBet} disabled={isGenerating || isGeneratingTx} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(34,197,94,0.3)] transition-all active:scale-95 disabled:opacity-50">
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
    </>
  );
}
