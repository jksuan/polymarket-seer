'use client';

import { TopHeader } from '@/components/ui/TopHeader';
import { Compass, X } from 'lucide-react';
import {
  DiscoverCardsContainer,
  TrendingCard,
  SplitCard,
  ClosingSoonCard,
  UnderdogCard,
  HorizontalMatchRow
} from '@/components/ui/DiscoverCard';
import { useMatchData } from '@/hooks/useMatchData';
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ParsedMatch } from '@/components/ui/MatchCard';

interface DiscoverPageProps {
  onPlaceBet?: (amount: string, tokenId: string, executionPrice?: number) => Promise<void>;
  positions?: any[];
}

export function DiscoverPage({ onPlaceBet, positions }: DiscoverPageProps) {
  const { allMatches, isLoading } = useMatchData(true);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  // States for Quick-Pick & Real Drawer
  const [quickPickMatch, setQuickPickMatch] = useState<ParsedMatch | null>(null);
  const [confirmAction, setConfirmAction] = useState<{match: ParsedMatch, side: 'home'|'away'|'draw'} | null>(null);

  // States for Stage/Playlist Master-Detail Cast
  const [activeTrendingMatchId, setActiveTrendingMatchId] = useState<string | null>(null);
  const [activeSplitMatchId, setActiveSplitMatchId] = useState<string | null>(null);

  // Compute dynamic discovering matches
  const { trendingMatch, splitMatch, closingSoonMatch, trendingRest, splitRest, closingRest, underdogMatch, underdogRest } = useMemo(() => {
    if (!allMatches || allMatches.length === 0) return {};

    // 1. Trending: simply highest volume
    const sortedByVolume = [...allMatches].sort((a, b) => b.volume - a.volume);
    const trending = sortedByVolume[0];

    // 2. Split: tightest probability difference, filtering out trending
    const splitMatches = allMatches.filter(m => Math.abs(m.home.probability - m.away.probability) <= 15);
    splitMatches.sort((a, b) => Math.abs(a.home.probability - a.away.probability) - Math.abs(b.home.probability - b.away.probability));
    const split = splitMatches.find(m => m.id !== trending?.id) || splitMatches[0] || sortedByVolume[1];

    // 3. Closing soon: nearest upcoming time
    const upcoming = allMatches.filter(m => m.status === 'upcoming');
    upcoming.sort((a, b) => new Date(a.rawMarket.matchTimeISO).getTime() - new Date(b.rawMarket.matchTimeISO).getTime());
    const closing = upcoming.find(m => m.id !== trending?.id && m.id !== split?.id) || upcoming[0] || sortedByVolume[2];

    // Secondary horizontal row lists (exclude the hero card itself)
    // trendingRest: Vol 2-6 by volume, skip the trending hero
    const trendingRest = sortedByVolume.filter(m => m.id !== trending?.id).slice(0, 6);

    // splitRest: other deathmatch candidates, skip hero; sorted by tightness
    const splitRest = splitMatches.filter(m => m.id !== split?.id && m.id !== trending?.id).slice(0, 6);

    // closingRest: other upcoming matches near the same time window (next 2 within same day)
    const closingRest = upcoming.filter(m => m.id !== closing?.id && m.id !== trending?.id).slice(0, 6);

    // 4. Underdog: team with lowest probability in 5-20% range (best legitimate long shot)
    //    Sort by ascending probability (lowest = most extreme underdog)
    const underdogCandidates = allMatches
      .filter(m => {
        const minProb = Math.min(m.home.probability, m.away.probability);
        return minProb >= 5 && minProb <= 20;
      })
      .sort((a, b) =>
        Math.min(a.home.probability, a.away.probability) - Math.min(b.home.probability, b.away.probability)
      );
    const underdog = underdogCandidates.find(
      m => m.id !== trending?.id && m.id !== split?.id && m.id !== closing?.id
    ) || underdogCandidates[0];
    const underdogRest = underdogCandidates.filter(m => m.id !== underdog?.id).slice(0, 6);

    return { trendingMatch: trending, splitMatch: split, closingSoonMatch: closing, trendingRest, splitRest, closingRest, underdogMatch: underdog, underdogRest };
  }, [allMatches]);

  // Helper handling QuickPick interaction
  const handleCardClick = (match?: ParsedMatch) => {
    if (match) setQuickPickMatch(match);
  };

  // Derive the active master match for Trending
  const trendingCarousel = useMemo(() => [trendingMatch, ...(trendingRest || [])].filter(Boolean) as ParsedMatch[], [trendingMatch, trendingRest]);
  const displayTrendingMatch = useMemo(() => trendingCarousel.find(m => m.id === activeTrendingMatchId) || trendingCarousel[0], [trendingCarousel, activeTrendingMatchId]);

  // Derive the active master match for Split
  const splitCarousel = useMemo(() => [splitMatch, ...(splitRest || [])].filter(Boolean) as ParsedMatch[], [splitMatch, splitRest]);
  const displaySplitMatch = useMemo(() => splitCarousel.find(m => m.id === activeSplitMatchId) || splitCarousel[0], [splitCarousel, activeSplitMatchId]);

  return (
    <div className="pb-32 min-h-[100dvh]">
      <TopHeader isSticky={true} />
      
      <div className="px-5 mt-6">
        {isLoading && !allMatches?.length ? (
          <div className="flex justify-center items-center h-48">
            <span className="text-[#6bff8f] animate-pulse font-mono tracking-widest text-xs uppercase">Loading Market Data...</span>
          </div>
        ) : (
          <DiscoverCardsContainer>
            {displayTrendingMatch && <TrendingCard match={displayTrendingMatch} onClick={() => handleCardClick(displayTrendingMatch)} />}
            <HorizontalMatchRow
              label="热门赛事"
              matches={trendingCarousel}
              onClick={(match) => setActiveTrendingMatchId(match.id)} // Cast to main stage instead of action drawer
              activeMatchId={displayTrendingMatch?.id}
              accentColor="#ff6b35"
            />
            {displaySplitMatch && <SplitCard match={displaySplitMatch} onClick={() => handleCardClick(displaySplitMatch)} />}
            <HorizontalMatchRow
              label="势均力敌"
              matches={splitCarousel}
              onClick={(match) => setActiveSplitMatchId(match.id)}
              activeMatchId={displaySplitMatch?.id}
              accentColor="#a855f7"
            />
            {closingSoonMatch && <ClosingSoonCard match={closingSoonMatch} onClick={() => handleCardClick(closingSoonMatch)} />}
            {(closingRest ?? []).length >= 2 && (
              <HorizontalMatchRow
                label="即将开赛"
                matches={closingRest ?? []}
                onClick={handleCardClick}
                accentColor="#00F0FF"
              />
            )}
            {underdogMatch && <UnderdogCard match={underdogMatch} onClick={() => handleCardClick(underdogMatch)} />}
            {(underdogRest ?? []).length >= 1 && (
              <HorizontalMatchRow
                label="冷门博彩"
                matches={underdogRest ?? []}
                onClick={handleCardClick}
                accentColor="#F59E0B"
              />
            )}
          </DiscoverCardsContainer>
        )}
      </div>

      {/* 1. Quick-Pick Action Sheet Overlay (Portaled) */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {quickPickMatch && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setQuickPickMatch(null)}
                className="absolute inset-0 bg-[#000000] backdrop-blur-md pointer-events-auto"
                style={{ opacity: 0.85 }}
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-[448px] mx-auto bg-[#0D0518] rounded-t-[32px] p-6 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pb-safe pointer-events-auto"
                style={{ maxHeight: '85vh', overflowY: 'auto' }}
              >
                <div className="flex justify-between items-center mb-6">
                   <div>
                     <h2 className="text-white font-black italic text-4xl tracking-tighter uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px]">Choose Side</h2>
                     <p className="text-[#6bff8f] text-[10px] uppercase font-bold tracking-widest mt-1">{quickPickMatch.title}</p>
                   </div>
                   <button onClick={() => setQuickPickMatch(null)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 active:scale-90 transition-transform">
                     <X size={20} />
                   </button>
                </div>

                <div className="flex flex-col gap-3 mb-4">
                   <button 
                     onClick={() => { setConfirmAction({ match: quickPickMatch, side: 'home' }); setQuickPickMatch(null); }}
                     className="flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-all bg-gradient-to-r"
                     style={{ 
                       backgroundImage: `linear-gradient(to right, ${quickPickMatch.home.style.primary}15, transparent)`, 
                       border: `1px solid ${quickPickMatch.home.style.primary}40` 
                     }}
                   >
                     <div className="flex items-center gap-4">
                       <img src={quickPickMatch.home.flagUrl} alt="" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                       <div className="flex flex-col items-start gap-0.5">
                         <span className="text-white font-bold text-lg leading-none">{quickPickMatch.home.name} 胜</span>
                       </div>
                     </div>
                     <div className="text-right">
                        <div className="text-white font-black text-2xl tracking-tighter">{quickPickMatch.home.probability}%</div>
                        <div className="text-[12px] font-mono tracking-wider" style={{ color: quickPickMatch.home.style.primary }}>{(100/Math.max(quickPickMatch.home.probability, 1)).toFixed(2)}x</div>
                     </div>
                   </button>

                   {quickPickMatch.draw.probability > 0 && (
                     <button 
                       onClick={() => { setConfirmAction({ match: quickPickMatch, side: 'draw' }); setQuickPickMatch(null); }}
                       className="flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-all"
                       style={{ backgroundColor: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.1)` }}
                     >
                       <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-black">VS</div>
                         <span className="text-white/80 font-bold text-lg leading-none">平局 DRAW</span>
                       </div>
                       <div className="text-right">
                          <div className="text-white font-black text-2xl tracking-tighter">{quickPickMatch.draw.probability}%</div>
                          <div className="text-[12px] font-mono tracking-wider text-white/50">{(100/Math.max(quickPickMatch.draw.probability, 1)).toFixed(2)}x</div>
                       </div>
                     </button>
                   )}

                   <button 
                     onClick={() => { setConfirmAction({ match: quickPickMatch, side: 'away' }); setQuickPickMatch(null); }}
                     className="flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-all bg-gradient-to-l"
                     style={{ 
                       backgroundImage: `linear-gradient(to left, ${quickPickMatch.away.style.primary}15, transparent)`, 
                       border: `1px solid ${quickPickMatch.away.style.primary}40` 
                     }}
                   >
                     <div className="flex items-center gap-4">
                       <img src={quickPickMatch.away.flagUrl} alt="" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                       <div className="flex flex-col items-start gap-0.5">
                         <span className="text-white font-bold text-lg leading-none">{quickPickMatch.away.name} 胜</span>
                       </div>
                     </div>
                     <div className="text-right">
                        <div className="text-white font-black text-2xl tracking-tighter">{quickPickMatch.away.probability}%</div>
                        <div className="text-[12px] font-mono tracking-wider" style={{ color: quickPickMatch.away.style.primary }}>{(100/Math.max(quickPickMatch.away.probability, 1)).toFixed(2)}x</div>
                     </div>
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 2. Real Trading Terminal Drawer */}
      {confirmAction && (
        <ConfirmModal
          isOpen={true}
          market={confirmAction.match.rawMarket}
          side={confirmAction.side}
          tokenId={
            confirmAction.side === 'draw' 
              ? confirmAction.match.draw.tokenId 
              : confirmAction.side === 'home' 
                ? confirmAction.match.home.tokenId 
                : confirmAction.match.away.tokenId
          }
          outrightInfo={{
            title: confirmAction.side === 'draw'
              ? `${confirmAction.match.home.name} vs ${confirmAction.match.away.name} — 平局`
              : confirmAction.side === 'home'
                ? `${confirmAction.match.home.name} 胜`
                : `${confirmAction.match.away.name} 胜`,
            directionLabel: confirmAction.side === 'draw' ? '买入平局' : confirmAction.side === 'home' ? `买入 ${confirmAction.match.home.name} 胜` : `买入 ${confirmAction.match.away.name} 胜`,
            probability: confirmAction.side === 'draw'
              ? confirmAction.match.draw.probability
              : confirmAction.side === 'home'
                ? confirmAction.match.home.probability
                : confirmAction.match.away.probability,
            odds: confirmAction.side === 'draw'
              ? 100 / Math.max(confirmAction.match.draw.probability, 1)
              : confirmAction.side === 'home'
                ? 100 / Math.max(confirmAction.match.home.probability, 1)
                : 100 / Math.max(confirmAction.match.away.probability, 1),
            primaryColor: confirmAction.side === 'home' ? confirmAction.match.home.style.primary : confirmAction.side === 'draw' ? '#334155' : confirmAction.match.away.style.primary,
            accentColor: confirmAction.side === 'home' ? confirmAction.match.home.style.accent : confirmAction.side === 'draw' ? '#475569' : confirmAction.match.away.style.accent,
            glowColor: confirmAction.side === 'home' ? confirmAction.match.home.style.glow : confirmAction.side === 'draw' ? 'rgba(51,65,85,0.4)' : confirmAction.match.away.style.glow,
            badgeText: confirmAction.side === 'draw'
              ? 'DRW'
              : confirmAction.side === 'home'
                ? confirmAction.match.home.shortCode
                : confirmAction.match.away.shortCode,
          }}
          onConfirm={async (amount, executionPrice) => {
            const tokenId = confirmAction.side === 'draw' 
              ? confirmAction.match.draw.tokenId 
              : confirmAction.side === 'home' 
                ? confirmAction.match.home.tokenId 
                : confirmAction.match.away.tokenId;
            setConfirmAction(null);
            if (onPlaceBet) {
              await onPlaceBet(amount.toString(), tokenId, executionPrice);
            }
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
