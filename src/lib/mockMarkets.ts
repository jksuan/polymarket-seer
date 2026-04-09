import { PrimaryTab, MatchSubTab } from '@/types/sports';

// ── Primary Tabs (Tier 1) ──
export const PRIMARY_TABS: Array<{ id: PrimaryTab; label: string; emoji: string }> = [
  { id: 'matches',    label: '比赛',     emoji: '⚽' },
  { id: 'outrights',  label: '趣味投注', emoji: '🎯' },
  { id: 'standings',  label: '积分榜',   emoji: '📊' },
  { id: 'scorers',    label: '射手榜',   emoji: '👟' },
];

// ── Match Sub-Tabs (Tier 2 when primaryTab === 'matches') ──
export const MATCH_SUB_TABS: Array<{ id: MatchSubTab; label: string }> = [
  { id: 'hot',      label: '🔥 今日热门' },
  { id: 'group',    label: '小组赛 ▾' },
  { id: 'knockout', label: '淘汰赛 ▾' },
];

// ── World Cup 2026 Groups ──
export const WORLD_CUP_GROUPS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
] as const;

// ── World Cup 2026 Knockout Rounds ──
export const WORLD_CUP_KNOCKOUTS = [
  '32强', '16强', '1/8决赛', '1/4决赛', '半决赛', '决赛'
] as const;

// Legacy export for backward compatibility (old CategoryTabs imports this)
export const CATEGORIES = PRIMARY_TABS;
export const MOCK_MARKETS: any[] = [];
