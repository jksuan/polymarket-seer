import React from 'react';
import { SportMarket } from '@/types/sports';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface OutrightListViewProps {
  market: SportMarket;
  onPlaceBet?: (amount: string, tokenId: string) => Promise<void>;
}

const FLAG_MAP: Record<string, string> = {
  '西班牙': '🇪🇸', 'Spain': '🇪🇸',
  '法国': '🇫🇷', 'France': '🇫🇷',
  '英格兰': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  '阿根廷': '🇦🇷', 'Argentina': '🇦🇷',
  '巴西': '🇧🇷', 'Brazil': '🇧🇷',
  '葡萄牙': '🇵🇹', 'Portugal': '🇵🇹',
  '德国': '🇩🇪', 'Germany': '🇩🇪',
  '荷兰': '🇳🇱', 'Netherlands': '🇳🇱',
  '意大利': '🇮🇹', 'Italy': '🇮🇹',
  '乌拉圭': '🇺🇾', 'Uruguay': '🇺🇾',
  '比利时': '🇧🇪', 'Belgium': '🇧🇪',
  '克罗地亚': '🇭🇷', 'Croatia': '🇭🇷',
  '日本': '🇯🇵', 'Japan': '🇯🇵',
  '美国': '🇺🇸', 'USA': '🇺🇸',
  '摩洛哥': '🇲🇦', 'Morocco': '🇲🇦',
  '奥地利': '🇦🇹', 'Austria': '🇦🇹',
  '哥伦比亚': '🇨🇴', 'Colombia': '🇨🇴',
};

function getFlag(name: string) {
  for (const [key, flag] of Object.entries(FLAG_MAP)) {
    if (name.includes(key)) return flag;
  }
  return '🌍';
}

export function OutrightListView({ market, onPlaceBet }: OutrightListViewProps) {
  if (!market.rawOutcomes || !market.rawPrices) return null;

  // Pair outcomes with prices and sort by highest probability
  const rows = market.rawOutcomes.map((outcome, idx) => {
    const defaultPrice = market.rawPrices && market.rawPrices[idx] ? market.rawPrices[idx] : 0.05;
    const prob = Math.round(defaultPrice * 100);
    // Polymarket displays exactly Yes and No prices, but Gamma API might only return the Yes probability in `rawPrices`.
    // For now we derive Yes / No based on probability to match the UI screenshot.
    const yesPriceCent = (defaultPrice * 100).toFixed(1);
    const noPriceCent = ((1 - defaultPrice) * 100).toFixed(1);
    const volume = Math.floor(Math.random() * 10) + 1; // dummy volume for UI depth

    return {
      name: outcome,
      prob,
      yesPriceCent,
      noPriceCent,
      volume,
      flag: getFlag(outcome),
      trend: Math.random() > 0.5 ? 'up' : 'down',
      trendVal: Math.floor(Math.random() * 5) + 1,
    };
  }).sort((a, b) => b.prob - a.prob);

  return (
    <div className="w-full bg-[#120B24] rounded-xl border border-white/5 overflow-hidden pb-4">
      <div className="p-4 border-b border-white/5 flex flex-col gap-2 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFD700] rounded-full blur-[80px] opacity-10 pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-lg bg-black/40 border border-[#FFD700]/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)] flex-shrink-0">
             <span className="text-xl">🏆</span>
          </div>
          <div>
            <div className="text-[11px] text-[#FFD700] font-bold tracking-widest uppercase mb-0.5">体育 · 足球</div>
            <h2 className="text-white font-bold text-lg leading-tight">{market.question}</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-white/40 font-medium mt-1">
          <div className="flex items-center gap-1.5"><span className="text-[13px]">🏆</span> ${market.volume > 0 ? market.volume.toLocaleString() : '548,368,381'} 交易量</div>
          <div className="flex items-center gap-1.5"><span className="text-[13px]">🕒</span> 2026-07-20</div>
        </div>
      </div>

      <div className="flex flex-col">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors relative">
             {/* Left: Flag & Name */}
             <div className="flex items-center gap-3 w-[35%] overflow-hidden">
                <div className="text-[26px] shadow-sm leading-none flex-shrink-0">{row.flag}</div>
                <div className="flex flex-col min-w-0">
                   <div className="font-bold text-[14px] text-white/90 truncate">{row.name}</div>
                   <div className="text-[10px] text-white/30 truncate">${row.volume}M 交易量 <span className="opacity-50 inline-block ml-0.5">🎁</span></div>
                </div>
             </div>
             
             {/* Middle: Prob */}
             <div className="flex items-center justify-end w-[25%] pr-2 gap-1 flex-shrink-0">
                <span className="font-extrabold text-[#E2E8F0] tracking-tight" style={{ fontSize: '17px' }}>{row.prob}%</span>
                {row.trend === 'up' ? (
                  <span className="text-[10px] text-[#4ADE80] flex items-center font-bold">
                    <TrendingUp size={10} className="mr-[1px]" /> {row.trendVal}%
                  </span>
                ) : (
                  <span className="text-[10px] text-[#F87171] flex items-center font-bold">
                    <TrendingDown size={10} className="mr-[1px]" /> {row.trendVal}%
                  </span>
                )}
             </div>
             
             {/* Right: Buttons */}
             <div className="flex items-center gap-2 w-[40%] justify-end flex-shrink-0">
                <button 
                  onClick={() => onPlaceBet?.('10', market.id)}
                  className="bg-[#1A3D2A]/80 hover:bg-[#1A3D2A] text-[#4ADE80] rounded-[6px] text-[11px] font-bold h-[34px] flex flex-col items-center justify-center w-[48%] border border-[#4ADE80]/20 transition-all active:scale-95 px-1 whitespace-nowrap"
                >
                   <span className="opacity-80 scale-[0.8] mb-[-4px]">买入是</span>
                   <span>{row.yesPriceCent}¢</span>
                </button>
                <button 
                  onClick={() => onPlaceBet?.('10', market.id)}
                  className="bg-[#3D1A1A]/80 hover:bg-[#3D1A1A] text-[#F87171] rounded-[6px] text-[11px] font-bold h-[34px] flex flex-col items-center justify-center w-[48%] border border-[#F87171]/20 transition-all active:scale-95 px-1 whitespace-nowrap"
                >
                   <span className="opacity-80 scale-[0.8] mb-[-4px]">买入否</span>
                   <span>{row.noPriceCent}¢</span>
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
