"use client";
import { useState, useEffect } from "react";
// Note: We use a local /api/sports proxy instead of GAMMA_API_URL directly
// to avoid CORS issues in the browser.

// ============================================================
// Tag IDs for sport categories on Polymarket (from Gamma API).
// Note: In Polymarket, "Soccer" (足球) and "Football" (橄榄球/NFL/CFB)
// are DIFFERENT categories. Tag 100350 covers Soccer only.
// Tag 100350 → Soccer (足球: EPL, La Liga, UCL, etc.)
// Tag 28     → Basketball (bk* leagues only; NBA/WNBA/NCAAB use separate tags)
// Tag 864    → Tennis
// ============================================================
const SPORT_TAG_MAP: Record<string, string> = {
  "100350": "足球",
  "864": "网球",
  "28": "篮球",
};

// Hardcoded sport codes that belong to known categories but use
// non-standard tags (e.g. NBA uses tag 745 instead of 28).
const HARDCODED_SPORT_MAP: Record<string, string> = {
  "nba": "篮球",
  "wnba": "篮球",
  "ncaab": "篮球",
  "atp": "网球",
  "wta": "网球",
};

// Natural-language alias keywords for title-based matching.
const ALIAS_KEYWORDS: Array<{ pattern: string; category: string }> = [
  // 足球
  { pattern: "premier league", category: "足球" },
  { pattern: "champions league", category: "足球" },
  { pattern: "europa league", category: "足球" },
  { pattern: "world cup", category: "足球" },
  { pattern: "la liga", category: "足球" },
  { pattern: "bundesliga", category: "足球" },
  { pattern: "serie a", category: "足球" },
  { pattern: "ligue 1", category: "足球" },
  { pattern: "copa america", category: "足球" },
  { pattern: "euro 20", category: "足球" },
  { pattern: "concacaf", category: "足球" },
  { pattern: "eredivisie", category: "足球" },
  { pattern: "mls ", category: "足球" },
  // 篮球
  { pattern: "euroleague", category: "篮球" },
  { pattern: "basketball", category: "篮球" },
  { pattern: "march madness", category: "篮球" },
  // 网球
  { pattern: "grand slam", category: "网球" },
  { pattern: "wimbledon", category: "网球" },
  { pattern: "us open tennis", category: "网球" },
  { pattern: "roland garros", category: "网球" },
  { pattern: "australian open", category: "网球" },
];

export interface SportCategoryMap {
  /** Maps league code → display name */
  leagueToSport: Record<string, string>;
  /** Keyword patterns for title-based matching */
  keywords: Array<{ pattern: string; category: string }>;
  /** Maps league icon URL → category (most reliable for individual match trades) */
  iconToCategory: Record<string, string>;
  loading: boolean;
}

/**
 * Fetches all sports/leagues from the Gamma API and builds three
 * mapping structures at runtime:
 *
 * 1. leagueToSport:  sport code → category
 * 2. keywords:       title/slug text patterns
 * 3. iconToCategory: league icon URL → category  (★ highest accuracy)
 *
 * The icon-based mapping is the most reliable because every trade in
 * the activity API includes an `icon` field set to the league logo,
 * which exactly matches the `image` field from /sports.
 */
let cachedData: Omit<SportCategoryMap, "loading"> | null = null;

export function useSportCategories(): SportCategoryMap {
  const [data, setData] = useState<Omit<SportCategoryMap, "loading">>(
    cachedData || { leagueToSport: {}, keywords: [], iconToCategory: {} }
  );
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/sports");
        if (!res.ok) throw new Error(`/sports returned ${res.status}`);
        const rawData: any[] = await res.json();
        if (!Array.isArray(rawData)) throw new Error("/sports did not return an array");

        const leagueToSport: Record<string, string> = {};
        const keywords: SportCategoryMap["keywords"] = [];
        const iconToCategory: Record<string, string> = {};

        rawData.forEach((entry) => {
          const sportCode = (entry.sport || "").toLowerCase();
          if (!sportCode) return;

          // 1. Determine category
          let category = "其它";

          // Check hardcoded overrides first
          if (HARDCODED_SPORT_MAP[sportCode]) {
            category = HARDCODED_SPORT_MAP[sportCode];
          } else {
            // Check tags
            const tagIds = (entry.tags || "")
              .split(",")
              .map((t: string) => t.trim());
            for (const tagId of tagIds) {
              if (SPORT_TAG_MAP[tagId]) {
                category = SPORT_TAG_MAP[tagId];
                break;
              }
            }
          }

          leagueToSport[sportCode] = category;

          // 2. Build icon → category mapping (★ key for accurate classification)
          if (entry.image && category !== "其它") {
            iconToCategory[entry.image] = category;
          }

          // 3. Add sport code as keyword for title matching
          if (category !== "其它") {
            keywords.push({ pattern: sportCode, category });
          }
        });

        // Add alias keywords for natural-language league names
        keywords.push(...ALIAS_KEYWORDS);

        // Sort keywords by length DESC so longer patterns match first
        keywords.sort((a, b) => b.pattern.length - a.pattern.length);

        // Deduplicate
        const seen = new Set<string>();
        const uniqueKeywords = keywords.filter((kw) => {
          if (seen.has(kw.pattern)) return false;
          seen.add(kw.pattern);
          return true;
        });

        if (!cancelled) {
          const result = { leagueToSport, keywords: uniqueKeywords, iconToCategory };
          cachedData = result;
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        console.warn("[useSportCategories] Failed to fetch /sports:", err);
        if (!cancelled) {
          // Fallback: use hardcoded map + aliases only
          const leagueToSport = { ...HARDCODED_SPORT_MAP };
          const keywords = [
            ...Object.entries(HARDCODED_SPORT_MAP).map(
              ([pattern, category]) => ({ pattern, category })
            ),
            ...ALIAS_KEYWORDS,
          ];
          const fallback = { leagueToSport, keywords, iconToCategory: {} };
          cachedData = fallback;
          setData(fallback);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { ...data, loading };
}
