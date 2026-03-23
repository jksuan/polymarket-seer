export type SportCategory =
  | 'all'
  | 'nba'
  | 'ucl'
  | 'premier-league'
  | 'serie-a'
  | 'la-liga'
  | 'bundesliga'
  | 'tennis';

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
  sport: SportCategory;
  leagueCode: string;
  leagueName: string;
  leagueNameEn: string;
  status: 'live' | 'upcoming' | 'ended';
  matchTime: string;
  matchTimeISO: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeProbability: number;
  awayProbability: number;
  homeOdds: number;
  awayOdds: number;
  volume: number;
  liquidity: number;
  supporters: number;
  isHot: boolean;
  isFeatured: boolean;
}

export interface Category {
  id: SportCategory;
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
