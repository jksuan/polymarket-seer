'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { parseMatchEvents, groupMatchesByDate, ParsedMatch, MatchGroup } from '@/components/ui/MatchCard';
import { useTranslation } from '@/i18n';

// ── Raw events fetcher（含已结束 closed 赛事，供球队/小组赛筛选） ──
const rawEventsFetcher = async ([url, keyword]: [string, string, string]) => {
  const res = await fetch(`${url}?q=${encodeURIComponent(keyword)}&includeClosed=1`);
  if (!res.ok) throw new Error('API fetch failed');
  const events = await res.json();
  return Array.isArray(events) ? events : [];
};

/**
 * Custom hook: fetch + parse + group match events for the "比赛" tab.
 * Only activates when `enabled` is true (i.e. when the matches tab is selected).
 *
 * Returns:
 *  - allMatches: flat list of ParsedMatch (for filtered views like group/knockout)
 *  - matchGroups: date-grouped list (for the default "today hot" view)
 */
export function useMatchData(enabled: boolean) {
  const { locale } = useTranslation();
  const { data: rawMatchEvents, isLoading } = useSWR(
    enabled ? ['/api/search', 'FIFA World Cup', 'includeClosed'] : null,
    rawEventsFetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  const allMatches: ParsedMatch[] = useMemo(() => {
    if (!rawMatchEvents) return [];
    return parseMatchEvents(rawMatchEvents, locale);
  }, [rawMatchEvents, locale]);

  // 日期滑动栏仅展示未结束赛程的日期（与总览「全部」一致）
  const matchGroups: MatchGroup[] = useMemo(() => {
    const openMatches = allMatches.filter((m) => m.status !== 'ended');
    return groupMatchesByDate(openMatches);
  }, [allMatches]);

  return { allMatches, matchGroups, isLoading };
}
