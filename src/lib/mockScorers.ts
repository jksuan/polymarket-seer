export type HistoricYear = '2026' | '2022' | '2018' | '2014';

export interface Scorer {
  id: string;
  rank: number;
  name: string;
  countryCode: string; // Used to lookup in COUNTRY_CODE_MAP (Full English Name)
  goals: number;
  assists?: number;
  matchesPlayed?: number;
  avatarUrl: string | null;
}

// Transparent high-quality headshots from ESPN API public combiner
export const MOCK_SCORERS_DATA: Record<HistoricYear, Scorer[]> = {
  '2026': [], // Not started yet
  '2022': [
    { id: 'mbappe_2022', rank: 1, name: 'Kylian Mbappé', countryCode: 'France', goals: 8, assists: 2, matchesPlayed: 7, avatarUrl: '/images/avatars/mbappe.jpg' },
    { id: 'messi_2022', rank: 2, name: 'Lionel Messi', countryCode: 'Argentina', goals: 7, assists: 3, matchesPlayed: 7, avatarUrl: '/images/avatars/messi.jpg' },
    { id: 'alvarez_2022', rank: 3, name: 'Julián Álvarez', countryCode: 'Argentina', goals: 4, assists: 0, matchesPlayed: 7, avatarUrl: '/images/avatars/alvarez.jpg' },
    { id: 'giroud_2022', rank: 3, name: 'Olivier Giroud', countryCode: 'France', goals: 4, assists: 0, matchesPlayed: 6, avatarUrl: '/images/avatars/giroud.jpg' },
    { id: 'morata_2022', rank: 5, name: 'Álvaro Morata', countryCode: 'Spain', goals: 3, assists: 1, matchesPlayed: 4, avatarUrl: '/images/avatars/morata.jpg' },
    { id: 'saka_2022', rank: 5, name: 'Bukayo Saka', countryCode: 'England', goals: 3, assists: 0, matchesPlayed: 4, avatarUrl: '/images/avatars/saka.jpg' },
    { id: 'gakpo_2022', rank: 5, name: 'Cody Gakpo', countryCode: 'Netherlands', goals: 3, assists: 0, matchesPlayed: 5, avatarUrl: '/images/avatars/gakpo.jpg' },
    { id: 'valencia_2022', rank: 5, name: 'Enner Valencia', countryCode: 'Ecuador', goals: 3, assists: 0, matchesPlayed: 3, avatarUrl: '/images/avatars/valencia.jpg' },
    { id: 'ramos_2022', rank: 5, name: 'Gonçalo Ramos', countryCode: 'Portugal', goals: 3, assists: 1, matchesPlayed: 4, avatarUrl: '/images/avatars/ramos.jpg' },
    { id: 'rashford_2022', rank: 5, name: 'Marcus Rashford', countryCode: 'England', goals: 3, assists: 0, matchesPlayed: 5, avatarUrl: '/images/avatars/rashford.jpg' },
    { id: 'richarlison_2022', rank: 5, name: 'Richarlison', countryCode: 'Brazil', goals: 3, assists: 1, matchesPlayed: 4, avatarUrl: '/images/avatars/richarlison.jpg' },
  ],
  '2018': [
    { id: 'kane_2018', rank: 1, name: 'Harry Kane', countryCode: 'England', goals: 6, assists: 0, matchesPlayed: 6, avatarUrl: '/images/avatars/kane.jpg' },
    { id: 'griezmann_2018', rank: 2, name: 'Antoine Griezmann', countryCode: 'France', goals: 4, assists: 2, matchesPlayed: 7, avatarUrl: '/images/avatars/griezmann.jpg' },
    { id: 'ronaldo_2018', rank: 2, name: 'Cristiano Ronaldo', countryCode: 'Portugal', goals: 4, assists: 0, matchesPlayed: 4, avatarUrl: '/images/avatars/ronaldo.jpg' },
    { id: 'cheryshev_2018', rank: 2, name: 'Denis Cheryshev', countryCode: 'Russia', goals: 4, assists: 0, matchesPlayed: 5, avatarUrl: '/images/avatars/cheryshev.jpg' },
    { id: 'mbappe_2018', rank: 2, name: 'Kylian Mbappé', countryCode: 'France', goals: 4, assists: 0, matchesPlayed: 7, avatarUrl: '/images/avatars/mbappe.jpg' },
    { id: 'lukaku_2018', rank: 2, name: 'Romelu Lukaku', countryCode: 'Belgium', goals: 4, assists: 1, matchesPlayed: 6, avatarUrl: '/images/avatars/lukaku.jpg' },
  ],
  '2014': [
    { id: 'james_2014', rank: 1, name: 'James Rodríguez', countryCode: 'Colombia', goals: 6, assists: 2, matchesPlayed: 5, avatarUrl: '/images/avatars/james.jpg' },
    { id: 'muller_2014', rank: 2, name: 'Thomas Müller', countryCode: 'Germany', goals: 5, assists: 3, matchesPlayed: 7, avatarUrl: '/images/avatars/muller.jpg' },
    { id: 'neymar_2014', rank: 3, name: 'Neymar Jr', countryCode: 'Brazil', goals: 4, assists: 1, matchesPlayed: 5, avatarUrl: '/images/avatars/neymar.jpg' },
    { id: 'messi_2014', rank: 3, name: 'Lionel Messi', countryCode: 'Argentina', goals: 4, assists: 1, matchesPlayed: 7, avatarUrl: '/images/avatars/messi.jpg' },
    { id: 'vanpersie_2014', rank: 3, name: 'Robin van Persie', countryCode: 'Netherlands', goals: 4, assists: 0, matchesPlayed: 6, avatarUrl: '/images/avatars/vanpersie.jpg' },
  ],
};
