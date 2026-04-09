'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trophy, BarChart3 } from 'lucide-react';
import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { CategoryTabs } from '@/components/ui/CategoryTabs';
import { SubTabs } from '@/components/ui/SubTabs';
import { TopHeader } from '@/components/ui/TopHeader';
import { MarketCard } from '@/components/ui/MarketCard';
import { OutrightCard } from '@/components/ui/OutrightCard';
import { BinaryOutrightCard } from '@/components/ui/BinaryOutrightCard';
import { PrimaryTab, MatchSubTab, SportMarket } from '@/types/sports';

export function HomePage({ onPlaceBet }: { onPlaceBet?: (amount: string, tokenId: string) => Promise<void> }) {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('matches');
  const [matchSub, setMatchSub] = useState<MatchSubTab>('hot');
  // Sub-navigation picker states (for matches)
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [selectedKnockout, setSelectedKnockout] = useState('16强');

  const [liveMarkets, setLiveMarkets] = useState<SportMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Build API keyword from two-tier state ──
  const getSearchKeyword = () => {
    if (primaryTab === 'outrights') return 'FIFA World Cup';
    
    switch (matchSub) {
      case 'hot': return 'World Cup';
      case 'group': return `World Cup Group ${selectedGroup}`;
      case 'knockout': 
        if (selectedKnockout === '决赛') return 'World Cup Final';
        if (selectedKnockout === '半决赛') return 'World Cup Semi';
        if (selectedKnockout === '1/4决赛') return 'World Cup Quarter';
        if (selectedKnockout === '1/8决赛') return 'World Cup Round of 16';
        if (selectedKnockout === '16强') return 'World Cup Round of 16';
        return 'World Cup';
      default: return 'World Cup';
    }
  };

  useEffect(() => {
    // Standings & Scorers are placeholder — skip fetch
    if (primaryTab === 'standings' || primaryTab === 'scorers') {
      setIsLoading(false);
      setLiveMarkets([]);
      return;
    }

    const fetchMarkets = async () => {
      try {
        setIsLoading(true);
        let url = '/api/search?q=' + encodeURIComponent(getSearchKeyword());
        const res = await fetch(url);
        if (!res.ok) throw new Error('API fetch failed');
        const events = await res.json();

        const mapped: SportMarket[] = [];

        if (Array.isArray(events)) {
          for (const evt of events) {
            if (!evt.markets || evt.markets.length === 0) continue;

            // ── OUTRIGHTS TAB: always render as OutrightCard ──
            if (primaryTab === 'outrights') {
              // Filter out standard matches from the props feed
              const titleLower = (evt.title || '').toLowerCase();
              if (titleLower.includes(' vs ') || titleLower.includes(' vs.')) {
                continue;
              }

              const outrightOutcomes: string[] = [];
              const outrightPrices: number[] = [];

              if (evt.markets.length > 1) {
                // Multi-market event (e.g. group winner: one market per team)
                for (const m of evt.markets) {
                  let name = m.groupItemTitle || m.title || m.question || 'Team';
                  name = name
                    .replace(/^will\s+/i, '')
                    .replace(/\s+win.*$/i, '')
                    .replace(/\s+advance.*$/i, '')
                    .trim();
                  let prices = ['0.05', '0.95'];
                  try { prices = JSON.parse(m.outcomePrices || '["0.05"]'); } catch {}
                  outrightOutcomes.push(name);
                  outrightPrices.push(parseFloat(prices[0]) || 0.01);
                }
              } else {
                // Single binary market (Yes / No) — expose both options as rows
                const m = evt.markets[0];
                let outcomes: string[] = ['Yes', 'No'];
                let prices: string[] = ['0.5', '0.5'];
                try { outcomes = JSON.parse(m.outcomes || '["Yes","No"]'); } catch {}
                try { prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]'); } catch {}
                outcomes.forEach((o: string, i: number) => {
                  outrightOutcomes.push(o);
                  outrightPrices.push(parseFloat(prices[i] || '0.5'));
                });
              }

              mapped.push({
                id: evt.id || `evt-${Date.now()}-${Math.random()}`,
                question: evt.title || evt.markets[0]?.question || '世界杯专属预测',
                imageUrl: evt.image || evt.icon || '',
                sport: 'matches',
                leagueCode: 'WC',
                leagueName: '世界杯 2026',
                leagueNameEn: 'FIFA World Cup',
                status: 'live',
                matchTime: 'Outright',
                matchTimeISO: new Date().toISOString(),
                homeTeam: { shortName: '', fullName: '', displayName: '', primaryColor: '', accentColor: '', glowColor: '' },
                awayTeam: { shortName: '', fullName: '', displayName: '', primaryColor: '', accentColor: '', glowColor: '' },
                homeProbability: evt.markets.length === 1 ? Math.round((outrightPrices[0] || 0.5) * 100) : 0,
                awayProbability: evt.markets.length === 1 ? Math.round((outrightPrices[1] || 0.5) * 100) : 0,
                homeOdds: evt.markets.length === 1 ? 1 / (outrightPrices[0] || 0.5) : 0,
                awayOdds: evt.markets.length === 1 ? 1 / (outrightPrices[1] || 0.5) : 0,
                volume: parseFloat(evt.volume || '0') || parseFloat(evt.markets[0]?.volume || '0') || 0,
                liquidity: 1000000,
                supporters: Math.floor(Math.random() * 5000),
                isHot: true,
                isFeatured: evt.markets.length > 10,
                rawOutcomes: outrightOutcomes,
                rawPrices: outrightPrices,
              });

            } else {
              // ── MATCHES TAB: standard 2/3-way MarketCard ──
              const m = evt.markets[0];
              let outcomes = ['Yes', 'No'];
              let prices = ['0.5', '0.5'];
              try { outcomes = JSON.parse(m.outcomes || '["Yes","No"]'); } catch {}
              try { prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]'); } catch {}

              const is3Way = outcomes.length === 3;
              const awayIdx = is3Way ? 2 : 1;

              mapped.push({
                id: evt.id || m.id,
                polymarketConditionId: m.conditionId,
                question: evt.title || m.question,
                imageUrl: evt.image || evt.icon || '',
                sport: 'matches',
                leagueName: '世界杯 2026',
                leagueCode: 'WC',
                leagueNameEn: 'FIFA',
                status: m.closed ? 'ended' : 'live',
                matchTime: 'Real-Time',
                matchTimeISO: new Date().toISOString(),
                homeTeam: {
                  shortName: outcomes[0]?.slice(0, 3).toUpperCase() || 'YES',
                  displayName: outcomes[0] || 'Yes',
                  fullName: outcomes[0] || 'Yes',
                  primaryColor: '#00F0FF', accentColor: '#0099FF', glowColor: 'rgba(0,153,255,0.4)',
                },
                awayTeam: {
                  shortName: (outcomes[awayIdx] || 'NO').slice(0, 3).toUpperCase(),
                  displayName: outcomes[awayIdx] || 'No',
                  fullName: outcomes[awayIdx] || 'No',
                  primaryColor: '#ADFF2F', accentColor: '#80E500', glowColor: 'rgba(173,255,47,0.4)',
                },
                drawTeam: is3Way ? {
                  shortName: 'DRW',
                  displayName: outcomes[1], fullName: outcomes[1],
                  primaryColor: '#A0AEC0', accentColor: '#718096', glowColor: 'rgba(160,174,192,0.4)',
                } : undefined,
                homeProbability: Math.round(parseFloat(prices[0] || '0.5') * 100),
                awayProbability: Math.round(parseFloat(prices[awayIdx] || '0.5') * 100),
                drawProbability: is3Way ? Math.round(parseFloat(prices[1] || '0') * 100) : undefined,
                homeOdds: 1 / (parseFloat(prices[0]) || 0.01),
                awayOdds: 1 / (parseFloat(prices[awayIdx]) || 0.01),
                drawOdds: is3Way ? 1 / (parseFloat(prices[1]) || 0.01) : undefined,
                volume: parseFloat(m.volume) || 0,
                liquidity: parseFloat(m.liquidity) || 0,
                supporters: Math.floor(Math.random() * 5000) + 100,
                isHot: parseFloat(m.volume) > 50000,
                isFeatured: false,
              });
            }
          }
        }

        // Strictly sort by descending total volume purely for front-end presentation accuracy
        mapped.sort((a, b) => b.volume - a.volume);

        setLiveMarkets(mapped);
      } catch (err) {
        console.error('Error fetching markets:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarkets();
  }, [primaryTab, matchSub, selectedGroup, selectedKnockout]);

  // ── Placeholder Screens ──
  const PlaceholderScreen = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,215,0,0.1)', border: '1.5px solid rgba(255,215,0,0.2)' }}
      >
        {icon}
      </div>
      <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '15px', color: 'rgba(255,255,255,0.6)' }}>
        {title}
      </div>
      <div style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
        敬请期待 · Coming Soon
      </div>
    </div>
  );

  return (
    <div className="pb-32 min-h-[100dvh]">
      <TopHeader />
      <BannerCarousel />

      {/* ── Sticky Navigation Area ── */}
      <div className="sticky top-0 z-40 bg-[#0D0518]/90 backdrop-blur-xl border-b border-white/5">
        <CategoryTabs active={primaryTab} onChange={setPrimaryTab} />
        <SubTabs 
          primaryTab={primaryTab}
          matchSub={matchSub}
          onMatchSubChange={setMatchSub}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          selectedKnockout={selectedKnockout}
          onKnockoutChange={setSelectedKnockout}
        />
      </div>

      {/* ── Content Area ── */}
      <div className="mt-4 flex flex-col gap-4 min-h-[300px]">
        {/* Placeholder tabs */}
        {primaryTab === 'standings' ? (
          <PlaceholderScreen icon={<BarChart3 size={28} color="#FFD700" />} title="小组赛积分榜" />
        ) : primaryTab === 'scorers' ? (
          <PlaceholderScreen icon={<Trophy size={28} color="#FFD700" />} title="射手榜" />
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
            <Loader2 size={32} className="animate-spin text-[#FFD700] mb-4" />
            <div className="text-[12px] font-bold text-[#FFD700] tracking-widest uppercase">加载中...</div>
          </div>
        ) : liveMarkets.length > 0 ? (
          liveMarkets.map((market, i) =>
            primaryTab === 'outrights' ? (
              market.rawOutcomes && market.rawOutcomes.length > 2 ? (
                <OutrightCard key={market.id} market={market} index={i} onPlaceBet={onPlaceBet} />
              ) : (
                <BinaryOutrightCard key={market.id} market={market} index={i} onPlaceBet={onPlaceBet} />
              )
            ) : (
              <MarketCard key={market.id} market={market} index={i} onPlaceBet={onPlaceBet} />
            )
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
            <div className="text-[12px] font-bold text-white/50 tracking-widest uppercase">暂无相关市场数据</div>
          </div>
        )}
      </div>
    </div>
  );
}
