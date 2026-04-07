'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { TopHeader } from '@/components/ui/TopHeader';
import { MarketCard } from '@/components/ui/MarketCard';
import { SportMarket } from '@/types/sports';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SportMarket[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const events = await res.json();
        const mapped: SportMarket[] = [];
        
        if (Array.isArray(events)) {
          for (const evt of events) {
            if (evt.markets && evt.markets.length > 0) {
                const m = evt.markets[0];
                let outcomes = ["Yes", "No"];
                let prices = ["0.5", "0.5"];
                try { outcomes = JSON.parse(m.outcomes || '["Yes", "No"]'); } catch(e){}
                try { prices = JSON.parse(m.outcomePrices || '["0.5", "0.5"]'); } catch(e){}
                
                mapped.push({
                  id: evt.id,
                  polymarketConditionId: m.conditionId,
                  question: evt.title,
                  sport: 'all',
                  leagueName: 'Search Result',
                  leagueCode: 'SR',
                  leagueNameEn: 'POLYMARKET',
                  status: m.closed ? 'ended' : 'live',
                  matchTime: 'Real-Time',
                  matchTimeISO: new Date().toISOString(),
                  homeTeam: { shortName: outcomes[0]?.slice(0,3).toUpperCase() || 'YES', displayName: outcomes[0] || 'Yes', fullName: outcomes[0] || 'Yes', primaryColor: '#00F0FF', accentColor: '#0099FF', glowColor: 'rgba(0,153,255,0.4)' },
                  awayTeam: { shortName: outcomes[1]?.slice(0,3).toUpperCase() || 'NO', displayName: outcomes[1] || 'No', fullName: outcomes[1] || 'No', primaryColor: '#ADFF2F', accentColor: '#80E500', glowColor: 'rgba(173,255,47,0.4)' },
                  homeProbability: Math.round(parseFloat(prices[0] || '0.5') * 100),
                  awayProbability: Math.round(parseFloat(prices[1] || '0.5') * 100),
                  homeOdds: 1 / (parseFloat(prices[0]) || 0.01),
                  awayOdds: 1 / (parseFloat(prices[1]) || 0.01),
                  volume: parseFloat(m.volume) || 0,
                  liquidity: parseFloat(m.liquidity) || 0,
                  supporters: Math.floor(Math.random() * 5000),
                  isHot: parseFloat(m.volume) > 50000,
                  isFeatured: false
                });
            }
          }
        }
        setResults(mapped);
    } catch (err) {
        console.error("Search failed:", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="pb-32 min-h-[100dvh]">
      <TopHeader isSticky={true} />
      <div className="px-4 mb-6">
         <h1 className="text-2xl font-black italic text-white tracking-widest uppercase mb-4 text-shadow-[0_0_12px_rgba(255,255,255,0.2)]">探索市场</h1>
         <form onSubmit={handleSearch} className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
               <Search size={18} className="text-[#00F0FF]" />
            </div>
            <input 
               type="text" 
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               placeholder="搜寻队伍、赛事或话题..."
               className="w-full bg-[#192540]/60 border border-[#00F0FF]/30 text-white placeholder-white/40 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#00F0FF] focus:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#00F0FF]/10 text-[#00F0FF] px-4 py-2 rounded-xl text-sm font-bold border border-[#00F0FF]/20 active:scale-95 transition-transform hover:bg-[#00F0FF]/20">
               搜索
            </button>
         </form>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
             <Loader2 size={32} className="animate-spin text-[#00F0FF] mb-4" />
             <div className="text-[12px] font-bold text-[#00F0FF] tracking-widest uppercase">Deep Scanning...</div>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
             <div className="text-[12px] font-bold text-white/50 tracking-widest uppercase">No Results Found</div>
          </div>
        )}

        {!loading && results.map((market, i) => (
          <MarketCard key={market.id} market={market} index={i} />
        ))}
      </div>
    </div>
  );
}
