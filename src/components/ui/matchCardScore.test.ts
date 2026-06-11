import { describe, expect, it } from "vitest";

import { parseEventScore, parseMatchEvents } from "./MatchCard";

describe("parseEventScore", () => {
  it("parses standard home-away score", () => {
    expect(parseEventScore("2-0")).toEqual({ home: 2, away: 0 });
  });

  it("parses compound esports score using first segment", () => {
    expect(parseEventScore("000-000|2-0|Bo3")).toEqual({ home: 0, away: 0 });
  });

  it("returns null for missing or invalid values", () => {
    expect(parseEventScore(null)).toBeNull();
    expect(parseEventScore("")).toBeNull();
    expect(parseEventScore("invalid")).toBeNull();
  });
});

describe("parseMatchEvents score fields", () => {
  const baseMarkets = [
    {
      sportsMarketType: "moneyline",
      groupItemTitle: "Mexico",
      outcomePrices: "[0.9,0.1]",
      clobTokenIds: "[\"home-token\"]",
      conditionId: "home-cond",
      closed: false,
    },
    {
      sportsMarketType: "moneyline",
      groupItemTitle: "South Africa",
      outcomePrices: "[0.05,0.95]",
      clobTokenIds: "[\"away-token\"]",
      conditionId: "away-cond",
      closed: false,
    },
    {
      sportsMarketType: "moneyline",
      groupItemTitle: "Draw",
      outcomePrices: "[0.05,0.95]",
      clobTokenIds: "[\"draw-token\"]",
      conditionId: "draw-cond",
      closed: false,
    },
  ];

  it("maps Gamma score onto ParsedMatch", () => {
    const matches = parseMatchEvents([
      {
        id: "evt-1",
        title: "Mexico vs. South Africa",
        startTime: "2026-06-11T19:00:00.000Z",
        volume: "1000",
        score: "2-0",
        live: true,
        ended: false,
        markets: baseMarkets,
      },
    ]);

    expect(matches).toHaveLength(1);
    expect(matches[0].homeScore).toBe(2);
    expect(matches[0].awayScore).toBe(0);
    expect(matches[0].status).toBe("live");
  });
});
