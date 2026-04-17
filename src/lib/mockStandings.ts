export type HistoricYear = '2026' | '2022' | '2018' | '2014';

export interface StandingsTeam {
  id: string;
  name: string;
  code: string;
  primaryColor: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: string; // e.g. "+3" or "-1"
  points: number;
  qualified: boolean;
}

export interface StandingsGroup {
  groupName: string;
  teams: StandingsTeam[];
}

export const HISTORIC_STANDINGS: Record<Exclude<HistoricYear, '2026'>, StandingsGroup[]> = {
  '2022': [
    {
      groupName: 'A组 (Group A)',
      teams: [
        { id: 'ned', name: 'Netherlands', code: 'NED', primaryColor: '#F36C21', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 1, goalDifference: '+4', points: 7, qualified: true },
        { id: 'sen', name: 'Senegal', code: 'SEN', primaryColor: '#00853F', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 4, goalDifference: '+1', points: 6, qualified: true },
        { id: 'ecu', name: 'Ecuador', code: 'ECU', primaryColor: '#FFD100', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: '+1', points: 4, qualified: false },
        { id: 'qat', name: 'Qatar', code: 'QAT', primaryColor: '#8A1538', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 1, goalsAgainst: 7, goalDifference: '-6', points: 0, qualified: false },
      ]
    },
    {
      groupName: 'B组 (Group B)',
      teams: [
        { id: 'eng', name: 'England', code: 'ENG', primaryColor: '#FFFFFF', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 9, goalsAgainst: 2, goalDifference: '+7', points: 7, qualified: true },
        { id: 'usa', name: 'United States', code: 'USA', primaryColor: '#002868', played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 2, goalsAgainst: 1, goalDifference: '+1', points: 5, qualified: true },
        { id: 'irn', name: 'IR Iran', code: 'IRN', primaryColor: '#239F40', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 4, goalsAgainst: 7, goalDifference: '-3', points: 3, qualified: false },
        { id: 'wal', name: 'Wales', code: 'WAL', primaryColor: '#D30731', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 1, goalsAgainst: 6, goalDifference: '-5', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'C组 (Group C)',
      teams: [
        { id: 'arg', name: 'Argentina', code: 'ARG', primaryColor: '#43A1D5', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 2, goalDifference: '+3', points: 6, qualified: true },
        { id: 'pol', name: 'Poland', code: 'POL', primaryColor: '#DC143C', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 2, goalDifference: '0', points: 4, qualified: true },
        { id: 'mex', name: 'Mexico', code: 'MEX', primaryColor: '#006847', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 3, goalDifference: '-1', points: 4, qualified: false },
        { id: 'ksa', name: 'Saudi Arabia', code: 'KSA', primaryColor: '#006C35', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 5, goalDifference: '-2', points: 3, qualified: false },
      ]
    },
    {
      groupName: 'D组 (Group D)',
      teams: [
        { id: 'fra', name: 'France', code: 'FRA', primaryColor: '#002395', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 6, goalsAgainst: 3, goalDifference: '+3', points: 6, qualified: true },
        { id: 'aus', name: 'Australia', code: 'AUS', primaryColor: '#FFCD00', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDifference: '-1', points: 6, qualified: true },
        { id: 'tun', name: 'Tunisia', code: 'TUN', primaryColor: '#E70013', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 1, goalDifference: '0', points: 4, qualified: false },
        { id: 'den', name: 'Denmark', code: 'DEN', primaryColor: '#C60C30', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 1, goalsAgainst: 3, goalDifference: '-2', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'E组 (Group E)',
      teams: [
        { id: 'jpn', name: 'Japan', code: 'JPN', primaryColor: '#000555', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: '+1', points: 6, qualified: true },
        { id: 'esp', name: 'Spain', code: 'ESP', primaryColor: '#AA151B', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 9, goalsAgainst: 3, goalDifference: '+6', points: 4, qualified: true },
        { id: 'ger', name: 'Germany', code: 'GER', primaryColor: '#000000', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 6, goalsAgainst: 5, goalDifference: '+1', points: 4, qualified: false },
        { id: 'crc', name: 'Costa Rica', code: 'CRC', primaryColor: '#CE1126', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 11, goalDifference: '-8', points: 3, qualified: false },
      ]
    },
    {
      groupName: 'F组 (Group F)',
      teams: [
        { id: 'mar', name: 'Morocco', code: 'MAR', primaryColor: '#C1272D', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: '+3', points: 7, qualified: true },
        { id: 'cro', name: 'Croatia', code: 'CRO', primaryColor: '#FF0000', played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: '+3', points: 5, qualified: true },
        { id: 'bel', name: 'Belgium', code: 'BEL', primaryColor: '#E30613', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 2, goalDifference: '-1', points: 4, qualified: false },
        { id: 'can', name: 'Canada', code: 'CAN', primaryColor: '#FF0000', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 2, goalsAgainst: 7, goalDifference: '-5', points: 0, qualified: false },
      ]
    },
    {
      groupName: 'G组 (Group G)',
      teams: [
        { id: 'bra', name: 'Brazil', code: 'BRA', primaryColor: '#009C3B', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 1, goalDifference: '+2', points: 6, qualified: true },
        { id: 'sui', name: 'Switzerland', code: 'SUI', primaryColor: '#FF0000', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: '+1', points: 6, qualified: true },
        { id: 'cmr', name: 'Cameroon', code: 'CMR', primaryColor: '#007A5E', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: '0', points: 4, qualified: false },
        { id: 'srb', name: 'Serbia', code: 'SRB', primaryColor: '#C6363C', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 5, goalsAgainst: 8, goalDifference: '-3', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'H组 (Group H)',
      teams: [
        { id: 'por', name: 'Portugal', code: 'POR', primaryColor: '#FF0000', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 6, goalsAgainst: 4, goalDifference: '+2', points: 6, qualified: true },
        { id: 'kor', name: 'South Korea', code: 'KOR', primaryColor: '#C60C30', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: '0', points: 4, qualified: true },
        { id: 'uru', name: 'Uruguay', code: 'URU', primaryColor: '#0038A8', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 2, goalDifference: '0', points: 4, qualified: false },
        { id: 'gha', name: 'Ghana', code: 'GHA', primaryColor: '#000000', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 5, goalsAgainst: 7, goalDifference: '-2', points: 3, qualified: false },
      ]
    }
  ],
  '2018': [
    {
      groupName: 'A组 (Group A)',
      teams: [
        { id: 'uru', name: 'Uruguay', code: 'URU', primaryColor: '#0038A8', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 5, goalsAgainst: 0, goalDifference: '+5', points: 9, qualified: true },
        { id: 'rus', name: 'Russia', code: 'RUS', primaryColor: '#D52B1E', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 8, goalsAgainst: 4, goalDifference: '+4', points: 6, qualified: true },
        { id: 'ksa', name: 'Saudi Arabia', code: 'KSA', primaryColor: '#006C35', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 7, goalDifference: '-5', points: 3, qualified: false },
        { id: 'egy', name: 'Egypt', code: 'EGY', primaryColor: '#CE1126', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 2, goalsAgainst: 6, goalDifference: '-4', points: 0, qualified: false },
      ]
    },
    {
      groupName: 'B组 (Group B)',
      teams: [
        { id: 'esp', name: 'Spain', code: 'ESP', primaryColor: '#AA151B', played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 6, goalsAgainst: 5, goalDifference: '+1', points: 5, qualified: true },
        { id: 'por', name: 'Portugal', code: 'POR', primaryColor: '#FF0000', played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 5, goalsAgainst: 4, goalDifference: '+1', points: 5, qualified: true },
        { id: 'irn', name: 'IR Iran', code: 'IRN', primaryColor: '#239F40', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 2, goalDifference: '0', points: 4, qualified: false },
        { id: 'mar', name: 'Morocco', code: 'MAR', primaryColor: '#C1272D', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: '-2', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'C组 (Group C)',
      teams: [
        { id: 'fra', name: 'France', code: 'FRA', primaryColor: '#002395', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 3, goalsAgainst: 1, goalDifference: '+2', points: 7, qualified: true },
        { id: 'den', name: 'Denmark', code: 'DEN', primaryColor: '#C60C30', played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 2, goalsAgainst: 1, goalDifference: '+1', points: 5, qualified: true },
        { id: 'per', name: 'Peru', code: 'PER', primaryColor: '#D91023', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 2, goalDifference: '0', points: 3, qualified: false },
        { id: 'aus', name: 'Australia', code: 'AUS', primaryColor: '#FFCD00', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 1, goalsAgainst: 5, goalDifference: '-4', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'D组 (Group D)',
      teams: [
        { id: 'cro', name: 'Croatia', code: 'CRO', primaryColor: '#FF0000', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 1, goalDifference: '+6', points: 9, qualified: true },
        { id: 'arg', name: 'Argentina', code: 'ARG', primaryColor: '#43A1D5', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 5, goalDifference: '-2', points: 4, qualified: true },
        { id: 'nga', name: 'Nigeria', code: 'NGA', primaryColor: '#008751', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 4, goalDifference: '-1', points: 3, qualified: false },
        { id: 'isl', name: 'Iceland', code: 'ISL', primaryColor: '#003897', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: '-3', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'E组 (Group E)',
      teams: [
        { id: 'bra', name: 'Brazil', code: 'BRA', primaryColor: '#009C3B', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 1, goalDifference: '+4', points: 7, qualified: true },
        { id: 'sui', name: 'Switzerland', code: 'SUI', primaryColor: '#FF0000', played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 5, goalsAgainst: 4, goalDifference: '+1', points: 5, qualified: true },
        { id: 'srb', name: 'Serbia', code: 'SRB', primaryColor: '#C6363C', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: '-2', points: 3, qualified: false },
        { id: 'crc', name: 'Costa Rica', code: 'CRC', primaryColor: '#CE1126', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: '-3', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'F组 (Group F)',
      teams: [
        { id: 'swe', name: 'Sweden', code: 'SWE', primaryColor: '#004B87', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 2, goalDifference: '+3', points: 6, qualified: true },
        { id: 'mex', name: 'Mexico', code: 'MEX', primaryColor: '#006847', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDifference: '-1', points: 6, qualified: true },
        { id: 'kor', name: 'South Korea', code: 'KOR', primaryColor: '#C60C30', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 3, goalDifference: '0', points: 3, qualified: false },
        { id: 'ger', name: 'Germany', code: 'GER', primaryColor: '#000000', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: '-2', points: 3, qualified: false },
      ]
    },
    {
      groupName: 'G组 (Group G)',
      teams: [
        { id: 'bel', name: 'Belgium', code: 'BEL', primaryColor: '#E30613', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 9, goalsAgainst: 2, goalDifference: '+7', points: 9, qualified: true },
        { id: 'eng', name: 'England', code: 'ENG', primaryColor: '#CE1124', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 8, goalsAgainst: 3, goalDifference: '+5', points: 6, qualified: true },
        { id: 'tun', name: 'Tunisia', code: 'TUN', primaryColor: '#E70013', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 5, goalsAgainst: 8, goalDifference: '-3', points: 3, qualified: false },
        { id: 'pan', name: 'Panama', code: 'PAN', primaryColor: '#005293', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 2, goalsAgainst: 11, goalDifference: '-9', points: 0, qualified: false },
      ]
    },
    {
      groupName: 'H组 (Group H)',
      teams: [
        { id: 'col', name: 'Colombia', code: 'COL', primaryColor: '#FCD116', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 2, goalDifference: '+3', points: 6, qualified: true },
        { id: 'jpn', name: 'Japan', code: 'JPN', primaryColor: '#000555', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: '0', points: 4, qualified: true },
        { id: 'sen', name: 'Senegal', code: 'SEN', primaryColor: '#00853F', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: '0', points: 4, qualified: false },
        { id: 'pol', name: 'Poland', code: 'POL', primaryColor: '#DC143C', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: '-3', points: 3, qualified: false },
      ]
    }
  ],
  '2014': [
    {
      groupName: 'A组 (Group A)',
      teams: [
        { id: 'bra', name: 'Brazil', code: 'BRA', primaryColor: '#009C3B', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: '+5', points: 7, qualified: true },
        { id: 'mex', name: 'Mexico', code: 'MEX', primaryColor: '#006847', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: '+3', points: 7, qualified: true },
        { id: 'cro', name: 'Croatia', code: 'CRO', primaryColor: '#FF0000', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 6, goalsAgainst: 6, goalDifference: '0', points: 3, qualified: false },
        { id: 'cmr', name: 'Cameroon', code: 'CMR', primaryColor: '#007A5E', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 1, goalsAgainst: 9, goalDifference: '-8', points: 0, qualified: false },
      ]
    },
    {
      groupName: 'B组 (Group B)',
      teams: [
        { id: 'ned', name: 'Netherlands', code: 'NED', primaryColor: '#F36C21', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 10, goalsAgainst: 3, goalDifference: '+7', points: 9, qualified: true },
        { id: 'chi', name: 'Chile', code: 'CHI', primaryColor: '#D52B1E', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, goalDifference: '+2', points: 6, qualified: true },
        { id: 'esp', name: 'Spain', code: 'ESP', primaryColor: '#AA151B', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 4, goalsAgainst: 7, goalDifference: '-3', points: 3, qualified: false },
        { id: 'aus', name: 'Australia', code: 'AUS', primaryColor: '#FFCD00', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 3, goalsAgainst: 9, goalDifference: '-6', points: 0, qualified: false },
      ]
    },
    {
      groupName: 'C组 (Group C)',
      teams: [
        { id: 'col', name: 'Colombia', code: 'COL', primaryColor: '#FCD116', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 9, goalsAgainst: 2, goalDifference: '+7', points: 9, qualified: true },
        { id: 'gre', name: 'Greece', code: 'GRE', primaryColor: '#0D5EAF', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 4, goalDifference: '-2', points: 4, qualified: true },
        { id: 'civ', name: 'Ivory Coast', code: 'CIV', primaryColor: '#F77F00', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 4, goalsAgainst: 5, goalDifference: '-1', points: 3, qualified: false },
        { id: 'jpn', name: 'Japan', code: 'JPN', primaryColor: '#000555', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 6, goalDifference: '-4', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'D组 (Group D)',
      teams: [
        { id: 'crc', name: 'Costa Rica', code: 'CRC', primaryColor: '#CE1126', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: '+3', points: 7, qualified: true },
        { id: 'uru', name: 'Uruguay', code: 'URU', primaryColor: '#0038A8', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: '0', points: 6, qualified: true },
        { id: 'ita', name: 'Italy', code: 'ITA', primaryColor: '#0066B2', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 3, goalDifference: '-1', points: 3, qualified: false },
        { id: 'eng', name: 'England', code: 'ENG', primaryColor: '#CE1124', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: '-2', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'E组 (Group E)',
      teams: [
        { id: 'fra', name: 'France', code: 'FRA', primaryColor: '#002395', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 8, goalsAgainst: 2, goalDifference: '+6', points: 7, qualified: true },
        { id: 'sui', name: 'Switzerland', code: 'SUI', primaryColor: '#FF0000', played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 7, goalsAgainst: 6, goalDifference: '+1', points: 6, qualified: true },
        { id: 'ecu', name: 'Ecuador', code: 'ECU', primaryColor: '#FFD100', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: '0', points: 4, qualified: false },
        { id: 'hon', name: 'Honduras', code: 'HON', primaryColor: '#0073CF', played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 1, goalsAgainst: 8, goalDifference: '-7', points: 0, qualified: false },
      ]
    },
    {
      groupName: 'F组 (Group F)',
      teams: [
        { id: 'arg', name: 'Argentina', code: 'ARG', primaryColor: '#43A1D5', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 6, goalsAgainst: 3, goalDifference: '+3', points: 9, qualified: true },
        { id: 'nga', name: 'Nigeria', code: 'NGA', primaryColor: '#008751', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: '0', points: 4, qualified: true },
        { id: 'bih', name: 'Bosnia and Herzegovina', code: 'BIH', primaryColor: '#002395', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 4, goalsAgainst: 4, goalDifference: '0', points: 3, qualified: false },
        { id: 'irn', name: 'IR Iran', code: 'IRN', primaryColor: '#239F40', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 1, goalsAgainst: 4, goalDifference: '-3', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'G组 (Group G)',
      teams: [
        { id: 'ger', name: 'Germany', code: 'GER', primaryColor: '#000000', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: '+5', points: 7, qualified: true },
        { id: 'usa', name: 'United States', code: 'USA', primaryColor: '#002868', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: '0', points: 4, qualified: true },
        { id: 'por', name: 'Portugal', code: 'POR', primaryColor: '#FF0000', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: '0', points: 4, qualified: false },
        { id: 'gha', name: 'Ghana', code: 'GHA', primaryColor: '#000000', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 4, goalsAgainst: 6, goalDifference: '-2', points: 1, qualified: false },
      ]
    },
    {
      groupName: 'H组 (Group H)',
      teams: [
        { id: 'bel', name: 'Belgium', code: 'BEL', primaryColor: '#E30613', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: '+3', points: 9, qualified: true },
        { id: 'alg', name: 'Algeria', code: 'ALG', primaryColor: '#006233', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 5, goalsAgainst: 5, goalDifference: '0', points: 4, qualified: true },
        { id: 'rus', name: 'Russia', code: 'RUS', primaryColor: '#D52B1E', played: 3, won: 0, drawn: 2, lost: 1, goalsFor: 2, goalsAgainst: 3, goalDifference: '-1', points: 2, qualified: false },
        { id: 'kor', name: 'South Korea', code: 'KOR', primaryColor: '#C60C30', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 3, goalsAgainst: 6, goalDifference: '-3', points: 1, qualified: false },
      ]
    }
  ]
};
