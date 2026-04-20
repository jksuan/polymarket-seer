'use client';

import { useState, useMemo } from 'react';
import { Loader2, Trophy, BarChart3, Swords, Flame, ShieldQuestion, Lock, Search, X } from 'lucide-react';
import { BannerCarousel } from '@/components/ui/BannerCarousel';
import { CategoryTabs } from '@/components/ui/CategoryTabs';
import { SubTabs } from '@/components/ui/SubTabs';
import { TopHeader } from '@/components/ui/TopHeader';
import { MatchCard, groupMatchesByDate, MatchCardSkeleton } from '@/components/ui/MatchCard';
import { OutrightCard, OutrightCardSkeleton } from '@/components/ui/OutrightCard';
import { BinaryOutrightCard } from '@/components/ui/BinaryOutrightCard';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useMatchData } from '@/hooks/useMatchData';
import { useOutrightData } from '@/hooks/useOutrightData';
import { PrimaryTab, MatchSubTab } from '@/types/sports';
import { TeamFilterSheet } from '@/components/ui/TeamFilterSheet';
import { StandingsView } from '@/components/ui/StandingsView';
import { StandingsNav } from '@/components/ui/StandingsNav';
import { HistoricYear } from '@/lib/mockStandings';
import { ScorersView } from '@/components/ui/ScorersView';
import { ScorersNav } from '@/components/ui/ScorersNav';
import { HistoricYear as ScorersYear } from '@/lib/mockScorers';
import { getCountryFlagUrl } from '@/lib/countryFlags';

export function HomePage({ onPlaceBet, positions }: { onPlaceBet?: (amount: string, tokenId: string, executionPrice?: number) => Promise<void>; positions?: any[] }) {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('matches');
  const [matchSub, setMatchSub] = useState<MatchSubTab>('hot');
  // Sub-navigation picker states (for matches)
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [selectedKnockout, setSelectedKnockout] = useState('16强');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showTeamFilter, setShowTeamFilter] = useState(false);

  // Sub-navigation picker states (for standings)
  const [standingsYear, setStandingsYear] = useState<HistoricYear>('2022');
  const [standingsMode, setStandingsMode] = useState<'groups' | 'knockout'>('groups');

  // Sub-navigation picker states (for scorers)
  const [scorersYear, setScorersYear] = useState<ScorersYear>('2022');

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
    let baseMatches = allMatches;

    // Apply team filter globally across all sub-tabs
    if (selectedTeam) {
      baseMatches = baseMatches.filter(
        m => m.home.name === selectedTeam || m.away.name === selectedTeam
      );
    }

    if (matchSub === 'hot') {
      // "全部" — show all matches grouped by date, filtered by selected date
      const groups = groupMatchesByDate(baseMatches);
      if (selectedDate === 'ALL') {
        return groups;
      }
      return groups.filter(g => g.dateISO === selectedDate);
    }

    if (matchSub === 'group') {
      const filtered = baseMatches.filter(m => m.isGroupStage && m.group === selectedGroup);
      return groupMatchesByDate(filtered);
    }

    if (matchSub === 'knockout') {
      const filtered = baseMatches.filter(m => !m.isGroupStage);
      return groupMatchesByDate(filtered);
    }

    return groupMatchesByDate(baseMatches);
  }, [matchSub, selectedGroup, selectedKnockout, selectedDate, selectedTeam, allMatches, matchGroups]);

  // ── Derived State: skip animation when SWR has cached data ──
  if (keyword !== prevKeyword) {
    setPrevKeyword(keyword);
    if (primaryTab !== 'standings' && primaryTab !== 'scorers') {
      setSkipAnimation(liveMarkets.length > 0);
    }
  }

  return (
    <>
    <div className="pb-32 min-h-[100dvh]">
      <TopHeader />
      <BannerCarousel />

      {/* ── Sticky Navigation Area ── */}
      <div className="sticky top-0 z-40 bg-[#0D0518]/90 backdrop-blur-xl">
        <CategoryTabs
          active={primaryTab}
          onChange={(tab) => {
            setPrimaryTab(tab);
            const scrollable = document.querySelector('.overflow-y-auto');
            if (scrollable) scrollable.scrollTop = 0;
          }}
        />

        {/* Universal Divider below Category Tabs */}
        <div className="h-[1px] bg-white/5 w-full" />

        <SubTabs
          primaryTab={primaryTab}
          matchSub={matchSub}
          onMatchSubChange={setMatchSub}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          selectedKnockout={selectedKnockout}
          onKnockoutChange={setSelectedKnockout}
        />

        
        {/* ── Date Ribbon (Only visible in '全部' tab) ── */}
        {primaryTab === 'matches' && matchSub === 'hot' && matchGroups.length > 0 && (
          <div 
            className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar items-center bg-[#0D0518]/60"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            <button
              onClick={() => setSelectedDate('ALL')}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full transition-all text-[11px] font-bold"
              style={{
                fontFamily: 'Inter',
                background: selectedDate === 'ALL' ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.06)',
                color: selectedDate === 'ALL' ? '#FFD700' : 'rgba(255,255,255,0.6)',
                border: selectedDate === 'ALL' ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.08)'
              }}
            >
              全部
            </button>

            {/* Search Team Button */}
            <button
              onClick={() => setShowTeamFilter(true)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all mr-1"
              style={{
                background: selectedTeam ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.06)',
                border: selectedTeam ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Search size={13} className={selectedTeam ? 'text-[#FFD700]' : 'text-white/40'} />
              <span className={`text-[11px] font-bold ${selectedTeam ? 'text-[#FFD700]' : 'text-white/60'}`}>
                球队
              </span>
            </button>

             {matchGroups.map(g => {
              const parts = g.dateISO.split('-');
              let shortDate = g.dateISO;
              if (parts.length === 3) {
                shortDate = `${parseInt(parts[1], 10)}.${parseInt(parts[2], 10)}`;
              }
              
              return (
                <button
                  key={g.dateISO}
                  onClick={() => setSelectedDate(g.dateISO)}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full transition-all text-[11px] font-bold"
                  style={{
                    fontFamily: 'Inter',
                    background: selectedDate === g.dateISO ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.06)',
                    color: selectedDate === g.dateISO ? '#FFD700' : 'rgba(255,255,255,0.6)',
                    border: selectedDate === g.dateISO ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  {shortDate}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Standings Sub-Navigation ── */}
        {primaryTab === 'standings' && (
          <StandingsNav 
            selectedYear={standingsYear} 
            onYearChange={setStandingsYear} 
            viewMode={standingsMode} 
            onViewModeChange={setStandingsMode} 
          />
        )}

        {/* ── Scorers Sub-Navigation ── */}
        {primaryTab === 'scorers' && (
          <ScorersNav 
            selectedYear={scorersYear} 
            onYearChange={setScorersYear} 
          />
        )}

        {/* Global Bottom Divider for the entire sticky area ONLY if it has sub-navs */}
        {(primaryTab === 'matches' || primaryTab === 'standings' || primaryTab === 'scorers') && (
            <div className="h-[1px] bg-white/5 w-full" />
        )}
      </div>

      {/* ── Active Team Filter Tag ── */}
      {primaryTab === 'matches' && selectedTeam && (
        <div className="flex items-center gap-2 px-4 py-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full active:scale-95 transition-all cursor-pointer"
            onClick={() => setSelectedTeam(null)}
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.08))',
              border: '1px solid rgba(255,215,0,0.35)',
            }}
          >
            <img
              src={getCountryFlagUrl(selectedTeam, 40)}
              alt={selectedTeam}
              width={18}
              height={13}
              style={{ width: '18px', height: '13px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.15)' }}
            />
            <span className="text-[12px] font-bold text-[#FFD700]">{selectedTeam}</span>
            <X size={12} className="text-[#FFD700]/60" />
          </div>
        </div>
      )}

      {/* ── Content Area ── */}
      <div className="mt-4 flex flex-col gap-2 min-h-[300px]">
        {primaryTab === 'standings' ? (
          <StandingsView selectedYear={standingsYear} viewMode={standingsMode} />
        ) : primaryTab === 'scorers' ? (
          <ScorersView selectedYear={scorersYear} />
        ) : isLoading ? (
          <div className="flex flex-col gap-3 shrink-0" style={{ paddingBottom: '20px' }}>
            {primaryTab === 'matches' && (
              <>
                <MatchCardSkeleton />
                <MatchCardSkeleton />
                <MatchCardSkeleton />
              </>
            )}
            {primaryTab === 'outrights' && (
              <>
                <OutrightCardSkeleton />
                <OutrightCardSkeleton />
                <OutrightCardSkeleton />
              </>
            )}
            {primaryTab !== 'matches' && primaryTab !== 'outrights' && (
              <>
                <MatchCardSkeleton />
                <MatchCardSkeleton />
                <MatchCardSkeleton />
              </>
            )}
          </div>
        ) : primaryTab === 'matches' ? (
          // ── MATCHES: Grouped by date with MatchCard ──
          filteredMatchGroups.length > 0 ? (
            filteredMatchGroups.map((group, index) => (
              <div key={group.dateISO}>
                <div
                  className={`px-5 pb-2 ${index === 0 ? 'pt-0' : 'pt-4'}`}
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
          ) : matchSub === 'knockout' ? (
            <div className="flex flex-col items-center justify-center pt-8 pb-12">
              {/* Locked Header */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-[#00F0FF] blur-[40px] opacity-20 rounded-full animate-pulse" />
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
                  style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)' }}
                >
                  <Lock size={28} color="#00F0FF" strokeWidth={2} />
                </div>
              </div>

              <h3 style={{ fontFamily: 'Inter', fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '0.02em', marginBottom: '8px' }}>
                赛事数据尚未解锁
              </h3>
              <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '280px', marginBottom: '32px' }}>
                2026 美加墨世界杯淘汰赛数据引擎挂起中，待小组赛结束后将实时同步注入系统。
              </p>

              {/* Placeholder Skeleton Rows */}
              <div className="w-full max-w-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                  <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center">
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>{i}</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
                      <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-6 bg-white/5 rounded" />
                      <div className="h-4 w-6 bg-white/5 rounded" />
                      <div className="h-4 w-8 bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 opacity-40">
              <div className="text-[12px] font-bold text-white/50 tracking-widest uppercase">
                {matchSub === 'group' ? `${selectedGroup}组暂无赛事公开` : '暂无比赛数据'}
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

    {/* ── Team Filter Bottom Sheet ── */}
    <TeamFilterSheet
      isOpen={showTeamFilter}
      onClose={() => setShowTeamFilter(false)}
      onSelect={setSelectedTeam}
      selectedTeam={selectedTeam}
    />
    </>
  );
}
