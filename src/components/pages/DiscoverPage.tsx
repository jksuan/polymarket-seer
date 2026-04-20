'use client';

import { TopHeader } from '@/components/ui/TopHeader';
import { Compass } from 'lucide-react';
import {
  DiscoverCardsContainer,
  TrendingCard,
  SplitCard,
  ClosingSoonCard
} from '@/components/ui/DiscoverCard';
import { useMatchData } from '@/hooks/useMatchData';
import { useMemo } from 'react';

export function DiscoverPage() {
  const { allMatches, isLoading } = useMatchData(true);

  // Compute dynamic discovering matches
  const { trendingMatch, splitMatch, closingSoonMatch } = useMemo(() => {
    if (!allMatches || allMatches.length === 0) return {};

    // 1. Trending: simply highest volume
    const sortedByVolume = [...allMatches].sort((a, b) => b.volume - a.volume);
    const trending = sortedByVolume[0];

    // 2. Split: tightest probability difference (e.g., closest to 0 diff), filtering out the exact same match as trending if possible
    const splitMatches = allMatches.filter(m => Math.abs(m.home.probability - m.away.probability) <= 15);
    splitMatches.sort((a, b) => Math.abs(a.home.probability - a.away.probability) - Math.abs(b.home.probability - b.away.probability));
    const split = splitMatches.find(m => m.id !== trending?.id) || splitMatches[0] || sortedByVolume[1];

    // 3. Closing soon: nearest upcoming time
    const upcoming = allMatches.filter(m => m.status === 'upcoming');
    upcoming.sort((a, b) => new Date(a.rawMarket.matchTimeISO).getTime() - new Date(b.rawMarket.matchTimeISO).getTime());
    const closing = upcoming.find(m => m.id !== trending?.id && m.id !== split?.id) || upcoming[0] || sortedByVolume[2];

    return { trendingMatch: trending, splitMatch: split, closingSoonMatch: closing };
  }, [allMatches]);

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
            {trendingMatch && <TrendingCard match={trendingMatch} />}
            {splitMatch && <SplitCard match={splitMatch} />}
            {closingSoonMatch && <ClosingSoonCard match={closingSoonMatch} />}
          </DiscoverCardsContainer>
        )}
      </div>
    </div>
  );
}
