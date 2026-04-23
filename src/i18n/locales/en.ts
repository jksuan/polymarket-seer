import type { TranslationKeys } from './zh';

const en: TranslationKeys = {
  // ─── Common ───
  common: {
    login: 'Login',
    logout: 'Log Out',
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    done: 'Done',
    retry: 'Retry',
    later: 'Later',
    max: 'MAX',
    loading: 'Loading...',
    loadingFramework: 'Loading Framework...',
    comingSoon: 'Coming Soon',
  },

  // ─── Bottom Navigation ───
  nav: {
    home: 'Home',
    search: 'Search',
    challenge: 'Challenge',
    discover: 'Discover',
    profile: 'Profile',
  },

  // ─── Top Header ───
  header: {
    balance: 'Balance',
    deposit: 'Deposit',
  },

  // ─── Discover Cards ───
  discover: {
    titleRace: 'TITLE RACE',
    trending: 'Trending',
    split: 'Split',
    longShot: 'LONG SHOT',
    tapToTrade: 'Tap card to trade',
    matchLive: 'Match Live',
    finals: 'Jul 19 Finals',
    whodaresbet: 'Who dares bet on',
    worldCupWinner: '2026 WORLD CUP WINNER IS...',
    marketProbability: 'MARKET PROBABILITY',
  },

  // ─── Home Page ───
  home: {
    allCategory: '⚡ All',
    schedule: 'Schedule',
    standings: 'Standings',
    scorers: 'Scorers',
    knockout: 'Knockout',
    funBets: 'Fun Bets',
    matchStart: 'Kickoff',
    volume: 'Volume',
    group: 'Group',
    knockoutStage: 'Knockout',
    live: 'Live',
    ended: 'Ended',
    upcoming: 'Upcoming',
    all: 'All',
  },

  // ─── Trade Terminal ───
  trade: {
    terminal: 'Trade Terminal',
    betAmount: 'Bet Amount',
    walletBalance: 'Wallet Balance...',
    availableBalance: 'Available Balance',
    bestBuyProb: 'Best Ask Probability',
    odds: 'Odds',
    expectedReturn: 'Expected Return',
    buy: 'Buy',
    homeTeam: 'Home',
    awayTeam: 'Away',
    draw: 'Draw',
    securedBy: 'Secured by Polymarket Protocol',
    insufficientBalance: 'Insufficient balance, max available',
    minBetError: 'Minimum bet amount is $1',
  },

  // ─── Transaction Overlay ───
  tx: {
    preparing: 'Preparing',
    deploying: 'Deploying Vault',
    approving: 'Token Approval',
    placing: 'Placing Order',
    success: 'Trade Success',
    error: 'Trade Failed',
    doNotClose: 'Please do not close this page, transaction processing on-chain...',
    orderId: 'Order ID',
    depositAddress: 'Your Vault Address (Polygon)',
    depositHint: 'Tip: Send at least',
    depositHintSuffix: ' USDC.e via Polygon network to this address. Tap retry after deposit.',
    retryAfterDeposit: 'Deposited, Continue Bet',
  },

  // ─── Settings Panel ───
  settings: {
    title: 'Settings',
    preferences: 'Preferences',
    language: 'Language',
    languageZh: '中文',
    languageEn: 'English',
    notifications: 'Notifications',
    notificationsOn: 'Enabled',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    helpSupport: 'Help & Support',
    helpCenter: 'Help Center',
    about: 'About SEER.SPORTS',
    legal: 'Legal & Privacy',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    loggedInAccount: 'SEER SPORTS Account',
    proxyWallet: 'Smart Vault (Polymarket Proxy)',
    signerWallet: 'Signer Wallet (EOA)',
    notAssigned: 'Not Assigned',
    notConnected: 'Not Connected',
  },

  // ─── Profile ───
  profile: {
    loginPrompt: 'Connect to start predicting',
    overview: 'Overview',
    positions: 'Positions',
    orders: 'Orders',
    history: 'History',
    transactions: 'Transactions',
    totalPnl: 'Total P&L',
    totalInvested: 'Total Invested',
    totalReturned: 'Total Returned',
    currentPositions: 'Current Positions',
    noPositions: 'No positions',
    noOrders: 'No open orders',
    noHistory: 'No trade history',
    noTransactions: 'No transactions',
    sell: 'Sell',
    redeem: 'Redeem',
    cancelOrder: 'Cancel Order',
    avgPrice: 'Avg Price',
    size: 'Size',
    pnl: 'P&L',
    probability: 'Probability',
  },

  // ─── Challenge Page ───
  challenge: {
    title: '2026 FIFA World Cup',
    today: 'Today',
    tomorrow: 'Tomorrow',
    dayAfter: 'Day After',
    filterByTeam: 'Filter by Team',
    share: 'Share',
    participants: 'Participants',
  },

  // ─── Search Page ───
  search: {
    placeholder: 'Search teams or events...',
    hotRecommend: 'Trending',
    noResults: 'No results found',
  },

  // ─── Deposit Drawer ───
  deposit: {
    title: 'Deposit USDC',
  },

  // ─── Share ───
  share: {
    shareCard: 'Share Card',
    saveImage: 'Save Image',
    shareTo: 'Share to',
  },

  // ─── Date Formatting ───
  date: {
    monthDay: (month: number, day: number) => `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1]} ${day}`,
    finals: 'Jul 19 Finals',
  },
} as const;

export default en;
