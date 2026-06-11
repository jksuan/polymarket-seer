import type { ParsedMatch } from '@/components/ui/MatchCard';

export interface DiscoverThemeMatches {
  trendingMatch?: ParsedMatch;
  splitMatch?: ParsedMatch;
  trendingRest?: ParsedMatch[];
  splitRest?: ParsedMatch[];
  underdogMatch?: ParsedMatch;
  underdogRest?: ParsedMatch[];
}

/** 挑战页发现流：仅从未结束对阵中选题（可投注 / 进行中）。 */
export function pickDiscoverThemeMatches(allMatches: ParsedMatch[] | undefined | null): DiscoverThemeMatches {
  const pool = (allMatches ?? []).filter((m) => m.status !== 'ended');
  if (pool.length === 0) return {};

  const sortedByVolume = [...pool].sort((a, b) => b.volume - a.volume);
  const trending = sortedByVolume[0];

  const splitMatches = pool.filter((m) => Math.abs(m.home.probability - m.away.probability) <= 15);
  splitMatches.sort(
    (a, b) => Math.abs(a.home.probability - a.away.probability) - Math.abs(b.home.probability - b.away.probability),
  );
  const split = splitMatches.find((m) => m.id !== trending?.id) || splitMatches[0] || sortedByVolume[1];

  const trendingRest = sortedByVolume.filter((m) => m.id !== trending?.id).slice(0, 6);
  const splitRest = splitMatches.filter((m) => m.id !== split?.id && m.id !== trending?.id).slice(0, 6);

  const underdogCandidates = pool
    .filter((m) => {
      const minProb = Math.min(m.home.probability, m.away.probability);
      return minProb >= 5 && minProb <= 20;
    })
    .sort(
      (a, b) => Math.min(a.home.probability, a.away.probability) - Math.min(b.home.probability, b.away.probability),
    );
  const underdog =
    underdogCandidates.find((m) => m.id !== trending?.id && m.id !== split?.id) || underdogCandidates[0];
  const underdogRest = underdogCandidates.filter((m) => m.id !== underdog?.id).slice(0, 6);

  return { trendingMatch: trending, splitMatch: split, trendingRest, splitRest, underdogMatch: underdog, underdogRest };
}
