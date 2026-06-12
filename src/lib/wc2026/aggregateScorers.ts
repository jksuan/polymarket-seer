import { canonicalCountryName } from "@/lib/countryFlags";
import type { Scorer } from "@/lib/mockScorers";
import type { EspnScoreboardEvent } from "@/lib/wc2026/espnScoreboard";

type MutableScorer = {
  id: string;
  name: string;
  countryCode: string;
  goals: number;
  avatarUrl: string | null;
};

function isCountableGoal(detail: {
  scoringPlay?: boolean;
  ownGoal?: boolean;
  type?: { text?: string };
}): boolean {
  if (!detail.scoringPlay) return false;
  if (detail.ownGoal) return false;
  const text = (detail.type?.text || "").toLowerCase();
  return text.includes("goal");
}

function buildTeamCountryMap(event: EspnScoreboardEvent): Record<string, string> {
  const map: Record<string, string> = {};
  const competitors = event.competitions?.[0]?.competitors || [];
  for (const competitor of competitors) {
    const teamId = competitor.team?.id;
    const country = competitor.team?.displayName || competitor.team?.name;
    if (teamId && country) {
      map[String(teamId)] = canonicalCountryName(country);
    }
  }
  return map;
}

/** 从 ESPN scoreboard events 聚合 2026 世界杯射手榜 */
export function aggregateWc2026Scorers(events: EspnScoreboardEvent[]): Scorer[] {
  const stats = new Map<string, MutableScorer>();

  for (const event of events) {
    const teamCountries = buildTeamCountryMap(event);
    const details = event.competitions?.[0]?.details || [];

    for (const detail of details) {
      if (!isCountableGoal(detail)) continue;

      const athlete = detail.athletesInvolved?.[0];
      const playerName = athlete?.displayName?.trim();
      const teamId = detail.team?.id ? String(detail.team.id) : "";
      const countryCode = teamCountries[teamId];
      if (!playerName || !countryCode) continue;

      const playerId = athlete?.id ? `espn-${athlete.id}` : `${playerName}-${countryCode}`.toLowerCase();
      const existing = stats.get(playerId);
      if (existing) {
        existing.goals += 1;
        if (!existing.avatarUrl && athlete?.headshot) {
          existing.avatarUrl = athlete.headshot;
        }
      } else {
        stats.set(playerId, {
          id: playerId,
          name: playerName,
          countryCode,
          goals: 1,
          avatarUrl: athlete?.headshot || null,
        });
      }
    }
  }

  const sorted = [...stats.values()].sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return a.name.localeCompare(b.name);
  });

  let rank = 0;
  let lastGoals = -1;
  return sorted.map((player, index) => {
    if (player.goals !== lastGoals) {
      rank = index + 1;
      lastGoals = player.goals;
    }
    return {
      id: player.id,
      rank,
      name: player.name,
      countryCode: player.countryCode,
      goals: player.goals,
      avatarUrl: player.avatarUrl,
    };
  });
}
