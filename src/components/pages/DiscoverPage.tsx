'use client';

import { TopHeader } from '@/components/ui/TopHeader';
import { Compass, X } from 'lucide-react';
import { useTranslation, translateCountryName } from '@/i18n';
import {
  DiscoverCardsContainer,
  TrendingCard,
  SplitCard,
  UnderdogCard,
  HorizontalMatchRow,
  ChampionCard,
  ChampionPlaylist,
  parseChampionTeams,
  ChampionTeam
} from '@/components/ui/DiscoverCard';
import { useMatchData } from '@/hooks/useMatchData';
import { useOutrightData } from '@/hooks/useOutrightData';
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ChooseSideDrawer } from '@/components/ui/ChooseSideDrawer';
import { ParsedMatch } from '@/components/ui/MatchCard';

interface DiscoverPageProps {
  onPlaceBet?: (amount: string, tokenId: string, executionPrice?: number) => Promise<void>;
  positions?: any[];
}

export function DiscoverPage({ onPlaceBet, positions }: DiscoverPageProps) {
  const { allMatches, isLoading: isMatchLoading } = useMatchData(true);
  const { markets: outrightMarkets, isLoading: isOutrightLoading } = useOutrightData(true, 'World Cup Winner');
  const { t, locale } = useTranslation();
  const cn = (name: string) => translateCountryName(name, locale);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  // States for Quick-Pick & Real Drawer
  const [quickPickMatch, setQuickPickMatch] = useState<ParsedMatch | null>(null);
  const [confirmAction, setConfirmAction] = useState<{match: ParsedMatch, side: 'home'|'away'|'draw'} | null>(null);

  // States for Stage/Playlist Master-Detail Cast
  const [activeTrendingMatchId, setActiveTrendingMatchId] = useState<string | null>(null);
  const [activeSplitMatchId, setActiveSplitMatchId] = useState<string | null>(null);
  const [activeUnderdogMatchId, setActiveUnderdogMatchId] = useState<string | null>(null);
  const [activeChampionIdx, setActiveChampionIdx] = useState(0);

  // Champion: find the World Cup Winner market and parse teams
  const championMarket = useMemo(() => {
    const candidates = outrightMarkets
      .filter(m => (m.rawOutcomes?.length || 0) > 10)
      .sort((a, b) => (b.rawOutcomes?.length || 0) - (a.rawOutcomes?.length || 0));
    return candidates[0] || null;
  }, [outrightMarkets]);

  const championTeams = useMemo(() => championMarket ? parseChampionTeams(championMarket) : [], [championMarket]);
  const displayChampionTeam = championTeams[activeChampionIdx] || championTeams[0];

  // Champion confirm state
  const [championConfirm, setChampionConfirm] = useState<ChampionTeam | null>(null);

  // Compute dynamic discovering matches
  const { trendingMatch, splitMatch, trendingRest, splitRest, underdogMatch, underdogRest } = useMemo(() => {
    if (!allMatches || allMatches.length === 0) return {};

    // 1. Trending: simply highest volume
    const sortedByVolume = [...allMatches].sort((a, b) => b.volume - a.volume);
    const trending = sortedByVolume[0];

    // 2. Split: tightest probability difference, filtering out trending
    const splitMatches = allMatches.filter(m => Math.abs(m.home.probability - m.away.probability) <= 15);
    splitMatches.sort((a, b) => Math.abs(a.home.probability - a.away.probability) - Math.abs(b.home.probability - b.away.probability));
    const split = splitMatches.find(m => m.id !== trending?.id) || splitMatches[0] || sortedByVolume[1];

    // Secondary horizontal row lists (exclude the hero card itself)
    // trendingRest: Vol 2-6 by volume, skip the trending hero
    const trendingRest = sortedByVolume.filter(m => m.id !== trending?.id).slice(0, 6);

    // splitRest: other deathmatch candidates, skip hero; sorted by tightness
    const splitRest = splitMatches.filter(m => m.id !== split?.id && m.id !== trending?.id).slice(0, 6);

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
      m => m.id !== trending?.id && m.id !== split?.id
    ) || underdogCandidates[0];
    const underdogRest = underdogCandidates.filter(m => m.id !== underdog?.id).slice(0, 6);

    return { trendingMatch: trending, splitMatch: split, trendingRest, splitRest, underdogMatch: underdog, underdogRest };
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

  // Derive the active master match for Underdog
  const underdogCarousel = useMemo(() => [underdogMatch, ...(underdogRest || [])].filter(Boolean) as ParsedMatch[], [underdogMatch, underdogRest]);
  const displayUnderdogMatch = useMemo(() => underdogCarousel.find(m => m.id === activeUnderdogMatchId) || underdogCarousel[0], [underdogCarousel, activeUnderdogMatchId]);

  return (
    <div className="pb-32 min-h-[100dvh]">
      <TopHeader isSticky={true} />
      
      <div className="px-5 mt-6">
        {(isMatchLoading && !allMatches?.length) || (isOutrightLoading && !outrightMarkets?.length) ? (
          <div className="flex justify-center items-center h-48">
            <span className="text-[#6bff8f] animate-pulse font-mono tracking-widest text-xs uppercase">{t.discover.loadingMarket}</span>
          </div>
        ) : (
          <DiscoverCardsContainer>
            {/* ── 1. Champion: 夺冠热门 ── */}
            {displayChampionTeam && (
              <ChampionCard
                team={displayChampionTeam}
                onClick={() => setChampionConfirm(displayChampionTeam)}
              />
            )}
            {championTeams.length > 0 && (
              <ChampionPlaylist
                teams={championTeams}
                activeIndex={activeChampionIdx}
                onSelect={(idx) => setActiveChampionIdx(idx)}
              />
            )}

            {/* ── 2. Trending: 热门赛事 ── */}
            {displayTrendingMatch && <TrendingCard match={displayTrendingMatch} onClick={() => handleCardClick(displayTrendingMatch)} />}
            <HorizontalMatchRow
              label={t.discover.hotMatches}
              matches={trendingCarousel}
              onClick={(match) => setActiveTrendingMatchId(match.id)}
              activeMatchId={displayTrendingMatch?.id}
              accentColor="#ff6b35"
            />

            {/* ── 3. Split: 势均力敌 ── */}
            {displaySplitMatch && <SplitCard match={displaySplitMatch} onClick={() => handleCardClick(displaySplitMatch)} />}
            <HorizontalMatchRow
              label={t.discover.split}
              matches={splitCarousel}
              onClick={(match) => setActiveSplitMatchId(match.id)}
              activeMatchId={displaySplitMatch?.id}
              accentColor="#a855f7"
            />

            {/* ── 4. Underdog: 以小博大 ── */}
            {displayUnderdogMatch && <UnderdogCard match={displayUnderdogMatch} onClick={() => handleCardClick(displayUnderdogMatch)} />}
            {underdogCarousel.length >= 2 && (
              <HorizontalMatchRow
                label="LONG SHOT"
                matches={underdogCarousel}
                onClick={(match) => setActiveUnderdogMatchId(match.id)}
                activeMatchId={displayUnderdogMatch?.id}
                accentColor="#FF2A6D"
                underdogMode={true}
              />
            )}
          </DiscoverCardsContainer>
        )}
      </div>

      {/* 1. Quick-Pick Action Sheet Overlay (Portaled) */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <ChooseSideDrawer
          isOpen={!!quickPickMatch}
          onClose={() => setQuickPickMatch(null)}
          match={quickPickMatch}
          onSelectSide={(side) => {
             setConfirmAction({ match: quickPickMatch!, side });
             setQuickPickMatch(null);
          }}
        />,
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
              ? `${cn(confirmAction.match.home.name)} vs ${cn(confirmAction.match.away.name)} — ${t.trade.draw}`
              : confirmAction.side === 'home'
                ? `${cn(confirmAction.match.home.name)} ${t.discover.win}`
                : `${cn(confirmAction.match.away.name)} ${t.discover.win}`,
            directionLabel: confirmAction.side === 'draw' ? `${t.trade.buy} ${t.trade.draw}` : confirmAction.side === 'home' ? `${t.trade.buy} ${cn(confirmAction.match.home.name)} ${t.discover.win}` : `${t.trade.buy} ${cn(confirmAction.match.away.name)} ${t.discover.win}`,
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

      {/* 4. Champion Outright ConfirmModal */}
      {championConfirm && championMarket && (() => {
        const idx = championConfirm.originalIndex;
        const price = championMarket.rawPrices?.[idx] ?? 0.05;
        const prob = Number((price * 100).toFixed(1));
        const odds = 1 / Math.max(price, 0.01);
        const tokenId = championMarket.rawTokenIds?.[idx]?.[0] || '';
        return (
          <ConfirmModal
            isOpen={true}
            market={championMarket}
            side="home"
            tokenId={tokenId}
            outrightInfo={{
              title: `${championMarket.question} - ${championConfirm.name}`,
              directionLabel: t.discover.buyYes,
              probability: prob,
              odds,
              primaryColor: '#00C85A',
              accentColor: '#00A040',
              glowColor: 'rgba(0,200,90,0.4)',
              badgeText: t.trade.buy,
            }}
            onConfirm={async (amount, executionPrice) => {
              setChampionConfirm(null);
              if (onPlaceBet) {
                await onPlaceBet(amount.toString(), tokenId, executionPrice);
              }
            }}
            onCancel={() => setChampionConfirm(null)}
          />
        );
      })()}
    </div>
  );
}
