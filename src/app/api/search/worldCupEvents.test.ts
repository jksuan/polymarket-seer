import { describe, expect, it, vi } from "vitest";
import {
  buildWorldCupEventsPageUrl,
  countMoneylineMarkets,
  fetchAllWorldCupEvents,
  filterWorldCupEventsForClient,
  shouldIncludeWorldCupEvent,
} from "./worldCupEvents";

describe("worldCupEvents", () => {
  it("buildWorldCupEventsPageUrl 含 tag_id 与 offset", () => {
    const url = buildWorldCupEventsPageUrl(200);
    expect(url).toContain("tag_id=102232");
    expect(url).toContain("offset=200");
    expect(url).toContain("limit=100");
  });

  it("shouldIncludeWorldCupEvent 保留非 vs 与含 moneyline 的对阵", () => {
    expect(
      shouldIncludeWorldCupEvent({ title: "2026 FIFA World Cup Winner", markets: [{ sportsMarketType: "moneyline" }] })
    ).toBe(true);
    expect(
      shouldIncludeWorldCupEvent({
        title: "Mexico vs. South Africa",
        markets: [
          { sportsMarketType: "moneyline" },
          { sportsMarketType: "moneyline" },
          { sportsMarketType: "moneyline" },
        ],
      })
    ).toBe(true);
    expect(
      shouldIncludeWorldCupEvent({
        title: "Mexico vs. South Africa - More Markets",
        markets: [{ sportsMarketType: "spreads" }, { sportsMarketType: "totals" }],
      })
    ).toBe(false);
  });

  it("filterWorldCupEventsForClient 过滤纯衍生对阵盘", () => {
    const filtered = filterWorldCupEventsForClient([
      { id: "1", title: "Group A Winner", markets: [] },
      { id: "2", title: "A vs. B", markets: [{ sportsMarketType: "moneyline" }] },
      { id: "3", title: "A vs. B - Exact Score", markets: [{ sportsMarketType: "soccer_exact_score" }] },
    ]);
    expect(filtered.map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("fetchAllWorldCupEvents includeClosed 合并 open 与 closed", async () => {
    const fetchPage = vi.fn(async (url: string) => {
      if (url.includes("closed=true")) {
        return [{ id: "closed-1", title: "A vs. B", volume: "1", markets: [{ sportsMarketType: "moneyline" }] }];
      }
      return [{ id: "open-1", title: "C vs. D", volume: "2", markets: [{ sportsMarketType: "moneyline" }] }];
    });

    const events = await fetchAllWorldCupEvents(fetchPage, { includeClosed: true });
    expect(events.map((e) => e.id).sort()).toEqual(["closed-1", "open-1"]);
  });

  it("fetchAllWorldCupEvents 翻页去重直至不足一页", async () => {
    const page0 = Array.from({ length: 100 }, (_, i) => ({
      id: `p0-${i}`,
      title: `Team${i} vs. Team${i + 1}`,
      volume: String(i),
      markets: [{ sportsMarketType: "moneyline" }],
    }));

    const fetchPage = vi.fn(async (url: string) => {
      if (url.includes("offset=0")) {
        return page0;
      }
      if (url.includes("offset=100")) {
        return [{ id: "c", title: "C vs. D", volume: "999", markets: [{ sportsMarketType: "moneyline" }] }];
      }
      return [];
    });

    const events = await fetchAllWorldCupEvents(fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(events[0]?.id).toBe("c");
    expect(events).toHaveLength(101);
  });

  it("countMoneylineMarkets 只统计 moneyline 类型", () => {
    expect(
      countMoneylineMarkets({
        markets: [{ sportsMarketType: "moneyline" }, { sportsMarketType: "spreads" }],
      })
    ).toBe(1);
  });
});
