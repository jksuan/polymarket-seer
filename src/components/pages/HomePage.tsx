'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trophy, BarChart3 } from 'lucide-react';
import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { CategoryTabs } from '@/components/ui/CategoryTabs';
import { SubTabs } from '@/components/ui/SubTabs';
import { TopHeader } from '@/components/ui/TopHeader';
import { MarketCard } from '@/components/ui/MarketCard';
import { OutrightCard } from '@/components/ui/OutrightCard';
import { PrimaryTab, MatchSubTab, OutrightSubTab, SportMarket } from '@/types/sports';

export function HomePage({ onPlaceBet }: { onPlaceBet?: (amount: string, tokenId: string) => Promise<void> }) {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('matches');
  const [matchSub, setMatchSub] = useState<MatchSubTab>('hot');
  const [outrightSub, setOutrightSub] = useState<OutrightSubTab>('champion');
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [selectedKnockout, setSelectedKnockout] = useState('16强');
  const [liveMarkets, setLiveMarkets] = useState<SportMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Build API keyword from two-tier state ──
  function getSearchKeyword(): string {
    if (primaryTab === 'matches') {
      switch (matchSub) {
        case 'hot':   return 'World Cup 2026';
        case 'group': return `World Cup Group ${selectedGroup}`;
        case 'knockout':
          switch (selectedKnockout) {
            case '32强': return 'World Cup Round of 32';
            case '16强': return 'World Cup Round of 16';
            case '1/8决赛': return 'World Cup Round of 16';
            case '1/4决赛': return 'World Cup quarter final';
            case '半决赛': return 'World Cup semi final';
            case '决赛': return 'World Cup final';
            default: return 'World Cup knockout';
          }
        default:      return 'World Cup 2026';
      }
    }
    if (primaryTab === 'outrights') {
      switch (outrightSub) {
        case 'champion':     return 'World Cup winner';
        case 'golden-boot':  return 'World Cup golden boot';
        case 'group-winner': return 'World Cup group winner';
        case 'other':        return 'World Cup 2026';
        default:             return 'World Cup winner';
      }
    }
    return '';
  }

  useEffect(() => {
    // Standings & Scorers are placeholder — skip fetch
    if (primaryTab === 'standings' || primaryTab === 'scorers') {
      setIsLoading(false);
      setLiveMarkets([]);
      return;
    }

    async function fetchMarkets() {
      setIsLoading(true);
      try {
        const keyword = getSearchKeyword();
        const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
        const events = await res.json();

        const mapped: SportMarket[] = [];

        if (Array.isArray(events)) {
          for (const evt of events) {
            if (evt.markets && evt.markets.length > 0) {
              const m = evt.markets[0];
              let outcomes = ['Yes', 'No'];
              let prices = ['0.5', '0.5'];
              try { outcomes = JSON.parse(m.outcomes || '["Yes", "No"]'); } catch {}
              try { prices = JSON.parse(m.outcomePrices || '["0.5", "0.5"]'); } catch {}

              const is3Way = outcomes.length === 3;
              const isOutright = outcomes.length > 3;
              const awayIdx = is3Way ? 2 : 1;

              const hProb = Math.round(parseFloat(prices[0] || '0.5') * 100);
              const dProb = is3Way ? Math.round(parseFloat(prices[1] || '0') * 100) : undefined;
              const aProb = Math.round(parseFloat(prices[awayIdx] || '0.5') * 100);

              mapped.push({
                id: evt.id,
                polymarketConditionId: m.conditionId,
                question: evt.title,
                sport: 'matches',
                leagueName: '世界杯 2026',
                leagueCode: 'WC',
                leagueNameEn: 'FIFA World Cup 2026',
                status: m.closed ? 'ended' : 'live',
                matchTime: 'Real-Time',
                matchTimeISO: new Date().toISOString(),
                homeTeam: {
                  shortName: outcomes[0]?.slice(0, 3).toUpperCase() || 'YES',
                  displayName: outcomes[0] || 'Yes',
                  fullName: outcomes[0] || 'Yes',
                  primaryColor: '#00F0FF',
                  accentColor: '#0099FF',
                  glowColor: 'rgba(0,153,255,0.4)',
                },
                awayTeam: {
                  shortName: (outcomes[awayIdx] || 'NO').slice(0, 3).toUpperCase(),
                  displayName: outcomes[awayIdx] || 'No',
                  fullName: outcomes[awayIdx] || 'No',
                  primaryColor: '#ADFF2F',
                  accentColor: '#80E500',
                  glowColor: 'rgba(173,255,47,0.4)',
                },
                drawTeam: is3Way ? {
                  shortName: 'DRW',
                  displayName: outcomes[1],
                  fullName: outcomes[1],
                  primaryColor: '#A0AEC0',
                  accentColor: '#718096',
                  glowColor: 'rgba(160,174,192,0.4)',
                } : undefined,
                homeProbability: hProb,
                awayProbability: aProb,
                drawProbability: dProb,
                homeOdds: 1 / (parseFloat(prices[0]) || 0.01),
                awayOdds: 1 / (parseFloat(prices[awayIdx]) || 0.01),
                drawOdds: is3Way ? 1 / (parseFloat(prices[1]) || 0.01) : undefined,
                rawOutcomes: isOutright ? outcomes : undefined,
                rawPrices: isOutright ? prices.map((p: string) => parseFloat(p)) : undefined,
                volume: parseFloat(m.volume) || 0,
                liquidity: parseFloat(m.liquidity) || 0,
                supporters: Math.floor(Math.random() * 5000) + 100,
                isHot: parseFloat(m.volume) > 50000,
                isFeatured: false,
              });
            }
          }
        }

        setLiveMarkets(mapped);
      } catch (err) {
        console.error('Error fetching markets:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarkets();
  }, [primaryTab, matchSub, outrightSub, selectedGroup, selectedKnockout]);

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
          activeMatchSub={matchSub}
          activeOutrightSub={outrightSub}
          selectedGroup={selectedGroup}
          selectedKnockout={selectedKnockout}
          onMatchSubChange={setMatchSub}
          onOutrightSubChange={setOutrightSub}
          onGroupChange={setSelectedGroup}
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
            market.rawOutcomes && market.rawOutcomes.length > 3 ? (
              <OutrightCard key={market.id} market={market} index={i} onPlaceBet={onPlaceBet} />
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
