'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { CategoryTabs } from '@/components/ui/CategoryTabs';
import { TopHeader } from '@/components/ui/TopHeader';
import { MarketCard } from '@/components/ui/MarketCard';
import { SportCategory, SportMarket } from '@/types/sports';

export function HomePage({ onPlaceBet }: { onPlaceBet?: (amount: string, tokenId: string) => Promise<void> }) {
  const [activeCategory, setActiveCategory] = useState<SportCategory>('all');
  const [liveMarkets, setLiveMarkets] = useState<SportMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDynamicMarkets() {
      setIsLoading(true);
      try {
        // Map our category tabs to Polymarket search keywords
        let keyword = 'sports';
        if (activeCategory === 'nba') keyword = 'NBA';
        if (activeCategory === 'ucl') keyword = 'Champions League';
        if (activeCategory === 'premier-league') keyword = 'Premier League';
        if (activeCategory === 'tennis') keyword = 'Tennis';
        
        const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
        const events = await res.json();

        const mapped: SportMarket[] = [];
        
        if (Array.isArray(events)) {
          for (const evt of events) {
            if (evt.markets && evt.markets.length > 0) {
                const m = evt.markets[0];
                // Safely attempt to parse Polymarket's stringified JSON arrays
                let outcomes = ["Yes", "No"];
                let prices = ["0.5", "0.5"];
                try { outcomes = JSON.parse(m.outcomes || '["Yes", "No"]'); } catch(e){}
                try { prices = JSON.parse(m.outcomePrices || '["0.5", "0.5"]'); } catch(e){}
                
                const hProb = Math.round(parseFloat(prices[0] || '0.5') * 100);
                const aProb = Math.round(parseFloat(prices[1] || '0.5') * 100);
                
                mapped.push({
                  id: evt.id,
                  polymarketConditionId: m.conditionId,
                  question: evt.title,
                  sport: activeCategory,
                  leagueName: 'Gamma Live',
                  leagueCode: 'GL',
                  leagueNameEn: 'POLYMARKET',
                  status: m.closed ? 'ended' : 'live',
                  matchTime: 'Real-Time',
                  matchTimeISO: new Date().toISOString(),
                  homeTeam: {
                    shortName: outcomes[0]?.slice(0,3).toUpperCase() || 'YES',
                    displayName: outcomes[0] || 'Yes',
                    fullName: outcomes[0] || 'Yes',
                    primaryColor: '#00F0FF',
                    accentColor: '#0099FF',
                    glowColor: 'rgba(0,153,255,0.4)'
                  },
                  awayTeam: {
                    shortName: outcomes[1]?.slice(0,3).toUpperCase() || 'NO',
                    displayName: outcomes[1] || 'No',
                    fullName: outcomes[1] || 'No',
                    primaryColor: '#ADFF2F',
                    accentColor: '#80E500',
                    glowColor: 'rgba(173,255,47,0.4)'
                  },
                  homeProbability: hProb,
                  awayProbability: aProb,
                  homeOdds: 1 / (parseFloat(prices[0]) || 0.01),
                  awayOdds: 1 / (parseFloat(prices[1]) || 0.01),
                  volume: parseFloat(m.volume) || 0,
                  liquidity: parseFloat(m.liquidity) || 0,
                  supporters: Math.floor(Math.random() * 5000) + 100, // Dummy engagement metric
                  isHot: parseFloat(m.volume) > 50000,
                  isFeatured: false
                });
            }
          }
        }
        
        setLiveMarkets(mapped);
      } catch (err) {
        console.error("Error connecting to Polymarket proxy:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDynamicMarkets();
  }, [activeCategory]);

  return (
    <div className="pb-32 pt-4 min-h-[100dvh]">
      {/* Header */}
      <TopHeader />

      <BannerCarousel />
      
      <div className="sticky top-0 z-40 bg-[#0D0518]/90 backdrop-blur-xl border-b border-white/5 pb-2 pt-2">
        <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
      </div>

      <div className="mt-4 flex flex-col gap-4 min-h-[300px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
             <Loader2 size={32} className="animate-spin text-[#00F0FF] mb-4" />
             <div className="text-[12px] font-bold text-[#00F0FF] tracking-widest uppercase">Syncing Protocol...</div>
          </div>
        ) : liveMarkets.length > 0 ? (
          liveMarkets.map((market, i) => (
            <MarketCard key={market.id} market={market} index={i} onPlaceBet={onPlaceBet} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
             <div className="text-[12px] font-bold text-white/50 tracking-widest uppercase">No Active Markets Found</div>
          </div>
        )}
      </div>
    </div>
  );
}
