'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Swords, Timer, ArrowUpRight } from 'lucide-react';
import { ParsedMatch } from '@/components/ui/MatchCard';
import { formatVolume } from '@/lib/utils';
import { getCountryFlagUrl } from '@/lib/countryFlags';

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
        <div className="flex items-center gap-2 inline-flex self-start">
          <Flame className="w-4 h-4 animate-pulse" style={{ color: glowColor }} />
          <span className="text-[13px] shadow-sm flex items-center gap-1" style={{ color: glowColor, fontFamily: 'Inter', fontWeight: 800, letterSpacing: '0.02em' }}>
            全网焦点
          </span>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-20 flex flex-col items-end">
         <div className="text-white/80 font-mono text-sm tracking-wider flex justify-center items-center gap-1.5">
           <span className="text-white/50 text-xs" style={{ fontFamily: 'Inter', letterSpacing: '0.02em' }}>交易量</span>
           {formatVolume(match.volume)}
         </div>
      </div>

      <div className="absolute inset-0 p-6 flex flex-col z-20 bg-gradient-to-t from-[#0D0518] via-transparent to-transparent">
        
        {/* Top spacing to avoid overlapping with badges */}
        <div className="h-10 shrink-0" />

        {/* Teams with SVG Flags (Broadcast Style) */}
        <div className="w-full flex items-center justify-center gap-6 mt-4">
          {/* Hero Team */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-[64px] h-[48px] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-white/20 relative group-hover:scale-[1.03] transition-transform duration-300 bg-[#0D0518]">
              <img src={getCountryFlagUrl(heroMatch.name, 'svg')} alt={heroMatch.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
            </div>
            <span className="text-white text-xs font-bold capitalize tracking-wide truncate max-w-[90px] text-center mt-1">
              {heroMatch.name.toLowerCase()}
            </span>
          </div>

          <div className="text-white/30 text-lg font-black italic self-start mt-4 px-2">vs</div>

          {/* Underdog Team */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-[64px] h-[48px] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-white/10 relative opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-300 bg-[#0D0518]">
              <img src={getCountryFlagUrl(underdog.name, 'svg')} alt={underdog.name} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
            </div>
            <span className="text-white text-xs font-bold capitalize tracking-wide truncate max-w-[90px] text-center mt-1">
              {underdog.name.toLowerCase()}
            </span>
          </div>
        </div>
        
        {/* Centered Market Probability (Number highlighted, Label below) */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-8">
          <div className="text-[112px] leading-[0.8] font-black tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]" style={{ color: glowColor }}>
            {heroMatch.probability}<span className="text-6xl">%</span>
          </div>
          <div className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mt-3 text-center">
            {heroMatch.name} MARKET PROBABILITY
          </div>
        </div>

        {/* Subtle Tap to Trade Hint */}
        <div className="absolute bottom-4 left-0 w-full flex justify-center mt-auto opacity-40 hover:opacity-100 transition-opacity">
          <span style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255, 255, 255, 0.68)'}}>
            点击卡片快速投注
          </span>
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
             <span className="text-white text-[11px] font-bold tracking-[0.2em] uppercase">生死局</span>
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
               {timeLeft === 'LIVE' ? '比赛中' : (isUrgent ? '即将封盘' : '下一场')}
             </span>
          </div>
          <img src={getCountryFlagUrl(match.home.name, 'svg')} alt="" className="w-8 h-8 rounded-full border border-white/20 opacity-80 object-cover" />
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

// 4. Underdog Card - 以小博大 / The Long Shot
export function UnderdogCard({ match, onClick }: { match?: ParsedMatch; onClick?: () => void }) {
  if (!match) return null;

  // The underdog is always the team with the LOWER probability
  const isHomeUnderdog = match.home.probability <= match.away.probability;
  const underdog = isHomeUnderdog ? match.home : match.away;
  const favorite = isHomeUnderdog ? match.away : match.home;

  const odds = (100 / Math.max(underdog.probability, 1)).toFixed(1);
  // Clamp odds label length for layout stability
  const oddsDisplay = parseFloat(odds) >= 10 ? parseFloat(odds).toFixed(0) : odds;

  // Dark gold color scheme
  const goldPrimary = '#F59E0B';
  const goldGlow = 'rgba(245, 158, 11, 0.25)';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative w-full h-[320px] rounded-[32px] overflow-hidden border border-amber-500/20 cursor-pointer shadow-xl bg-[#0D0518]"
    >
      {/* Background layers */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #0D0518 60%)' }} />
      <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(ellipse at top left, ${goldGlow}, transparent 65%)` }} />

      {/* Top badge */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-amber-500/10 border border-amber-500/30">
        <span className="text-amber-400 text-[14px]">⚡</span>
        <span className="text-amber-400 text-[11px] font-bold tracking-[0.2em] uppercase">以小博大</span>
      </div>

      {/* Main content */}
      <div className="absolute inset-0 p-6 flex flex-col justify-end z-20">
        {/* Underdog name */}
        <h3 className="text-white font-black italic uppercase text-4xl tracking-tighter leading-none mb-3">
          {underdog.name}
        </h3>

        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-amber-400/60 text-[10px] font-bold font-mono uppercase tracking-widest">冷门赔率</div>
            {/* Giant odds multiplier */}
            <div
              className="font-black tracking-tighter leading-none"
              style={{
                fontSize: '72px',
                color: goldPrimary,
                filter: `drop-shadow(0 0 18px ${goldPrimary}80)`,
                lineHeight: 1,
              }}
            >
              {oddsDisplay}<span className="text-3xl align-baseline">x</span>
            </div>
            <div className="text-white/40 text-[11px] font-mono tracking-wide">
              胜率仅 <span className="text-amber-400 font-bold">{underdog.probability}%</span>
            </div>
          </div>

          {/* CTA button */}
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-all duration-300 mb-2"
            style={{
              background: `linear-gradient(135deg, ${goldPrimary}, #D97706)`,
              boxShadow: `0 0 24px ${goldPrimary}50`,
            }}
          >
            <span className="text-[#0D0518] text-[22px] font-black">⚡</span>
          </button>
        </div>
      </div>

      {/* Watermark */}
      <div className="absolute -right-8 top-8 text-[160px] leading-none font-black italic select-none pointer-events-none rotate-12"
        style={{ color: `${goldPrimary}06` }}>
        {underdog.shortCode}
      </div>
    </motion.div>
  );
}

// ── Horizontal Row: 横滑小卡补充列 ──────────────────────────────
interface HorizontalMatchRowProps {
  label: string;
  matches: ParsedMatch[];
  onClick?: (match: ParsedMatch) => void;
  accentColor?: string;
}

export function HorizontalMatchRow({ label, matches, onClick, accentColor = '#6bff8f' }: HorizontalMatchRowProps) {
  if (!matches || matches.length === 0) return null;

  return (
    <div className="w-full -mt-2">


      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {matches.map((match) => {
          const homeColor = match.home.style.primary || '#6bff8f';
          const awayColor = match.away.style.primary || '#00F0FF';

          return (
            <motion.button
              key={match.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onClick?.(match)}
              className="flex-shrink-0 w-[168px] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0D0518] relative cursor-pointer"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
            >
              {/* Color stripe at top */}
              <div className="h-[3px] w-full" style={{ background: `linear-gradient(to right, ${homeColor}, ${awayColor})` }} />
              <div className="p-3 flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-[11px] font-bold truncate max-w-[80px]">{match.home.name}</span>
                    <span className="text-[11px] font-black font-mono" style={{ color: homeColor }}>{match.home.probability}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-[11px] font-bold truncate max-w-[80px]">{match.away.name}</span>
                    <span className="text-[11px] font-black font-mono" style={{ color: awayColor }}>{match.away.probability}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-white/30 text-[9px] font-mono uppercase tracking-widest">VOL</span>
                  <span className="text-white/70 text-[10px] font-bold font-mono">{formatVolume(match.volume)}</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
