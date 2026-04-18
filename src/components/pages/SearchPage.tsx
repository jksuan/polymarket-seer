'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Flame, Trophy, Zap, Globe2, TrendingUp, User } from 'lucide-react';
import { motion } from 'motion/react';
import { TopHeader } from '@/components/ui/TopHeader';
import { MatchCard, parseMatchEvents, type ParsedMatch } from '@/components/ui/MatchCard';
import { OutrightCard } from '@/components/ui/OutrightCard';
import { BinaryOutrightCard } from '@/components/ui/BinaryOutrightCard';
import { SportMarket } from '@/types/sports';
import { getCountryFlagUrl } from '@/lib/countryFlags';

// ═══════════════════════════════════════════════════
// Quick Filter — 空窗期引导数据
// ═══════════════════════════════════════════════════

const HOT_COUNTRIES = [
  { name: 'Brazil', label: '巴西' },
  { name: 'Argentina', label: '阿根廷' },
  { name: 'France', label: '法国' },
  { name: 'Germany', label: '德国' },
  { name: 'Spain', label: '西班牙' },
  { name: 'England', label: '英格兰' },
  { name: 'Portugal', label: '葡萄牙' },
  { name: 'Japan', label: '日本' },
  { name: 'United States', label: '美国' },
  { name: 'Mexico', label: '墨西哥' },
];

const HOT_TOPICS: Array<{ keyword: string; label: string; icon: any }> = [
  { keyword: 'Messi', label: '梅西', icon: User },
  { keyword: 'Neymar', label: '内马尔', icon: User },
  { keyword: 'Mbappe', label: '姆巴佩', icon: User },
  { keyword: 'Ronaldo', label: 'C罗', icon: User },
  { keyword: 'World Cup Winner', label: '冠军预测', icon: Trophy },
  { keyword: 'Golden Boot', label: '金靴奖', icon: TrendingUp },
];

// ═══════════════════════════════════════════════════
// Outright 事件 → SportMarket 转换器
// (复用 useOutrightData.ts 的核心解析逻辑)
// ═══════════════════════════════════════════════════

function transformOutrightEvent(evt: any): SportMarket | null {
  if (!evt.markets || evt.markets.length === 0) return null;

  const outrightOutcomes: string[] = [];
  const outrightPrices: number[] = [];
  const outrightIcons: string[] = [];
  const outrightVolumes: number[] = [];
  const outrightTokenIds: string[][] = [];
  const mainIcon = evt.image || evt.icon || '';

  if (evt.markets.length > 1) {
    // ── 多子市场 (如: 小组冠军 / 世界杯冠军，每支球队一个子市场) ──
    const activeMarkets = evt.markets.filter((m: any) => m.active !== false && m.closed !== true);
    for (const m of activeMarkets) {
      let name = m.groupItemTitle || m.title || m.question || 'Team';
      name = name
        .replace(/^will\s+/i, '')
        .replace(/\s+win.*$/i, '')
        .replace(/\s+advance.*$/i, '')
        .trim();
      let prices = ['0.05', '0.95'];
      try { prices = JSON.parse(m.outcomePrices || '["0.05"]'); } catch { /* noop */ }

      outrightOutcomes.push(name);
      outrightPrices.push(parseFloat(prices[0]) || 0.01);
      const subIcon = m.image || m.icon || '';
      outrightIcons.push(subIcon === mainIcon ? '' : subIcon);
      outrightVolumes.push(parseFloat(m.volume || '0') || 0);

      let tokenIds: string[] = [];
      try {
        const raw = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
        if (Array.isArray(raw)) tokenIds = raw;
      } catch { /* noop */ }
      outrightTokenIds.push(tokenIds);
    }
  } else {
    // ── 单子市场 (二元 Yes/No) ──
    const m = evt.markets[0];
    let outcomes: string[] = ['Yes', 'No'];
    let prices: string[] = ['0.5', '0.5'];
    try { outcomes = JSON.parse(m.outcomes || '["Yes","No"]'); } catch { /* noop */ }
    try { prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]'); } catch { /* noop */ }

    outcomes.forEach((o: string, i: number) => {
      outrightOutcomes.push(o);
      outrightPrices.push(parseFloat(prices[i] || '0.5'));
      outrightIcons.push('');
      outrightVolumes.push(0);
    });

    let tokenIds: string[] = [];
    try {
      const raw = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
      if (Array.isArray(raw)) tokenIds = raw;
    } catch { /* noop */ }
    outcomes.forEach((_o: string, i: number) => {
      outrightTokenIds.push(i === 0 ? tokenIds : [...tokenIds].reverse());
    });
  }

  return {
    id: evt.id || `evt-${Date.now()}-${Math.random()}`,
    question: evt.title || evt.markets[0]?.question || '预测市场',
    imageUrl: mainIcon,
    sport: 'search',
    leagueCode: 'SR',
    leagueName: '搜索结果',
    leagueNameEn: 'Search Result',
    status: 'live',
    matchTime: 'Market',
    matchTimeISO: new Date().toISOString(),
    homeTeam: { shortName: '', fullName: '', displayName: '', primaryColor: '', accentColor: '', glowColor: '' },
    awayTeam: { shortName: '', fullName: '', displayName: '', primaryColor: '', accentColor: '', glowColor: '' },
    homeProbability: evt.markets.length === 1 ? Number(((outrightPrices[0] || 0.5) * 100).toFixed(1)) : 0,
    awayProbability: evt.markets.length === 1 ? Number(((outrightPrices[1] || 0.5) * 100).toFixed(1)) : 0,
    homeOdds: evt.markets.length === 1 ? 1 / (outrightPrices[0] || 0.5) : 0,
    awayOdds: evt.markets.length === 1 ? 1 / (outrightPrices[1] || 0.5) : 0,
    volume: parseFloat(evt.volume || '0') || parseFloat(evt.markets[0]?.volume || '0') || 0,
    liquidity: 1000000,
    supporters: Math.floor(Math.random() * 5000),
    isHot: true,
    isFeatured: evt.markets.length > 10,
    rawOutcomes: outrightOutcomes,
    rawPrices: outrightPrices,
    rawIcons: outrightIcons,
    rawVolumes: outrightVolumes,
    rawTokenIds: outrightTokenIds,
    isBinaryOutright: evt.markets.length === 1,
  };
}

// ═══════════════════════════════════════════════════
// 智能分发器 — 将搜索结果分类为三路卡片
// ═══════════════════════════════════════════════════

interface ClassifiedResults {
  matches: ParsedMatch[];
  outrights: SportMarket[];
  binaries: SportMarket[];
}

function classifyAndTransform(events: any[]): ClassifiedResults {
  // 第一步: 用首页同款解析器提取比赛对阵 (基于 sportsMarketType === 'moneyline')
  const matches = parseMatchEvents(events);
  const matchEventIds = new Set(matches.map(m => m.id));

  // 第二步: 剩余事件 → outright 或 binary
  const remainingEvents = events.filter(evt => !matchEventIds.has(evt.id));

  const outrights: SportMarket[] = [];
  const binaries: SportMarket[] = [];

  for (const evt of remainingEvents) {
    if (!evt.markets || evt.markets.length === 0) continue;

    // 跳过有 "vs" 但未被 parseMatchEvents 识别的事件 (数据不完整, 无法正确渲染)
    const titleLower = (evt.title || '').toLowerCase();
    if (titleLower.includes(' vs ') || titleLower.includes(' vs.')) continue;

    // 过滤掉 moneyline 类型的子市场 (它们属于比赛对阵, 不应出现在趣味投注)
    const nonMoneylineMarkets = evt.markets.filter((m: any) =>
      (m.sportsMarketType || '').toLowerCase() !== 'moneyline'
    );
    // 如果过滤后没有剩余市场且原始有 moneyline, 说明这个事件纯粹是比赛, 跳过
    if (nonMoneylineMarkets.length === 0 && evt.markets.some((m: any) =>
      (m.sportsMarketType || '').toLowerCase() === 'moneyline'
    )) continue;

    // 用原始 markets 做 transform (保持完整数据), 但用过滤后的数量做分类判断
    const market = transformOutrightEvent(evt);
    if (!market) continue;

    // 判断非 moneyline 子市场的数量来决定分类
    const effectiveMarkets = nonMoneylineMarkets.length > 0 ? nonMoneylineMarkets : evt.markets;
    if (effectiveMarkets.length === 1) {
      binaries.push(market);
    } else {
      outrights.push(market);
    }
  }

  outrights.sort((a, b) => b.volume - a.volume);
  binaries.sort((a, b) => b.volume - a.volume);

  return { matches, outrights, binaries };
}

// ═══════════════════════════════════════════════════
// Skeleton 骨架屏
// ═══════════════════════════════════════════════════

function SkeletonCard({ style: variant }: { style: 'match' | 'outright' }) {
  if (variant === 'match') {
    return (
      <div
        className="mx-4 mb-3 rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(145deg, rgba(30,20,50,0.6), rgba(18,10,32,0.6))', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="p-4 flex flex-col gap-3">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-10 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="h-5 w-14 bg-white/5 rounded-full animate-pulse" />
          </div>
          {/* Team row skeletons */}
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-6 h-[18px] bg-white/10 rounded-sm animate-pulse" />
              <div className="flex-1 h-4 bg-white/8 rounded animate-pulse" />
              <div className="h-4 w-8 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
          {/* Button skeletons */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-4 mb-3 rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(160deg, rgba(30,18,55,0.6), rgba(18,10,35,0.6))', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-white/5 animate-pulse" />
              <div className="h-3.5 w-20 bg-white/8 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-16 rounded-lg bg-white/5 animate-pulse" />
              <div className="h-9 w-16 rounded-lg bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SearchPage 组件
// ═══════════════════════════════════════════════════

interface SearchPageProps {
  onPlaceBet?: (amount: string, tokenId: string, executionPrice?: number) => Promise<void>;
  positions?: any[];
}

export function SearchPage({ onPlaceBet, positions }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClassifiedResults | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── 搜索执行器 ──
  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      // 为了保证应用调性纯粹，所有的搜索全部强制挂载 wc=1，
      // 让后端直接打到世界杯专有 TAG 接口进行客户端级别的纯净度过滤
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&wc=1`);
      const events = await res.json();
      if (Array.isArray(events)) {
        setResults(classifyAndTransform(events));
      } else {
        setResults({ matches: [], outrights: [], binaries: [] });
      }
    } catch (err) {
      console.error('Search failed:', err);
      setResults({ matches: [], outrights: [], binaries: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 取消防抖，改为手动搜索 ──
  // debounceRef 等不需要再用于触发搜索，保留 ref 防止未来有使用
  // 当用户在输入框回车或者点击搜索按钮时才发起请求

  // ── Quick Filter 点击 ──
  const handleQuickFilter = (keyword: string) => {
    setQuery(keyword);
    // useEffect 防抖会自动触发搜索
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setSearched(false);
    inputRef.current?.focus();
  };

  // ── 派生状态 ──
  const totalResults = results
    ? results.matches.length + results.outrights.length + results.binaries.length
    : 0;
  const isEmpty = searched && !loading && totalResults === 0;
  const showIdleState = !searched && !loading;

  return (
    <div className="pb-32 min-h-[100dvh]">
      <TopHeader isSticky={true} />

      {/* ── 搜索框区域 ── */}
      <div className="px-4 mb-5 mt-2">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Search size={18} className="text-[#00F0FF]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                executeSearch(query);
              }
            }}
            placeholder="搜寻队伍、赛事或话题..."
            className="w-full rounded-2xl py-4 pl-12 pr-[90px] focus:outline-none transition-all"
            style={{
              fontFamily: 'Inter',
              fontSize: '16px',
              fontWeight: 500,
              color: '#fff',
              background: 'rgba(25, 37, 64, 0.6)',
              border: query ? '1px solid rgba(0, 240, 255, 0.5)' : '1px solid rgba(0, 240, 255, 0.2)',
              boxShadow: query ? '0 0 20px rgba(0, 240, 255, 0.15)' : 'none',
            }}
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
            {query && (
              <button
                onClick={handleClear}
                className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <X size={14} color="rgba(255,255,255,0.6)" />
              </button>
            )}
            <button
              onClick={() => executeSearch(query)}
              className="px-4 py-2 rounded-xl active:scale-95 transition-transform truncate"
              style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: '13px',
                color: '#00F0FF',
                background: 'rgba(0, 240, 255, 0.15)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                boxShadow: '0 2px 10px rgba(0, 240, 255, 0.1)',
              }}
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          空窗期: Quick Filters 热门标签
         ════════════════════════════════════════════ */}
      {showIdleState && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="px-4"
        >
          {/* 热门球队 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} color="#FFD700" />
              <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 800, color: '#FFD700', letterSpacing: '0.02em' }}>
                世界杯 · 热门球队
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {HOT_COUNTRIES.map(country => (
                <button
                  key={country.name}
                  onClick={() => handleQuickFilter(country.name)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl active:scale-95 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCountryFlagUrl(country.name, 40)}
                    alt={country.name}
                    width={20}
                    height={15}
                    style={{
                      width: '20px',
                      height: '15px',
                      objectFit: 'cover',
                      borderRadius: '2px',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                  <span style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                    {country.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 热门话题 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} color="#00F0FF" />
              <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 800, color: '#00F0FF', letterSpacing: '0.02em' }}>
                世界杯 · 热门话题
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {HOT_TOPICS.map(topic => {
                const Icon = topic.icon;
                return (
                  <button
                    key={topic.keyword}
                    onClick={() => handleQuickFilter(topic.keyword)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl active:scale-95 transition-all"
                    style={{
                      background: 'rgba(0, 240, 255, 0.06)',
                      border: '1px solid rgba(0, 240, 255, 0.15)',
                    }}
                  >
                    <Icon size={14} color="#00F0FF" />
                    <span style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 700, color: '#00F0FF' }}>
                      {topic.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 搜索提示 */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl mt-2"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <Search size={13} className="text-white/20 flex-shrink-0" />
            <span style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              输入英文关键词搜索 Polymarket 上的实时市场，如 &quot;Messi&quot;, &quot;Champions League&quot;
            </span>
          </div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════
          Loading: 骨架屏
         ════════════════════════════════════════════ */}
      {loading && (
        <div className="mt-2">
          <SkeletonCard style="match" />
          <SkeletonCard style="outright" />
          <SkeletonCard style="match" />
        </div>
      )}

      {/* ════════════════════════════════════════════
          空结果态
         ════════════════════════════════════════════ */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center pt-16 pb-12">
          {/* Glow Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#00F0FF] blur-[30px] opacity-15 rounded-full animate-pulse" />
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative z-10"
              style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)' }}
            >
              <Search size={24} color="#00F0FF" strokeWidth={2} />
            </div>
          </div>
          <h3 style={{ fontFamily: 'Inter', fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
            未找到相关市场
          </h3>
          <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '260px' }}>
            尝试用英文搜索球队名称或赛事关键词，如 &quot;Brazil&quot;, &quot;World Cup Winner&quot;
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════
          搜索结果: 三路智能分发
         ════════════════════════════════════════════ */}
      {!loading && results && totalResults > 0 && (
        <div className="flex flex-col gap-1">
          {/* 结果计数 */}
          <div className="px-5 pb-2 flex items-center gap-2">
            <span style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
              找到 {totalResults} 个市场
            </span>
          </div>

          {/* ── 赛程 (Matches) Section ── */}
          {results.matches.length > 0 && (
            <div>
              <div className="px-5 pb-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF2A55]" />
                  <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                    赛程
                  </span>
                  <span style={{ fontFamily: 'Inter', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>
                    {results.matches.length}
                  </span>
                </div>
              </div>
              {results.matches.map((match, i) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  index={i}
                  onPlaceBet={onPlaceBet}
                  positions={positions}
                />
              ))}
            </div>
          )}

          {/* ── 趣味投注 (Outrights & Binaries) Section ── */}
          {(results.outrights.length > 0 || results.binaries.length > 0) && (
            <div>
              <div className="px-5 pb-2 pt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                  <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                    趣味投注
                  </span>
                  <span style={{ fontFamily: 'Inter', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>
                    {results.outrights.length + results.binaries.length}
                  </span>
                </div>
              </div>
              
              {/* 先展示长线预测 */}
              {results.outrights.map((market, i) => (
                <OutrightCard
                  key={market.id}
                  market={market}
                  index={i}
                  onPlaceBet={onPlaceBet}
                  positions={positions}
                />
              ))}
              
              {/* 再展示是否预测(二元) */}
              {results.binaries.map((market, i) => (
                <BinaryOutrightCard
                  key={market.id}
                  market={market}
                  index={i}
                  onPlaceBet={onPlaceBet}
                  positions={positions}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
