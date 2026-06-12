import type { GammaEvent } from "@/app/api/search/worldCupEvents";
import {
  canonicalCountryName,
  getCountryColor,
  getCountryGroup,
  getCountryShortCode,
  getWc2026TeamsByGroup,
  isGroupStageMatch,
  WC2026_GROUP_LETTERS,
} from "@/lib/countryFlags";
import type { StandingsGroup, StandingsTeam } from "@/lib/mockStandings";

export type StandingsMatchResult = {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  group: string;
};

/** Parse Gamma `score` (e.g. "2-0"; compound strings use the first segment). */
export function parseEventScore(score: string | null | undefined): { home: number; away: number } | null {
  if (!score || typeof score !== "string") return null;
  const segment = score.trim().split("|")[0]?.trim() ?? "";
  const matched = segment.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!matched) return null;
  return { home: parseInt(matched[1], 10), away: parseInt(matched[2], 10) };
}

function resolveMatchEnded(
  evt: Pick<GammaEvent, "live" | "ended">,
  homeMarket: { closed?: boolean | null },
  awayMarket: { closed?: boolean | null },
  matchTimeMs: number,
  now: number
): boolean {
  if (evt.ended === true || homeMarket.closed || awayMarket.closed) {
    return true;
  }
  if (evt.live === true) {
    return false;
  }
  return now >= matchTimeMs + 120 * 60 * 1000;
}

type MoneylineMarket = {
  sportsMarketType?: string | null;
  groupItemTitle?: string;
  closed?: boolean | null;
  gameStartTime?: string;
};

function extractMoneylineTeams(
  evt: GammaEvent
): { homeName: string; awayName: string; homeMarket: MoneylineMarket; awayMarket: MoneylineMarket } | null {
  const moneylineMarkets = (evt.markets || []).filter(
    (m) => (m.sportsMarketType || "").toLowerCase() === "moneyline"
  );
  if (moneylineMarkets.length !== 3) return null;

  const drawMarket = moneylineMarkets.find((m) =>
    ((m as MoneylineMarket).groupItemTitle || "").toLowerCase().includes("draw")
  );
  const teamMarkets = moneylineMarkets.filter(
    (m) => !((m as MoneylineMarket).groupItemTitle || "").toLowerCase().includes("draw")
  ) as MoneylineMarket[];
  if (!drawMarket || teamMarkets.length !== 2) return null;

  const titleParts = (evt.title || "").split(/\s+vs\.?\s+/i);
  const homeName = canonicalCountryName(
    titleParts[0]?.trim() || teamMarkets[0]?.groupItemTitle || ""
  );
  const awayName = canonicalCountryName(
    titleParts[1]?.trim() || teamMarkets[1]?.groupItemTitle || ""
  );

  let homeMarket = teamMarkets.find(
    (m) => canonicalCountryName(m.groupItemTitle || "") === homeName
  );
  let awayMarket = teamMarkets.find(
    (m) => canonicalCountryName(m.groupItemTitle || "") === awayName
  );
  if (!homeMarket || !awayMarket) {
    homeMarket = teamMarkets[0];
    awayMarket = teamMarkets[1];
  }

  return { homeName, awayName, homeMarket, awayMarket };
}

/** Extract completed group-stage results from raw Gamma events. */
export function extractStandingsMatchesFromEvents(
  events: GammaEvent[],
  now = Date.now()
): StandingsMatchResult[] {
  const results: StandingsMatchResult[] = [];

  for (const evt of events) {
    const parsed = extractMoneylineTeams(evt);
    if (!parsed) continue;

    const { homeName, awayName, homeMarket, awayMarket } = parsed;
    if (!isGroupStageMatch(homeName, awayName)) continue;

    const score = parseEventScore(evt.score);
    if (!score) continue;

    const startTime = evt.startTime || homeMarket.gameStartTime || evt.eventDate;
    const matchTimeMs = startTime ? new Date(startTime).getTime() : 0;
    const ended = resolveMatchEnded(evt, homeMarket, awayMarket, matchTimeMs, now);
    if (!ended) continue;

    const group = getCountryGroup(homeName);
    if (!group) continue;

    results.push({
      homeName,
      awayName,
      homeScore: score.home,
      awayScore: score.away,
      group,
    });
  }

  return results;
}

type MutableTeamStats = {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
};

function emptyStats(name: string): MutableTeamStats {
  return { name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
}

function applyResult(stats: MutableTeamStats, goalsFor: number, goalsAgainst: number): void {
  stats.played += 1;
  stats.goalsFor += goalsFor;
  stats.goalsAgainst += goalsAgainst;
  if (goalsFor > goalsAgainst) {
    stats.won += 1;
  } else if (goalsFor < goalsAgainst) {
    stats.lost += 1;
  } else {
    stats.drawn += 1;
  }
}

function sortTeamsInGroup(teams: MutableTeamStats[]): MutableTeamStats[] {
  return [...teams].sort((a, b) => {
    const pointsA = a.won * 3 + a.drawn;
    const pointsB = b.won * 3 + b.drawn;
    if (pointsB !== pointsA) return pointsB - pointsA;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });
}

function toStandingsTeam(stats: MutableTeamStats, rankIndex: number): StandingsTeam {
  const gd = stats.goalsFor - stats.goalsAgainst;
  const gdStr = gd > 0 ? `+${gd}` : String(gd);
  const colors = getCountryColor(stats.name);
  return {
    id: stats.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: stats.name,
    code: getCountryShortCode(stats.name),
    primaryColor: colors.primary,
    played: stats.played,
    won: stats.won,
    drawn: stats.drawn,
    lost: stats.lost,
    goalsFor: stats.goalsFor,
    goalsAgainst: stats.goalsAgainst,
    goalDifference: gdStr,
    points: stats.won * 3 + stats.drawn,
    qualified: rankIndex < 2,
  };
}

/** Build 2026 group standings: seed all 48 teams, merge Gamma results, sort by points/GD/GF. */
export function aggregateWc2026Standings(events: GammaEvent[], now = Date.now()): StandingsGroup[] {
  const roster = getWc2026TeamsByGroup();
  const groupStats: Record<string, Record<string, MutableTeamStats>> = {};

  for (const letter of WC2026_GROUP_LETTERS) {
    groupStats[letter] = {};
    for (const teamName of roster[letter] || []) {
      groupStats[letter][teamName] = emptyStats(teamName);
    }
  }

  for (const match of extractStandingsMatchesFromEvents(events, now)) {
    const home = groupStats[match.group]?.[match.homeName];
    const away = groupStats[match.group]?.[match.awayName];
    if (!home || !away) continue;
    applyResult(home, match.homeScore, match.awayScore);
    applyResult(away, match.awayScore, match.homeScore);
  }

  return WC2026_GROUP_LETTERS.map((letter) => {
    const teams = sortTeamsInGroup(Object.values(groupStats[letter] || {}));
    return {
      groupName: `${letter}组 (Group ${letter})`,
      teams: teams.map((t, idx) => toStandingsTeam(t, idx)),
    };
  });
}
