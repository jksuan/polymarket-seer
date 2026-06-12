'use client';

import useSWR from 'swr';
import type { StandingsGroup } from '@/lib/mockStandings';

const standingsFetcher = async (url: string): Promise<StandingsGroup[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Standings fetch failed');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Live 2026 World Cup group standings from Gamma match results.
 * Only fetches when `enabled` (e.g. standings tab + year 2026 + groups view).
 */
export function useStandings2026(enabled: boolean) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    enabled ? '/api/standings/2026' : null,
    standingsFetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    }
  );

  return {
    groups: data ?? [],
    isLoading: enabled && isLoading && !data,
    isValidating,
    error,
    refresh: mutate,
  };
}
