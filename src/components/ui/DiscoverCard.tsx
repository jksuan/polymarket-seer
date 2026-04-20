'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Swords, Timer, ArrowUpRight } from 'lucide-react';
import { ParsedMatch } from '@/components/ui/MatchCard';
import { formatVolume } from '@/lib/utils';

export function DiscoverCardsContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {children}
    </div>
  );
}

// 1. Trending Card - The 24H Volume Focus
export function TrendingCard({ match, onClick }: { match?: ParsedMatch; onClick?: () => void }) {
  if (!match) return null;
  // Use the team with the higher probability as the hero
  const isHomeFavored = match.home.probability >= match.away.probability;
  const heroMatch = isHomeFavored ? match.home : match.away;
  const underdog = isHomeFavored ? match.away : match.home;

  const glowColor = heroMatch.style.primary || '#6bff8f';
  // Calculate approximate payout multiplier (e.g. 67% -> $0.67 -> 1.49x return)
  const payoutMultiplier = (100 / (heroMatch.probability || 1)).toFixed(2);

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative w-full h-[400px] rounded-[32px] overflow-hidden border border-white/10 group cursor-pointer shadow-xl"
    >
      <div className="absolute inset-0 bg-[#0D0518]" />
      {/* Dynamic Background Glow based on hero team's primary color */}
      <div 
        className="absolute inset-0 opacity-80" 
        style={{ background: `linear-gradient(to bottom right, ${glowColor}20, #0D0518, #0D0518)` }}
      />
      
      {/* Glowing Tag & Meta */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-white/5 border border-white/20 px-3 py-1.5 rounded-full backdrop-blur-md inline-flex self-start">
          <Flame className="w-4 h-4 animate-pulse" style={{ color: glowColor }} />
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase shadow-sm flex items-center gap-1" style={{ color: glowColor }}>
            Volume: {formatVolume(match.volume)}
            <span className="text-white/60 ml-1 text-[9px]">+24%</span>
          </span>
        </div>
      </div>

      <div className="absolute inset-0 p-6 flex flex-col justify-end z-20 bg-gradient-to-t from-[#0D0518] via-[#0D0518]/70 to-transparent">
        <h3 className="text-white text-5xl font-black italic uppercase leading-[0.9] tracking-tighter mb-4 text-shadow-sm flex flex-col">
          <span>{heroMatch.name}</span>
          <span className="text-3xl text-white/60 drop-shadow-md">VS {underdog.name}</span>
        </h3>
        
        <div className="flex items-end justify-between mt-2">
          <div className="flex items-end gap-4">
            <div>
              <div className="text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest mb-1">Market Probability</div>
              <div className="text-[64px] leading-none font-black tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ color: glowColor }}>
                {heroMatch.probability}<span className="text-3xl">%</span>
              </div>
            </div>
            {/* ROI Payout Badge */}
            <div className="mb-2 bg-[#0D0518]/50 border px-3 py-2 rounded-xl backdrop-blur-md flex flex-col items-center justify-center" style={{ borderColor: `${glowColor}40` }}>
               <span className="text-[9px] text-white/50 uppercase font-bold tracking-[0.1em] mb-0.5">EST. PAYOUT</span>
               <span className="text-base font-black tracking-tighter text-white drop-shadow-md">{payoutMultiplier}x</span>
            </div>
          </div>
          
          <button 
            className="w-16 h-16 rounded-full text-[#0D0518] flex items-center justify-center group-hover:scale-105 active:scale-95 transition-all duration-300"
            style={{ backgroundColor: glowColor, boxShadow: `0 0 20px ${glowColor}60` }}
          >
            <ArrowUpRight className="w-8 h-8" />
          </button>
        </div>
      </div>
      
      {/* Dynamic massive background watermark */}
      <div className="absolute -right-12 top-10 text-[180px] leading-none font-black italic text-white/[0.03] select-none pointer-events-none rotate-12 mix-blend-overlay">
        {heroMatch.shortCode}
      </div>
    </motion.div>
  );
}

// 2. 50/50 Split Card - The High Tension Deathmatch
export function SplitCard({ match, onClick }: { match?: ParsedMatch; onClick?: () => void }) {
  if (!match) return null;
  const homeColor = match.home.style.primary;
  const awayColor = match.away.style.primary;
  
  // Calculate remaining probability for Draw
  const combinedProb = match.home.probability + match.away.probability;
  const drawProb = Math.max(0, 100 - combinedProb);
  const drawPayout = drawProb > 0 ? (100 / drawProb).toFixed(1) : null;

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative w-full h-[320px] rounded-[32px] overflow-hidden border border-white/5 cursor-pointer bg-[#0D0518] shadow-xl"
    >
      {/* Diagonal Split Backgrounds using dynamic team colors */}
      <div className="absolute inset-0 z-0 opacity-60 mix-blend-screen">
        <div className="absolute inset-0 w-full h-full" style={{ background: `linear-gradient(to bottom right, ${homeColor}40, transparent)`, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
        <div className="absolute inset-0 w-full h-full" style={{ background: `linear-gradient(to top left, ${awayColor}40, transparent)`, clipPath: 'polygon(100% 100%, 0 100%, 100% 0)' }} />
      </div>

      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
         <div className="w-[150%] h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[35deg] drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
        <div className="text-white/90 text-7xl font-black italic drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] tracking-tighter">
          VS
        </div>
      </div>

      <div className="absolute inset-0 z-20 flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
           <div className="flex items-center gap-2 self-start bg-white/5 border border-white/10 backdrop-blur-xl px-3 py-1.5 rounded-full">
             <Swords className="w-4 h-4 text-white" />
             <span className="text-white text-[11px] font-bold tracking-[0.2em] uppercase">Deathmatch</span>
           </div>
           
           <div className="text-right">
             <div className="text-white/40 text-[9px] font-bold tracking-[0.2em] uppercase">Total Pool</div>
             <div className="text-white/80 font-mono text-sm tracking-wider">{formatVolume(match.volume)}</div>
           </div>
        </div>

        <div className="flex w-full justify-between items-end mb-2 relative">
          
          {/* Middle Draw Element (Implicit spread info) */}
          {drawProb > 0 && (
             <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center bg-[#0D0518]/60 border border-white/10 backdrop-blur-md px-4 py-2 rounded-xl scale-90 opacity-90 z-40">
                <span className="text-[9px] text-white/50 font-bold tracking-[0.2em] uppercase">DRAW (平局)</span>
                <div className="flex gap-2 items-baseline mt-0.5">
                   <span className="text-white font-mono font-bold">{drawProb}%</span>
                   <span className="text-[#6bff8f] text-[10px] font-bold tracking-wider">x{drawPayout}</span>
                </div>
             </div>
          )}

          {/* Left Team */}
          <div className="flex flex-col z-30 w-[85px]">
            <span className="text-white/60 font-bold uppercase text-[10px] mb-2 tracking-[0.2em] break-words line-clamp-2 leading-tight min-h-[30px]">{match.home.name}</span>
            <div className="border text-white font-black text-3xl w-20 py-3 rounded-xl flex justify-center backdrop-blur-md"
                 style={{ backgroundColor: `${homeColor}30`, borderColor: `${homeColor}60`, boxShadow: `0 0 20px ${homeColor}40` }}>
              {match.home.probability}%
            </div>
            <div className="mt-2 text-[10px] text-white/40 font-mono tracking-widest text-center uppercase">payout <span className="text-white/80 font-bold">{(100 / Math.max(match.home.probability, 1)).toFixed(1)}x</span></div>
          </div>

          {/* Right Team */}
          <div className="flex flex-col items-end z-30 w-[85px]">
             <span className="text-white/60 font-bold uppercase text-[10px] mb-2 tracking-[0.2em] text-right break-words line-clamp-2 leading-tight min-h-[30px]">{match.away.name}</span>
             <div className="border text-white font-black text-3xl w-20 py-3 rounded-xl flex justify-center backdrop-blur-md"
                  style={{ backgroundColor: `${awayColor}30`, borderColor: `${awayColor}60`, boxShadow: `0 0 20px ${awayColor}40` }}>
              {match.away.probability}%
            </div>
            <div className="mt-2 text-[10px] text-white/40 font-mono tracking-widest text-center uppercase">payout <span className="text-white/80 font-bold">{(100 / Math.max(match.away.probability, 1)).toFixed(1)}x</span></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 3. Closing Soon / Next Match Card - FOMO Timer
export function ClosingSoonCard({ match, onClick }: { match?: ParsedMatch; onClick?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
  const [isUrgent, setIsUrgent] = useState<boolean>(true);

  useEffect(() => {
    if (!match) return;
    const targetTime = new Date(match.rawMarket.matchTimeISO).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = targetTime - now;
      
      if (diff <= 0) {
        setTimeLeft('LIVE');
        setIsUrgent(true);
        return;
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      // Urgent means less than 24 hours
      setIsUrgent(d === 0);

      if (d > 0) {
        setTimeLeft(`${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [match]);

  if (!match) return null;

  const isFarAway = timeLeft.includes('d');

  // Dynamic styling based on urgency
  const glowTheme = isUrgent 
    ? "from-rose-500/15" 
    : "from-[#00F0FF]/15"; // Cyan for calm
  
  const labelColor = isUrgent ? "text-rose-500" : "text-[#00F0FF]";
  const borderBgColor = isUrgent ? "bg-rose-500/10 border-rose-500/30" : "bg-[#00F0FF]/10 border-[#00F0FF]/30";
  const timerShadow = isUrgent ? "drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]";

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative w-full h-[240px] rounded-[32px] overflow-hidden border cursor-pointer shadow-xl ${isUrgent ? 'border-rose-500/20' : 'border-[#00F0FF]/20'} bg-[#0D0518]`}
    >
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] ${glowTheme} via-[#0D0518]/50 to-[#0D0518] scale-125`} />
      
      <div className="absolute inset-0 p-6 z-20 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className={`${borderBgColor} px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md inline-flex`}>
             <Timer className={`w-4 h-4 ${labelColor} ${isUrgent ? 'animate-pulse' : ''}`} />
             <span className={`${labelColor} text-[11px] font-bold uppercase tracking-[0.2em]`}>
               {timeLeft === 'LIVE' ? 'Match Started' : (isUrgent ? 'Closing Soon' : 'Next Match')}
             </span>
          </div>
          <img src={match.home.flagUrl} alt="" className="w-8 h-8 rounded-full border border-white/20 opacity-80" />
        </div>

        <div className="flex flex-col">
           <h4 className="text-white/90 font-bold text-xl mb-4 pr-10 leading-tight">
            {match.title}
           </h4>
           <div 
             className={`${labelColor} font-mono leading-none font-black tracking-tighter ${timerShadow} ${isFarAway ? 'text-[42px]' : 'text-[56px]'}`}
           >
             {timeLeft}
           </div>
        </div>
      </div>
    </motion.div>
  );
}
