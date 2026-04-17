export interface KnockoutTeam {
  code: string;
  name: string;
  score: number;
  penalties?: number;
  winner: boolean;
}

export interface KnockoutMatch {
  id: string;
  home: KnockoutTeam;
  away: KnockoutTeam;
  dateStr: string;
  isAfterExtraTime?: boolean;
  isPenalties?: boolean;
}

export interface KnockoutNode {
  match: KnockoutMatch | null; // null for TBD
  stage: string; // 'r16', 'qf', 'sf', 'final'
  children?: KnockoutNode[]; // 2 children for a binary bracket
}

const TBD_TEAM: KnockoutTeam = { code: 'TBD', name: 'TBD', score: 0, winner: false };

export const BRACKET_2022: KnockoutNode = {
  stage: 'final',
  match: {
    id: 'final',
    dateStr: 'Dec 18, 22',
    isPenalties: true,
    home: { code: 'ARG', name: 'Argentina', score: 3, penalties: 4, winner: true },
    away: { code: 'FRA', name: 'France', score: 3, penalties: 2, winner: false }
  },
  children: [
    {
      stage: 'sf',
      match: {
        id: 'sf1',
        dateStr: 'Dec 13, 22',
        home: { code: 'ARG', name: 'Argentina', score: 3, winner: true },
        away: { code: 'CRO', name: 'Croatia', score: 0, winner: false }
      },
      children: [
        {
          stage: 'qf',
          match: {
            id: 'qf1',
            dateStr: 'Dec 09, 22',
            isPenalties: true,
            home: { code: 'NED', name: 'Netherlands', score: 2, penalties: 3, winner: false },
            away: { code: 'ARG', name: 'Argentina', score: 2, penalties: 4, winner: true }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-1', dateStr: 'Dec 03, 22', home: { code: 'NED', name: 'Netherlands', score: 3, winner: true }, away: { code: 'USA', name: 'United States', score: 1, winner: false } } },
            { stage: 'r16', match: { id: 'r16-2', dateStr: 'Dec 03, 22', home: { code: 'ARG', name: 'Argentina', score: 2, winner: true }, away: { code: 'AUS', name: 'Australia', score: 1, winner: false } } },
          ]
        },
        {
          stage: 'qf',
          match: {
            id: 'qf2',
            dateStr: 'Dec 09, 22',
            isPenalties: true,
            home: { code: 'CRO', name: 'Croatia', score: 1, penalties: 4, winner: true },
            away: { code: 'BRA', name: 'Brazil', score: 1, penalties: 2, winner: false }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-3', dateStr: 'Dec 05, 22', isPenalties: true, home: { code: 'JPN', name: 'Japan', score: 1, penalties: 1, winner: false }, away: { code: 'CRO', name: 'Croatia', score: 1, penalties: 3, winner: true } } },
            { stage: 'r16', match: { id: 'r16-4', dateStr: 'Dec 05, 22', home: { code: 'BRA', name: 'Brazil', score: 4, winner: true }, away: { code: 'KOR', name: 'South Korea', score: 1, winner: false } } },
          ]
        }
      ]
    },
    {
      stage: 'sf',
      match: {
        id: 'sf2',
        dateStr: 'Dec 14, 22',
        home: { code: 'FRA', name: 'France', score: 2, winner: true },
        away: { code: 'MAR', name: 'Morocco', score: 0, winner: false }
      },
      children: [
        {
          stage: 'qf',
          match: {
            id: 'qf3',
            dateStr: 'Dec 10, 22',
            home: { code: 'ENG', name: 'England', score: 1, winner: false },
            away: { code: 'FRA', name: 'France', score: 2, winner: true }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-5', dateStr: 'Dec 04, 22', home: { code: 'FRA', name: 'France', score: 3, winner: true }, away: { code: 'POL', name: 'Poland', score: 1, winner: false } } },
            { stage: 'r16', match: { id: 'r16-6', dateStr: 'Dec 04, 22', home: { code: 'ENG', name: 'England', score: 3, winner: true }, away: { code: 'SEN', name: 'Senegal', score: 0, winner: false } } },
          ]
        },
        {
          stage: 'qf',
          match: {
            id: 'qf4',
            dateStr: 'Dec 10, 22',
            home: { code: 'MAR', name: 'Morocco', score: 1, winner: true },
            away: { code: 'POR', name: 'Portugal', score: 0, winner: false }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-7', dateStr: 'Dec 06, 22', isPenalties: true, home: { code: 'MAR', name: 'Morocco', score: 0, penalties: 3, winner: true }, away: { code: 'ESP', name: 'Spain', score: 0, penalties: 0, winner: false } } },
            { stage: 'r16', match: { id: 'r16-8', dateStr: 'Dec 06, 22', home: { code: 'POR', name: 'Portugal', score: 6, winner: true }, away: { code: 'SUI', name: 'Switzerland', score: 1, winner: false } } },
          ]
        }
      ]
    }
  ]
};

export const BRACKET_2026_TBD: KnockoutNode = {
  stage: 'final',
  match: null,
  children: [
    {
      stage: 'sf',
      match: null,
      children: [
        {
          stage: 'qf',
          match: null,
          children: [
            { stage: 'r16', match: null },
            { stage: 'r16', match: null },
          ]
        },
        {
          stage: 'qf',
          match: null,
          children: [
            { stage: 'r16', match: null },
            { stage: 'r16', match: null },
          ]
        }
      ]
    },
    {
      stage: 'sf',
      match: null,
      children: [
        {
          stage: 'qf',
          match: null,
          children: [
            { stage: 'r16', match: null },
            { stage: 'r16', match: null },
          ]
        },
        {
          stage: 'qf',
          match: null,
          children: [
            { stage: 'r16', match: null },
            { stage: 'r16', match: null },
          ]
        }
      ]
    }
  ]
};

export const BRACKET_2018: KnockoutNode = {
  stage: 'final',
  match: {
    id: 'f-18', dateStr: 'Jul 15, 18',
    home: { code: 'FRA', name: 'France', score: 4, winner: true },
    away: { code: 'CRO', name: 'Croatia', score: 2, winner: false }
  },
  children: [
    {
      stage: 'sf',
      match: {
        id: 'sf-18-1', dateStr: 'Jul 10, 18',
        home: { code: 'FRA', name: 'France', score: 1, winner: true },
        away: { code: 'BEL', name: 'Belgium', score: 0, winner: false }
      },
      children: [
        {
          stage: 'qf',
          match: {
            id: 'qf-18-1', dateStr: 'Jul 06, 18',
            home: { code: 'URU', name: 'Uruguay', score: 0, winner: false },
            away: { code: 'FRA', name: 'France', score: 2, winner: true }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-18-1', dateStr: 'Jun 30, 18', home: { code: 'URU', name: 'Uruguay', score: 2, winner: true }, away: { code: 'POR', name: 'Portugal', score: 1, winner: false } } },
            { stage: 'r16', match: { id: 'r16-18-2', dateStr: 'Jun 30, 18', home: { code: 'FRA', name: 'France', score: 4, winner: true }, away: { code: 'ARG', name: 'Argentina', score: 3, winner: false } } },
          ]
        },
        {
          stage: 'qf',
          match: {
            id: 'qf-18-2', dateStr: 'Jul 06, 18',
            home: { code: 'BRA', name: 'Brazil', score: 1, winner: false },
            away: { code: 'BEL', name: 'Belgium', score: 2, winner: true }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-18-3', dateStr: 'Jul 02, 18', home: { code: 'BRA', name: 'Brazil', score: 2, winner: true }, away: { code: 'MEX', name: 'Mexico', score: 0, winner: false } } },
            { stage: 'r16', match: { id: 'r16-18-4', dateStr: 'Jul 02, 18', home: { code: 'BEL', name: 'Belgium', score: 3, winner: true }, away: { code: 'JPN', name: 'Japan', score: 2, winner: false } } },
          ]
        }
      ]
    },
    {
      stage: 'sf',
      match: {
        id: 'sf-18-2', dateStr: 'Jul 11, 18', isAfterExtraTime: true,
        home: { code: 'CRO', name: 'Croatia', score: 2, winner: true },
        away: { code: 'ENG', name: 'England', score: 1, winner: false }
      },
      children: [
        {
          stage: 'qf',
          match: {
            id: 'qf-18-3', dateStr: 'Jul 07, 18', isPenalties: true,
            home: { code: 'RUS', name: 'Russia', score: 2, penalties: 3, winner: false },
            away: { code: 'CRO', name: 'Croatia', score: 2, penalties: 4, winner: true }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-18-5', dateStr: 'Jul 01, 18', isPenalties: true, home: { code: 'ESP', name: 'Spain', score: 1, penalties: 3, winner: false }, away: { code: 'RUS', name: 'Russia', score: 1, penalties: 4, winner: true } } },
            { stage: 'r16', match: { id: 'r16-18-6', dateStr: 'Jul 01, 18', isPenalties: true, home: { code: 'CRO', name: 'Croatia', score: 1, penalties: 3, winner: true }, away: { code: 'DEN', name: 'Denmark', score: 1, penalties: 2, winner: false } } },
          ]
        },
        {
          stage: 'qf',
          match: {
            id: 'qf-18-4', dateStr: 'Jul 07, 18',
            home: { code: 'SWE', name: 'Sweden', score: 0, winner: false },
            away: { code: 'ENG', name: 'England', score: 2, winner: true }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-18-7', dateStr: 'Jul 03, 18', home: { code: 'SWE', name: 'Sweden', score: 1, winner: true }, away: { code: 'SUI', name: 'Switzerland', score: 0, winner: false } } },
            { stage: 'r16', match: { id: 'r16-18-8', dateStr: 'Jul 03, 18', isPenalties: true, home: { code: 'COL', name: 'Colombia', score: 1, penalties: 3, winner: false }, away: { code: 'ENG', name: 'England', score: 1, penalties: 4, winner: true } } },
          ]
        }
      ]
    }
  ]
};

export const BRACKET_2014: KnockoutNode = {
  stage: 'final',
  match: {
    id: 'f-14', dateStr: 'Jul 13, 14', isAfterExtraTime: true,
    home: { code: 'GER', name: 'Germany', score: 1, winner: true },
    away: { code: 'ARG', name: 'Argentina', score: 0, winner: false }
  },
  children: [
    {
      stage: 'sf',
      match: {
        id: 'sf-14-1', dateStr: 'Jul 08, 14',
        home: { code: 'BRA', name: 'Brazil', score: 1, winner: false },
        away: { code: 'GER', name: 'Germany', score: 7, winner: true }
      },
      children: [
        {
          stage: 'qf',
          match: {
            id: 'qf-14-1', dateStr: 'Jul 04, 14',
            home: { code: 'BRA', name: 'Brazil', score: 2, winner: true },
            away: { code: 'COL', name: 'Colombia', score: 1, winner: false }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-14-1', dateStr: 'Jun 28, 14', isPenalties: true, home: { code: 'BRA', name: 'Brazil', score: 1, penalties: 3, winner: true }, away: { code: 'CHI', name: 'Chile', score: 1, penalties: 2, winner: false } } },
            { stage: 'r16', match: { id: 'r16-14-2', dateStr: 'Jun 28, 14', home: { code: 'COL', name: 'Colombia', score: 2, winner: true }, away: { code: 'URU', name: 'Uruguay', score: 0, winner: false } } },
          ]
        },
        {
          stage: 'qf',
          match: {
            id: 'qf-14-2', dateStr: 'Jul 04, 14',
            home: { code: 'FRA', name: 'France', score: 0, winner: false },
            away: { code: 'GER', name: 'Germany', score: 1, winner: true }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-14-3', dateStr: 'Jun 30, 14', home: { code: 'FRA', name: 'France', score: 2, winner: true }, away: { code: 'NGA', name: 'Nigeria', score: 0, winner: false } } },
            { stage: 'r16', match: { id: 'r16-14-4', dateStr: 'Jun 30, 14', isAfterExtraTime: true, home: { code: 'GER', name: 'Germany', score: 2, winner: true }, away: { code: 'ALG', name: 'Algeria', score: 1, winner: false } } },
          ]
        }
      ]
    },
    {
      stage: 'sf',
      match: {
        id: 'sf-14-2', dateStr: 'Jul 09, 14', isPenalties: true,
        home: { code: 'NED', name: 'Netherlands', score: 0, penalties: 2, winner: false },
        away: { code: 'ARG', name: 'Argentina', score: 0, penalties: 4, winner: true }
      },
      children: [
        {
          stage: 'qf',
          match: {
            id: 'qf-14-3', dateStr: 'Jul 05, 14', isPenalties: true,
            home: { code: 'NED', name: 'Netherlands', score: 0, penalties: 4, winner: true },
            away: { code: 'CRC', name: 'Costa Rica', score: 0, penalties: 3, winner: false }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-14-5', dateStr: 'Jun 29, 14', home: { code: 'NED', name: 'Netherlands', score: 2, winner: true }, away: { code: 'MEX', name: 'Mexico', score: 1, winner: false } } },
            { stage: 'r16', match: { id: 'r16-14-6', dateStr: 'Jun 29, 14', isPenalties: true, home: { code: 'CRC', name: 'Costa Rica', score: 1, penalties: 5, winner: true }, away: { code: 'GRE', name: 'Greece', score: 1, penalties: 3, winner: false } } },
          ]
        },
        {
          stage: 'qf',
          match: {
            id: 'qf-14-4', dateStr: 'Jul 05, 14',
            home: { code: 'ARG', name: 'Argentina', score: 1, winner: true },
            away: { code: 'BEL', name: 'Belgium', score: 0, winner: false }
          },
          children: [
            { stage: 'r16', match: { id: 'r16-14-7', dateStr: 'Jul 01, 14', isAfterExtraTime: true, home: { code: 'ARG', name: 'Argentina', score: 1, winner: true }, away: { code: 'SUI', name: 'Switzerland', score: 0, winner: false } } },
            { stage: 'r16', match: { id: 'r16-14-8', dateStr: 'Jul 01, 14', isAfterExtraTime: true, home: { code: 'BEL', name: 'Belgium', score: 2, winner: true }, away: { code: 'USA', name: 'United States', score: 1, winner: false } } },
          ]
        }
      ]
    }
  ]
};
