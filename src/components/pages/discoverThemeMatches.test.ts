import { describe, expect, it } from "vitest";

import type { ParsedMatch } from "@/components/ui/MatchCard";
import { pickDiscoverThemeMatches } from "./discoverThemeMatches";

function mockMatch(
  id: string,
  status: ParsedMatch["status"],
  volume: number,
  homeProb = 50,
  awayProb = 50,
): ParsedMatch {
  return {
    id,
    title: `Team A vs Team B ${id}`,
    dateLabel: "Jun 12",
    timeLabel: "03:00",
    dateISO: "2026-06-12",
    status,
    homeScore: null,
    awayScore: null,
    volume,
    isGroupStage: true,
    home: {
      name: "Mexico",
      shortCode: "MEX",
      flagUrl: "",
      probability: homeProb,
      tokenId: `home-${id}`,
      conditionId: `home-cond-${id}`,
      style: { primary: "#006847", accent: "#fff", glow: "rgba(0,104,71,0.4)" },
    },
    away: {
      name: "South Africa",
      shortCode: "RSA",
      flagUrl: "",
      probability: awayProb,
      tokenId: `away-${id}`,
      conditionId: `away-cond-${id}`,
      style: { primary: "#007749", accent: "#fff", glow: "rgba(0,119,73,0.4)" },
    },
    draw: {
      probability: 10,
      tokenId: `draw-${id}`,
      conditionId: `draw-cond-${id}`,
    },
    rawMarket: {
      id,
      question: `Match ${id}`,
      sport: "matches",
      leagueCode: "WC",
      leagueName: "世界杯 2026",
      leagueNameEn: "FIFA World Cup",
      status: status === "ended" ? "ended" : "live",
      matchTime: "03:00",
      matchTimeISO: "2026-06-12T03:00:00.000Z",
      homeTeam: {
        shortName: "MEX",
        fullName: "Mexico",
        displayName: "Mexico",
        primaryColor: "#006847",
        accentColor: "#fff",
        glowColor: "rgba(0,104,71,0.4)",
      },
      awayTeam: {
        shortName: "RSA",
        fullName: "South Africa",
        displayName: "South Africa",
        primaryColor: "#007749",
        accentColor: "#fff",
        glowColor: "rgba(0,119,73,0.4)",
      },
      homeProbability: homeProb,
      awayProbability: awayProb,
      homeOdds: 2,
      awayOdds: 2,
      volume,
      liquidity: 0,
      supporters: 0,
      isHot: false,
      isFeatured: false,
    },
  };
}

describe("pickDiscoverThemeMatches", () => {
  it("excludes ended matches from trending hero and horizontal pool", () => {
    const ended = mockMatch("ended-high-vol", "ended", 20_000_000, 100, 0);
    const live = mockMatch("live-mid-vol", "live", 5_000_000, 55, 45);
    const upcoming = mockMatch("upcoming-low-vol", "upcoming", 1_000_000, 60, 40);

    const result = pickDiscoverThemeMatches([ended, live, upcoming]);

    expect(result.trendingMatch?.id).toBe("live-mid-vol");
    expect(result.trendingRest?.every((m) => m.status !== "ended")).toBe(true);
    expect(result.trendingRest?.map((m) => m.id)).toEqual(["upcoming-low-vol"]);
  });

  it("returns empty when every match has ended", () => {
    const result = pickDiscoverThemeMatches([
      mockMatch("a", "ended", 10_000_000),
      mockMatch("b", "ended", 5_000_000),
    ]);

    expect(result).toEqual({});
  });
});
