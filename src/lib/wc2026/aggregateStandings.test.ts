import { describe, expect, it } from "vitest";
import {
  aggregateWc2026Standings,
  extractStandingsMatchesFromEvents,
  parseEventScore,
} from "./aggregateStandings";

const baseMarkets = [
  {
    sportsMarketType: "moneyline",
    groupItemTitle: "Mexico",
    outcomePrices: "[0.9,0.1]",
    closed: true,
  },
  {
    sportsMarketType: "moneyline",
    groupItemTitle: "South Africa",
    outcomePrices: "[0.05,0.95]",
    closed: true,
  },
  {
    sportsMarketType: "moneyline",
    groupItemTitle: "Draw",
    outcomePrices: "[0.05,0.95]",
    closed: true,
  },
];

describe("parseEventScore", () => {
  it("parses simple score strings", () => {
    expect(parseEventScore("2-0")).toEqual({ home: 2, away: 0 });
    expect(parseEventScore("1 - 1")).toEqual({ home: 1, away: 1 });
  });

  it("uses first segment before pipe", () => {
    expect(parseEventScore("2-0|extra")).toEqual({ home: 2, away: 0 });
  });
});

describe("extractStandingsMatchesFromEvents", () => {
  it("includes ended group-stage matches with scores", () => {
    const results = extractStandingsMatchesFromEvents([
      {
        id: "1",
        title: "Mexico vs. South Africa",
        score: "2-0",
        ended: true,
        startTime: "2020-01-01T12:00:00.000Z",
        markets: baseMarkets,
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      homeName: "Mexico",
      awayName: "South Africa",
      homeScore: 2,
      awayScore: 0,
      group: "A",
    });
  });

  it("skips live matches without ended flag", () => {
    const results = extractStandingsMatchesFromEvents([
      {
        id: "2",
        title: "Mexico vs. South Africa",
        score: "1-0",
        live: true,
        ended: false,
        startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        markets: baseMarkets.map((m) => ({ ...m, closed: false })),
      },
    ]);
    expect(results).toHaveLength(0);
  });
});

describe("aggregateWc2026Standings", () => {
  it("seeds all 12 groups with 4 teams each", () => {
    const groups = aggregateWc2026Standings([]);
    expect(groups).toHaveLength(12);
    expect(groups[0].groupName).toBe("A组 (Group A)");
    expect(groups.every((g) => g.teams.length === 4)).toBe(true);
    expect(groups[0].teams.every((t) => t.played === 0 && t.points === 0)).toBe(true);
  });

  it("updates points after a group A result", () => {
    const groups = aggregateWc2026Standings([
      {
        id: "1",
        title: "Mexico vs. South Africa",
        score: "2-0",
        ended: true,
        startTime: "2020-01-01T12:00:00.000Z",
        markets: baseMarkets,
      },
    ]);

    const groupA = groups.find((g) => g.groupName.startsWith("A"))!;
    const mexico = groupA.teams.find((t) => t.name === "Mexico")!;
    const southAfrica = groupA.teams.find((t) => t.name === "South Africa")!;

    expect(mexico).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 2, goalsAgainst: 0, qualified: true });
    expect(southAfrica).toMatchObject({ played: 1, lost: 1, points: 0, goalsFor: 0, goalsAgainst: 2 });
    expect(groupA.teams[0].name).toBe("Mexico");
  });
});
