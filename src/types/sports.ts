// ── World Cup 2026 Primary Tab ──
export type PrimaryTab = 'matches' | 'outrights' | 'standings' | 'scorers';

// ── Sub-Tabs (contextual per primary tab) ──
export type MatchSubTab = 'hot' | 'group' | 'knockout';
export type OutrightSubTab = 'champion' | 'golden-boot' | 'group-winner' | 'other';

// Legacy alias kept for backward compatibility with other pages
export type SportCategory = PrimaryTab;

export interface TeamInfo {
  shortName: string;
  fullName: string;
  displayName: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
}

export interface SportMarket {
  id: string;
  polymarketConditionId?: string;
  polymarketSlug?: string;
  question: string;
  sport: string;
  leagueCode: string;
  leagueName: string;
  leagueNameEn: string;
  status: 'live' | 'upcoming' | 'ended';
  matchTime: string;
  matchTimeISO: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  drawTeam?: TeamInfo;
  homeProbability: number;
  awayProbability: number;
  drawProbability?: number;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  rawOutcomes?: string[];
  rawPrices?: number[];
  volume: number;
  liquidity: number;
  supporters: number;
  isHot: boolean;
  isFeatured: boolean;
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export interface PolymarketAPIMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  resolutionSource: string;
  endDate: string;
  liquidity: number;
  volume: number;
  active: boolean;
  closed: boolean;
  outcomes: string[];
  outcomePrices: string[];
  tags: Array<{ id: string; label: string; slug: string }>;
}
