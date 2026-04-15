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
};

/**
 * Get flag image URL for a country name
 * Uses flagcdn.com for high-quality SVG flags
 */
export function getCountryFlagUrl(countryName: string, size: number = 40): string {
  const code = COUNTRY_CODE_MAP[countryName];
  if (!code) {
    // Fallback: try lowercase first word
    return `https://flagcdn.com/${size}x${Math.round(size * 0.75)}/un.png`;
  }
  // flagcdn returns w×h PNGs — for 40px wide flag
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
  return COUNTRY_SHORT_MAP[countryName] || countryName.slice(0, 3).toUpperCase();
}
