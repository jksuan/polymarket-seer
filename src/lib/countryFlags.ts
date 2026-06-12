/**
 * Country name → ISO 3166-1 alpha-2 code mapping
 * Used to generate flag URLs from flagcdn.com 
 * Covers all 48 teams in the 2026 FIFA World Cup
 */

const COUNTRY_CODE_MAP: Record<string, string> = {
  // Group A
  'Mexico': 'mx',
  'South Africa': 'za',
  'Czechia': 'cz',
  'Korea Republic': 'kr',
  // Group B
  'United States': 'us',
  'Paraguay': 'py',
  'Türkiye': 'tr',
  'Australia': 'au',
  // Group C
  'Switzerland': 'ch',
  'Qatar': 'qa',
  'Bosnia and Herzegovina': 'ba',
  'Canada': 'ca',
  // Group D
  'Brazil': 'br',
  'Morocco': 'ma',
  'Scotland': 'gb-sct',
  'Haiti': 'ht',
  // Group E
  'Germany': 'de',
  'Curaçao': 'cw',
  'Ecuador': 'ec',
  "Côte d'Ivoire": 'ci',
  'Ivory Coast': 'ci',
  // Group F
  'Japan': 'jp',
  'Netherlands': 'nl',
  'Sweden': 'se',
  'Tunisia': 'tn',
  // Group G
  'Belgium': 'be',
  'Egypt': 'eg',
  'IR Iran': 'ir',
  'Iran': 'ir',
  'New Zealand': 'nz',
  // Group H
  'Spain': 'es',
  'Cabo Verde': 'cv',
  'Saudi Arabia': 'sa',
  'Uruguay': 'uy',
  // Group I
  'France': 'fr',
  'Senegal': 'sn',
  'Iraq': 'iq',
  'Norway': 'no',
  // Group J
  'Argentina': 'ar',
  'Algeria': 'dz',
  'Austria': 'at',
  'Jordan': 'jo',
  // Group K
  'Portugal': 'pt',
  'DR Congo': 'cd',
  'Croatia': 'hr',
  'England': 'gb-eng',
  // Group L
  'Colombia': 'co',
  'Uzbekistan': 'uz',
  'Ghana': 'gh',
  'Panama': 'pa',
  // Historic 2022 & Aliases
  'Wales': 'gb-wls',
  'Poland': 'pl',
  'Denmark': 'dk',
  'Costa Rica': 'cr',
  'Cameroon': 'cm',
  'Serbia': 'rs',
  'South Korea': 'kr',
  // Historic 2018 & 2014
  'Russia': 'ru',
  'Peru': 'pe',
  'Nigeria': 'ng',
  'Iceland': 'is',
  'Greece': 'gr',
  'Honduras': 'hn',
  'Italy': 'it',
  'Chile': 'cl',
};

/**
 * Polymarket API / i18n 别名 → 字典 canonical 名（与 countryNames.normalizationEn 对齐）。
 */
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'BIH/ITA/NIR/WAL': 'Bosnia and Herzegovina',
  'CZE/DEN/MKD/IRL': 'Czechia',
  'KOS/ROU/SVK/TUR': 'Türkiye',
  'Turkiye': 'Türkiye',
  'Turkey': 'Türkiye',
  'BOL/IRQ/SUR': 'Iraq',
  'DRC/JAM/NCL': 'DR Congo',
  'Congo DR': 'DR Congo',
  'South Korea': 'Korea Republic',
  'USA': 'United States',
  'Curacao': 'Curaçao',
  'Cote d\'Ivoire': 'Côte d\'Ivoire',
  'Ivory Coast': "Côte d'Ivoire",
  'Iran': 'IR Iran',
  'Cape Verde': 'Cabo Verde',
};

/**
 * Normalize country name to handle API inconsistencies.
 * Maps variants to a single canonical key used in flag / group / short-code dictionaries.
 */
export function canonicalCountryName(name: string): string {
  if (!name) return name;
  if (/c.te\s+d.ivoire/i.test(name)) return "Côte d'Ivoire";
  return COUNTRY_NAME_ALIASES[name] ?? name;
}

function normalizeName(name: string): string {
  return canonicalCountryName(name);
}

/**
 * Get flag image URL for a country name
 * Uses flagcdn.com for high-quality SVG flags
 */
export function getCountryFlagUrl(countryName: string, size: number | 'svg' = 40): string {
  const code = COUNTRY_CODE_MAP[normalizeName(countryName)];
  
  if (size === 'svg') {
    if (!code) return `https://flagcdn.com/un.svg`;
    return `https://flagcdn.com/${code}.svg`;
  }

  if (!code) {
    return `https://flagcdn.com/${size}x${Math.round(size as number * 0.75)}/un.png`;
  }
  return `https://flagcdn.com/w${size}/${code}.png`;
}

/**
 * Get country short code (3 letters) from country name
 * Used for button labels like "MEX 68%"
 */
const COUNTRY_SHORT_MAP: Record<string, string> = {
  'Mexico': 'MEX',
  'South Africa': 'RSA',
  'Czechia': 'CZE',
  'Korea Republic': 'KOR',
  'United States': 'USA',
  'Paraguay': 'PAR',
  'Türkiye': 'TUR',
  'Australia': 'AUS',
  'Switzerland': 'SUI',
  'Qatar': 'QAT',
  'Bosnia and Herzegovina': 'BIH',
  'Canada': 'CAN',
  'Brazil': 'BRA',
  'Morocco': 'MAR',
  'Scotland': 'SCO',
  'Haiti': 'HAI',
  'Germany': 'GER',
  'Curaçao': 'CUW',
  'Ecuador': 'ECU',
  "Côte d'Ivoire": 'CIV',
  'Ivory Coast': 'CIV',
  'Japan': 'JPN',
  'Netherlands': 'NED',
  'Sweden': 'SWE',
  'Tunisia': 'TUN',
  'Belgium': 'BEL',
  'Egypt': 'EGY',
  'IR Iran': 'IRN',
  'Iran': 'IRN',
  'New Zealand': 'NZL',
  'Spain': 'ESP',
  'Cabo Verde': 'CPV',
  'Saudi Arabia': 'KSA',
  'Uruguay': 'URU',
  'France': 'FRA',
  'Senegal': 'SEN',
  'Iraq': 'IRQ',
  'Norway': 'NOR',
  'Argentina': 'ARG',
  'Algeria': 'ALG',
  'Austria': 'AUT',
  'Jordan': 'JOR',
  'Portugal': 'POR',
  'DR Congo': 'COD',
  'Croatia': 'CRO',
  'England': 'ENG',
  'Colombia': 'COL',
  'Uzbekistan': 'UZB',
  'Ghana': 'GHA',
  'Panama': 'PAN',
};

export function getCountryShortCode(countryName: string): string {
  return COUNTRY_SHORT_MAP[normalizeName(countryName)] || countryName.slice(0, 3).toUpperCase();
}

/**
 * Country name → World Cup 2026 Group mapping (A–L)
 * Used for front-end group stage filtering since Polymarket API has no group metadata.
 * Once draw is done this data is frozen for the entire tournament.
 */
const COUNTRY_GROUP_MAP: Record<string, string> = {
  'Mexico': 'A', 'South Africa': 'A', 'Korea Republic': 'A', 'Czechia': 'A',
  'Canada': 'B', 'Bosnia and Herzegovina': 'B', 'Qatar': 'B', 'Switzerland': 'B',
  'Brazil': 'C', 'Morocco': 'C', 'Haiti': 'C', 'Scotland': 'C',
  'United States': 'D', 'Paraguay': 'D', 'Australia': 'D', 'Türkiye': 'D',
  'Germany': 'E', 'Curaçao': 'E', "Côte d'Ivoire": 'E', 'Ecuador': 'E',
  'Netherlands': 'F', 'Japan': 'F', 'Sweden': 'F', 'Tunisia': 'F',
  'Belgium': 'G', 'Egypt': 'G', 'IR Iran': 'G', 'New Zealand': 'G',
  'Spain': 'H', 'Cabo Verde': 'H', 'Saudi Arabia': 'H', 'Uruguay': 'H',
  'France': 'I', 'Senegal': 'I', 'Iraq': 'I', 'Norway': 'I',
  'Argentina': 'J', 'Algeria': 'J', 'Austria': 'J', 'Jordan': 'J',
  'Portugal': 'K', 'DR Congo': 'K', 'Uzbekistan': 'K', 'Colombia': 'K',
  'England': 'L', 'Croatia': 'L', 'Ghana': 'L', 'Panama': 'L',
};

/**
 * Get the World Cup group letter for a country.
 * Returns undefined if the country is not in any group (e.g. knockout-stage-only scenario).
 */
export function getCountryGroup(countryName: string): string | undefined {
  return COUNTRY_GROUP_MAP[normalizeName(countryName)];
}

/** 2026 世界杯 12 个小组字母（A–L） */
export const WC2026_GROUP_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
] as const;

/** 按小组返回 2026 参赛队 canonical 名（顺序与抽签写入 COUNTRY_GROUP_MAP 时一致） */
export function getWc2026TeamsByGroup(): Record<string, string[]> {
  const byGroup: Record<string, string[]> = {};
  for (const letter of WC2026_GROUP_LETTERS) {
    byGroup[letter] = [];
  }
  for (const [country, group] of Object.entries(COUNTRY_GROUP_MAP)) {
    byGroup[group]?.push(country);
  }
  return byGroup;
}

/**
 * Determine if a match is a group-stage match.
 * True when both teams are in the same group.
 */
export function isGroupStageMatch(homeName: string, awayName: string): boolean {
  const hg = COUNTRY_GROUP_MAP[normalizeName(homeName)];
  const ag = COUNTRY_GROUP_MAP[normalizeName(awayName)];
  return !!hg && hg === ag;
}

/**
 * Get primary Web3-themed colors dynamically inferred from country flags.
 */
export interface TeamColors {
  primary: string;
  accent: string;
  glow: string;
}

function createColor(primary: string, accent: string, r: number, g: number, b: number): TeamColors {
  return { primary, accent, glow: `rgba(${r}, ${g}, ${b}, 0.4)` };
}

const PALETTES = {
  blue: createColor('#2563EB', '#3B82F6', 37, 99, 235),      // Tailwind Blue 600
  sky: createColor('#0EA5E9', '#38BDF8', 14, 165, 233),      // Tailwind Sky 500
  ocean: createColor('#0284C7', '#38BDF8', 2, 132, 199),     // Tailwind Sky 600 / Cerulean
  cyan: createColor('#0891B2', '#06B6D4', 8, 145, 178),      // Tailwind Cyan 600
  navy: createColor('#1E40AF', '#1D4ED8', 30, 64, 175),      // Tailwind Blue 800
  indigo: createColor('#4F46E5', '#6366F1', 79, 70, 229),    // Tailwind Indigo 600
  green: createColor('#16A34A', '#4ADE80', 22, 163, 74),     // Tailwind Green 600
  emerald: createColor('#059669', '#10B981', 5, 150, 105),   // Tailwind Emerald 600
  lime: createColor('#65A30D', '#A3E635', 101, 163, 13),     // Tailwind Lime 600
  forest: createColor('#15803D', '#22C55E', 21, 128, 61),    // Tailwind Green 700
  teal: createColor('#0D9488', '#2DD4BF', 13, 148, 136),     // Tailwind Teal 600
  red: createColor('#DC2626', '#EF4444', 220, 38, 38),       // Tailwind Red 600
  crimson: createColor('#E11D48', '#F43F5E', 225, 29, 72),   // Tailwind Rose 600
  yellow: createColor('#D97706', '#F59E0B', 217, 119, 6),    // Tailwind Amber 600
  orange: createColor('#EA580C', '#F97316', 234, 88, 12),    // Tailwind Orange 600
  purple: createColor('#7C3AED', '#8B5CF6', 124, 58, 237),   // Tailwind Violet 600
  black: createColor('#334155', '#475569', 51, 65, 85),      // Tailwind Slate 700
  maroon: createColor('#9F1239', '#BE123C', 159, 18, 57),    // Tailwind Rose 800
};

const COUNTRY_COLORS_MAP: Record<string, TeamColors> = {
  'Mexico': PALETTES.green,
  'South Africa': PALETTES.yellow,
  'Czechia': PALETTES.red,
  'Korea Republic': PALETTES.crimson,
  'United States': PALETTES.blue,
  'Paraguay': PALETTES.red,
  'Türkiye': PALETTES.crimson,
  'Australia': PALETTES.yellow,
  'Switzerland': PALETTES.red,
  'Qatar': PALETTES.maroon,
  'Bosnia and Herzegovina': PALETTES.blue,
  'Canada': PALETTES.red,
  'Brazil': PALETTES.yellow,
  'Morocco': PALETTES.red,
  'Scotland': PALETTES.blue,
  'Haiti': PALETTES.navy,
  'Germany': PALETTES.red,
  'Curaçao': PALETTES.navy,
  'Ecuador': PALETTES.yellow,
  "Côte d'Ivoire": PALETTES.orange,
  'Ivory Coast': PALETTES.orange,
  'Japan': PALETTES.indigo,
  'Netherlands': PALETTES.orange,
  'Sweden': PALETTES.yellow,
  'Tunisia': PALETTES.red,
  'Belgium': PALETTES.red,
  'Egypt': PALETTES.red,
  'IR Iran': PALETTES.green,
  'Iran': PALETTES.green,
  'New Zealand': PALETTES.blue,
  'Spain': PALETTES.yellow,
  'Cabo Verde': PALETTES.navy,
  'Saudi Arabia': PALETTES.forest,
  'Uruguay': PALETTES.navy,
  'France': PALETTES.navy,
  'Senegal': PALETTES.lime,
  'Iraq': PALETTES.teal,
  'Norway': PALETTES.red,
  'Argentina': PALETTES.sky,
  'Algeria': PALETTES.emerald,
  'Austria': PALETTES.red,
  'Jordan': PALETTES.forest,
  'Portugal': PALETTES.red,
  'DR Congo': PALETTES.sky,
  'Croatia': PALETTES.red,
  'England': PALETTES.red,
  'Colombia': PALETTES.yellow,
  'Uzbekistan': PALETTES.cyan,
  'Ghana': PALETTES.yellow,
  'Panama': PALETTES.blue,
};

export function getCountryColor(countryName: string, opponentColor?: TeamColors): TeamColors {
  let color = COUNTRY_COLORS_MAP[normalizeName(countryName)] || PALETTES.indigo; // Base color

  // Anti-collision fallback (if away team has identical color to home team)
  if (opponentColor && color.primary === opponentColor.primary) {
    if (opponentColor.primary === PALETTES.red.primary || opponentColor.primary === PALETTES.crimson.primary) {
      // Deterministically pick a blue variant based on country name length
      const blueVariants = [PALETTES.blue, PALETTES.ocean, PALETTES.navy, PALETTES.cyan, PALETTES.indigo];
      const hash = countryName.charCodeAt(0) + countryName.length;
      color = blueVariants[hash % blueVariants.length];
    } else if (opponentColor.primary === PALETTES.blue.primary || opponentColor.primary === PALETTES.navy.primary || opponentColor.primary === PALETTES.ocean.primary || opponentColor.primary === PALETTES.sky.primary) {
      color = PALETTES.red;
    } else if (opponentColor.primary === PALETTES.green.primary || opponentColor.primary === PALETTES.emerald.primary || opponentColor.primary === PALETTES.forest.primary || opponentColor.primary === PALETTES.lime.primary) {
      color = PALETTES.yellow;
    } else {
      color = PALETTES.indigo;
    }
  }
  return color;
}
