'use client';

import { useState, useMemo } from 'react';
import { Loader2, Trophy, BarChart3 } from 'lucide-react';
import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { CategoryTabs } from '@/components/ui/CategoryTabs';
import { SubTabs } from '@/components/ui/SubTabs';
import { TopHeader } from '@/components/ui/TopHeader';
import { MatchCard, groupMatchesByDate } from '@/components/ui/MatchCard';
import { OutrightCard } from '@/components/ui/OutrightCard';
import { BinaryOutrightCard } from '@/components/ui/BinaryOutrightCard';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useMatchData } from '@/hooks/useMatchData';
import { useOutrightData } from '@/hooks/useOutrightData';
import { PrimaryTab, MatchSubTab } from '@/types/sports';

export function HomePage({ onPlaceBet, positions }: { onPlaceBet?: (amount: string, tokenId: string, executionPrice?: number) => Promise<void>; positions?: any[] }) {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('matches');
  const [matchSub, setMatchSub] = useState<MatchSubTab>('hot');
  // Sub-navigation picker states (for matches)
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [selectedKnockout, setSelectedKnockout] = useState('16强');

  const [skipAnimation, setSkipAnimation] = useState(false);
  const [prevKeyword, setPrevKeyword] = useState<string>('');

  // ── Computed keyword (for outrights only now) ──
  const keyword = (() => {
    if (primaryTab === 'outrights') return 'FIFA World Cup';
    return 'World Cup';
  })();

  // ── Data Hooks ──
  const { allMatches, matchGroups, isLoading: isMatchLoading } = useMatchData(primaryTab === 'matches');
  const { markets: liveMarkets, isLoading: isOutrightLoading } = useOutrightData(primaryTab === 'outrights', keyword);

  const isLoading = primaryTab === 'matches' ? isMatchLoading
    : primaryTab === 'outrights' ? isOutrightLoading
    : false;

  // ── Filter matches based on the sub-tab selection ──
  const filteredMatchGroups = useMemo(() => {
    if (matchSub === 'hot') {
      // "今日热门" — show all matches grouped by date
      return matchGroups;
    }

    if (matchSub === 'group') {
      // Filter to only group-stage matches in the selected group
      const filtered = allMatches.filter(m => m.isGroupStage && m.group === selectedGroup);
      return groupMatchesByDate(filtered);
    }

    if (matchSub === 'knockout') {
      // Filter to only knockout-stage matches (not group stage)
      const filtered = allMatches.filter(m => !m.isGroupStage);
      return groupMatchesByDate(filtered);
    }

    return matchGroups;
  }, [matchSub, selectedGroup, selectedKnockout, allMatches, matchGroups]);

  // ── Derived State: skip animation when SWR has cached data ──
  if (keyword !== prevKeyword) {
    setPrevKeyword(keyword);
    if (primaryTab !== 'standings' && primaryTab !== 'scorers') {
      setSkipAnimation(liveMarkets.length > 0);
    }
  }

  return (
    <div className="pb-32 min-h-[100dvh]">
      <TopHeader />
      <BannerCarousel />

      {/* ── Sticky Navigation Area ── */}
      <div className="sticky top-0 z-40 bg-[#0D0518]/90 backdrop-blur-xl border-b border-white/5">
        <CategoryTabs
          active={primaryTab}
          onChange={(tab) => {
            setPrimaryTab(tab);
            const scrollable = document.querySelector('.overflow-y-auto');
            if (scrollable) scrollable.scrollTop = 0;
          }}
        />
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
      <div className="mt-4 flex flex-col gap-2 min-h-[300px]">
        {primaryTab === 'standings' ? (
          <PlaceholderScreen icon={<BarChart3 size={28} color="#FFD700" />} title="小组赛积分榜" />
        ) : primaryTab === 'scorers' ? (
          <PlaceholderScreen icon={<Trophy size={28} color="#FFD700" />} title="射手榜" />
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-50">
            <Loader2 size={32} className="animate-spin text-[#FFD700] mb-4" />
            <div className="text-[12px] font-bold text-[#FFD700] tracking-widest uppercase">加载中...</div>
          </div>
        ) : primaryTab === 'matches' ? (
          // ── MATCHES: Grouped by date with MatchCard ──
          filteredMatchGroups.length > 0 ? (
            filteredMatchGroups.map((group) => (
              <div key={group.dateISO}>
                <div
                  className="px-5 pt-4 pb-2"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {group.dateLabel}
                </div>
                {group.matches.map((match, i) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    index={skipAnimation ? -1 : i}
                    onPlaceBet={onPlaceBet}
                    positions={positions}
                  />
                ))}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 opacity-50">
              <div className="text-[12px] font-bold text-white/50 tracking-widest uppercase">
                {matchSub === 'group' ? `${selectedGroup}组暂无比赛数据` : matchSub === 'knockout' ? '暂无淘汰赛数据' : '暂无比赛数据'}
              </div>
            </div>
          )
        ) : primaryTab === 'outrights' ? (
          // ── OUTRIGHTS: Existing cards ──
          liveMarkets.length > 0 ? (
            liveMarkets.map((market, i) =>
              market.isBinaryOutright ? (
                <BinaryOutrightCard key={market.id} market={market} index={skipAnimation ? -1 : i} onPlaceBet={onPlaceBet} positions={positions} />
              ) : (
                <OutrightCard key={market.id} market={market} index={skipAnimation ? -1 : i} onPlaceBet={onPlaceBet} positions={positions} />
              )
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-48 opacity-50">
              <div className="text-[12px] font-bold text-white/50 tracking-widest uppercase">暂无相关市场数据</div>
            </div>
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
