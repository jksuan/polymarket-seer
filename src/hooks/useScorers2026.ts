'use client';

import useSWR from 'swr';
import type { Scorer } from '@/lib/mockScorers';

const scorersFetcher = async (url: string): Promise<Scorer[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Scorers fetch failed');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Live 2026 World Cup scorers from ESPN match timelines.
 * Only fetches when `enabled` (e.g. scorers tab + year 2026).
 */
export function useScorers2026(enabled: boolean) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    enabled ? '/api/scorers/2026' : null,
    scorersFetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    }
  );

  return {
    scorers: data ?? [],
    isLoading: enabled && isLoading && !data,
    isValidating,
    error,
    refresh: mutate,
  };
}
