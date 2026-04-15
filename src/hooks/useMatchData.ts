'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { parseMatchEvents, groupMatchesByDate, ParsedMatch, MatchGroup } from '@/components/ui/MatchCard';

// ── Raw events fetcher ──
const rawEventsFetcher = async ([url, keyword]: [string, string]) => {
  const res = await fetch(`${url}?q=${encodeURIComponent(keyword)}`);
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
  const { data: rawMatchEvents, isLoading } = useSWR(
    enabled ? ['/api/search', 'FIFA World Cup'] : null,
    rawEventsFetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  const allMatches: ParsedMatch[] = useMemo(() => {
    if (!rawMatchEvents) return [];
    return parseMatchEvents(rawMatchEvents);
  }, [rawMatchEvents]);

  const matchGroups: MatchGroup[] = useMemo(() => {
    return groupMatchesByDate(allMatches);
  }, [allMatches]);

  return { allMatches, matchGroups, isLoading };
}
