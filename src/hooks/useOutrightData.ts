'use client';

import useSWR from 'swr';
import { PrimaryTab, SportMarket } from '@/types/sports';

// ── Outrights data fetcher + transformer ──
const outrightsFetcher = async ([url, keyword, tab]: [string, string, PrimaryTab]) => {
  const res = await fetch(`${url}?q=${encodeURIComponent(keyword)}`);
  if (!res.ok) throw new Error('API fetch failed');
  const events = await res.json();

  const mapped: SportMarket[] = [];

  if (Array.isArray(events)) {
    for (const evt of events) {
      if (!evt.markets || evt.markets.length === 0) continue;

      // Filter out standard matches from the outrights feed
      const titleLower = (evt.title || '').toLowerCase();
      if (titleLower.includes(' vs ') || titleLower.includes(' vs.')) {
        continue;
      }

      const outrightOutcomes: string[] = [];
      const outrightPrices: number[] = [];
      const outrightIcons: string[] = [];
      const outrightVolumes: number[] = [];
      const outrightTokenIds: string[][] = [];
      const mainIcon = evt.image || evt.icon || '';

      if (evt.markets.length > 1) {
        // Multi-market event (e.g. group winner: one market per team)
        // Skip resolved or closed sub-markets (e.g. Italy/Peru eliminated in qualifiers)
        const activeMarkets = evt.markets.filter((m: any) => m.active !== false && m.closed !== true);
        for (const m of activeMarkets) {
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
          const subIcon = m.image || m.icon || '';
          outrightIcons.push(subIcon === mainIcon ? '' : subIcon);
          outrightVolumes.push(parseFloat(m.volume || '0') || 0);
          // Extract clobTokenIds [yesTokenId, noTokenId]
          let tokenIds: string[] = [];
          try {
            const raw = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
            if (Array.isArray(raw)) tokenIds = raw;
          } catch {}
          outrightTokenIds.push(tokenIds);
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
          outrightIcons.push('');
          outrightVolumes.push(0);
        });
        // Single market: extract token IDs for each outcome
        let tokenIds: string[] = [];
        try {
          const raw = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
          if (Array.isArray(raw)) tokenIds = raw;
        } catch {}
        // For binary: outcome[0] = YES uses tokenIds[0], outcome[1] = NO uses tokenIds[1]
        outcomes.forEach((_o: string, i: number) => {
          outrightTokenIds.push(i === 0 ? tokenIds : [...tokenIds].reverse());
        });
      }

      mapped.push({
        id: evt.id || `evt-${Date.now()}-${Math.random()}`,
        question: evt.title || evt.markets[0]?.question || '世界杯专属预测',
        imageUrl: mainIcon,
        sport: 'matches',
        leagueCode: 'WC',
        leagueName: '世界杯 2026',
        leagueNameEn: 'FIFA World Cup',
        status: 'live',
        matchTime: 'Outright',
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
      });
    }
  }

  // Strictly sort by descending total volume for presentation
  mapped.sort((a, b) => b.volume - a.volume);
  return mapped;
};

/**
 * Custom hook: fetch + transform outright market data for the "趣味投注" tab.
 * Only activates when `enabled` is true.
 */
export function useOutrightData(enabled: boolean, keyword: string) {
  const { data, isLoading } = useSWR(
    enabled ? ['/api/search', keyword, 'outrights' as PrimaryTab] : null,
    outrightsFetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 3000,
    }
  );

  return { markets: data || [], isLoading };
}
