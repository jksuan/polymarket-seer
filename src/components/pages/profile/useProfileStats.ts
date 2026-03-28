import { useMemo } from "react";


export interface CategoryPnlItem {
  category: string;
  pnl: number;        // net cash P&L
  invested: number;   // total bought
  revenue: number;    // total sold + redeemed
}

interface KeywordEntry {
  pattern: string;
  category: string;
}

/**
 * Extract the filename portion from a URL for fuzzy icon matching.
 * e.g. "https://cdn.example.com/path/league-lal.png" → "league-lal.png"
 *      "https://cdn.example.com/path/premier+league.jpg?v=2" → "premier+league.jpg"
 */
function iconFilename(url: string): string {
  if (!url) return "";
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").pop() || "";
  } catch {
    // Fallback for malformed URLs: get last segment
    return url.split("/").pop()?.split("?")[0] || "";
  }
}

/**
 * Classify a trade into a sport category using a 4-tier strategy:
 *
 * 1. ★ Icon filename matching (highest accuracy) — compare the filename
 *    part of trade.icon against /sports image filenames. This is tolerant
 *    of CDN domain changes and query parameter differences.
 *
 * 2. conditionId bridge — if the same conditionId exists in positions
 *    data and that position has a classifiable icon, use it.
 *
 * 3. Keyword matching against title/slug text.
 *
 * 4. Slug prefix matching — for slugs structured as "epl-xxx-vs-yyy".
 */
function classifyTrade(
  trade: any,
  keywords: KeywordEntry[],
  leagueToSport: Record<string, string>,
  iconFilenameToCategory: Record<string, string>,
  conditionIdToCategory: Record<string, string>,
): string {
  // ★ Priority 1: Match icon filename against league image filenames
  const tradeIcon = trade.icon || "";
  if (tradeIcon) {
    // Try exact URL match first (fastest)
    if (iconFilenameToCategory[tradeIcon]) {
      return iconFilenameToCategory[tradeIcon];
    }
    // Then try filename-only match (fuzzy, CDN-tolerant)
    const fname = iconFilename(tradeIcon);
    if (fname && iconFilenameToCategory[fname]) {
      return iconFilenameToCategory[fname];
    }
  }

  // Priority 2: conditionId bridge (from positions data)
  const condId = trade.conditionId || "";
  if (condId && conditionIdToCategory[condId]) {
    return conditionIdToCategory[condId];
  }

  // Priority 3: Keyword matching against title/slug text
  const title = (trade.title || trade.question || "").toLowerCase();
  const slug = (trade.eventSlug || trade.slug || "").toLowerCase();
  const searchText = `${title} ${slug}`;

  if (searchText.trim()) {
    for (const kw of keywords) {
      if (searchText.includes(kw.pattern)) {
        return kw.category;
      }
    }

    // Priority 4: Slug prefix matching (e.g. "epl-arsenal-vs-chelsea")
    if (slug) {
      const parts = slug.split("-");
      for (let len = Math.min(3, parts.length); len >= 1; len--) {
        const candidate = parts.slice(0, len).join("");
        if (leagueToSport[candidate]) return leagueToSport[candidate];
      }
      for (let len = Math.min(3, parts.length); len >= 1; len--) {
        const candidate = parts.slice(0, len).join("-");
        if (leagueToSport[candidate]) return leagueToSport[candidate];
      }
    }
  }

  return "其它";
}

export function useProfileStats(
  trades: any[],
  positions: any[],
  leagueToSport: Record<string, string> = {},
  keywords: KeywordEntry[] = [],
  iconToCategory: Record<string, string> = {},
) {
  return useMemo(() => {
    let currentInvested = 0;
    let currentValue = 0;
    let historyInvested = 0;
    let historyRevenue = 0;

    // ── 1. Aggregate history totals from trades ──
    if (trades && trades.length > 0) {
      trades.forEach((t: any) => {
        const usdc = Number(t.usdcSize || 0);
        if (t.type === "TRADE") {
          if (t.side === "BUY") {
            historyInvested += usdc;
          } else if (t.side === "SELL") {
            historyRevenue  += usdc;
          }
        } else if (t.type === "REDEEM") {
          historyRevenue += usdc;
        }
      });
    }

    // ── 2. Current positions ──
    if (positions) {
      positions.forEach((pos: any) => {
        const cv = Number(pos.currentValue || 0);
        const iv = Number(pos.initialValue || pos.totalBought || 0);
        currentValue    += cv;
        currentInvested += iv;
      });
    }

    const historyNetProfit     = historyRevenue - historyInvested;
    const currentUnrealizedPnl = currentValue - currentInvested;
    const currentUnrealizedPct = currentInvested > 0 ? (currentUnrealizedPnl / currentInvested) * 100 : 0;



    // ── 5. Category PnL aggregation ──
    // Build two lookup maps for classifyTrade:
    // a) iconFilenameToCategory — maps both full URLs and filenames to category
    // b) conditionIdToCategory — bridges positions' conditionId → category via icon

    // a) Expand iconToCategory to include filename-only keys for fuzzy matching
    const iconFilenameToCategory: Record<string, string> = {};
    for (const [url, cat] of Object.entries(iconToCategory)) {
      iconFilenameToCategory[url] = cat; // exact URL match
      const fname = url.split("/").pop()?.split("?")[0] || "";
      if (fname) iconFilenameToCategory[fname] = cat; // filename match
    }

    // b) Build conditionId → category from positions data
    //    positions have both icon and conditionId, so we can bridge
    const conditionIdToCategory: Record<string, string> = {};
    if (positions && positions.length > 0) {
      positions.forEach((p: any) => {
        const posIcon = p.icon || "";
        const condId = p.conditionId || "";
        if (!posIcon || !condId) return;

        // Try to classify this position's icon
        if (iconFilenameToCategory[posIcon]) {
          conditionIdToCategory[condId] = iconFilenameToCategory[posIcon];
          return;
        }
        const fname = posIcon.split("/").pop()?.split("?")[0] || "";
        if (fname && iconFilenameToCategory[fname]) {
          conditionIdToCategory[condId] = iconFilenameToCategory[fname];
        }
      });
    }

    const catMap = new Map<string, { invested: number; revenue: number }>();
    const hasMapping = keywords.length > 0 || Object.keys(leagueToSport).length > 0
      || Object.keys(iconFilenameToCategory).length > 0 || Object.keys(conditionIdToCategory).length > 0;

    if (trades && trades.length > 0 && hasMapping) {
      trades.forEach((t: any) => {
        const usdc = Number(t.usdcSize || 0);
        if (!usdc) return;

        const cat = classifyTrade(t, keywords, leagueToSport, iconFilenameToCategory, conditionIdToCategory);
        const entry = catMap.get(cat) || { invested: 0, revenue: 0 };

        if (t.type === "TRADE") {
          if (t.side === "BUY") entry.invested += usdc;
          else if (t.side === "SELL") entry.revenue += usdc;
        } else if (t.type === "REDEEM") {
          entry.revenue += usdc;
        }

        catMap.set(cat, entry);
      });
    }

    const categoryPnlData: CategoryPnlItem[] = [...catMap.entries()]
      .map(([category, { invested, revenue }]) => ({
        category,
        pnl: Math.round((revenue - invested) * 100) / 100,
        invested: Math.round(invested * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    return {
      historyInvested,
      historyRevenue,
      currentInvested,
      currentValue,
      historyNetProfit,
      currentUnrealizedPnl,
      currentUnrealizedPct,

      categoryPnlData,
    };
  }, [trades, positions, leagueToSport, keywords, iconToCategory]);
}
