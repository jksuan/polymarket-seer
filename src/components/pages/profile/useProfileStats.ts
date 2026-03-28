import { useMemo } from "react";

const SPORT_CATEGORIES = [
  { name: "篮球",  emoji: "🏀", keywords: ["nba", "basketball", "lakers", "celtics", "warriors", "playoff", "finals"], color: "#FF6B00" },
  { name: "足球",  emoji: "⚽", keywords: ["soccer", "football", "premier", "laliga", "bundesliga", "champions-league", "world-cup", "uefa", "fifa", "serie-a"], color: "#00F0FF" },
  { name: "网球",  emoji: "🎾", keywords: ["tennis", "wimbledon", "us-open", "french-open", "australian-open", "atp", "wta"], color: "#ADFF2F" },
  { name: "其它",  emoji: "📊", keywords: [], color: "#8B5CF6" },
];

function getCategory(item: any) {
  const slug = (item.eventSlug || item.slug || "").toLowerCase();
  for (const cat of SPORT_CATEGORIES.slice(0, -1)) {
    if (cat.keywords.some(k => slug.includes(k))) return cat;
  }
  return SPORT_CATEGORIES[SPORT_CATEGORIES.length - 1];
}

export function useProfileStats(trades: any[], positions: any[]) {
  return useMemo(() => {
    let currentInvested = 0;
    let currentValue = 0;
    let historyInvested = 0;
    let historyRevenue = 0;

    const catMap = new Map<string, {
      cat: typeof SPORT_CATEGORIES[0];
      totalBuy: number;
      totalRevenue: number;
      currentValue: number;
    }>();

    function ensureCat(catName: string, cat: typeof SPORT_CATEGORIES[0]) {
      if (!catMap.has(catName)) catMap.set(catName, { cat, totalBuy: 0, totalRevenue: 0, currentValue: 0 });
      return catMap.get(catName)!;
    }

    if (trades && trades.length > 0) {
      trades.forEach((t: any) => {
        const usdc = Number(t.usdcSize || 0);
        const cat = getCategory(t);
        const entry = ensureCat(cat.name, cat);
        if (t.type === "TRADE") {
          if (t.side === "BUY") {
            entry.totalBuy     += usdc;
            historyInvested    += usdc;
          } else if (t.side === "SELL") {
            entry.totalRevenue += usdc;
            historyRevenue     += usdc;
          }
        } else if (t.type === "REDEEM") {
          entry.totalRevenue   += usdc;
          historyRevenue       += usdc;
        }
      });
    }

    let distributionData: {name: string, value: number, color: string, pnl: number}[] = [];

    if (positions) {
      positions.forEach((pos: any) => {
        const cv = Number(pos.currentValue || 0);
        const iv = Number(pos.initialValue || pos.totalBought || 0);
        currentValue    += cv;
        currentInvested += iv;
        const cat = getCategory(pos);
        const entry = ensureCat(cat.name, cat);
        entry.currentValue += cv;
      });
    }

    distributionData = [...catMap.values()]
      .map(({ cat, totalBuy, totalRevenue, currentValue: cv }) => {
        const netPnl = (totalRevenue + cv) - totalBuy;
        return {
          name:  cat.name,
          value: Math.max(totalBuy, 0.0001),
          color: cat.color,
          pnl:   netPnl,
        };
      })
      .filter(d => d.value > 0.0001 || Math.abs(d.pnl) > 0.001)
      .sort((a, b) => b.value - a.value);

    if (distributionData.length === 0) {
      distributionData = [{ name: "空仓", value: 1, color: "#8B5CF6", pnl: 0 }];
    }

    const totalPnl = distributionData.reduce((acc, d) => acc + d.pnl, 0);
    const historyNetProfit = historyRevenue - historyInvested;
    const currentUnrealizedPnl = currentValue - currentInvested;
    const currentUnrealizedPct = currentInvested > 0 ? (currentUnrealizedPnl / currentInvested) * 100 : 0;

    return {
      historyInvested,
      historyRevenue,
      currentInvested,
      currentValue,
      distributionData,
      totalPnl,
      historyNetProfit,
      currentUnrealizedPnl,
      currentUnrealizedPct
    };
  }, [trades, positions]);
}
