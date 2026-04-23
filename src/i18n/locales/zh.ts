const zh = {
  // ─── 通用 ───
  common: {
    login: '登录',
    logout: '退出登录',
    confirm: '确认',
    cancel: '取消',
    close: '关闭',
    done: '完成',
    retry: '重试',
    later: '稍后',
    max: '最大',
    loading: '加载中...',
    loadingFramework: '加载框架中...',
    comingSoon: '即将上线',
  },

  // ─── 底部导航 ───
  nav: {
    home: '首页',
    search: '搜索',
    challenge: '挑战',
    discover: '发现',
    profile: '我的',
  },

  // ─── 顶部栏 ───
  header: {
    balance: '可用余额',
    deposit: '充值',
  },

  // ─── 发现页卡片 ───
  discover: {
    titleRace: '夺冠热门',
    trending: '全网焦点',
    split: '势均力敌',
    longShot: '以小博大',
    tapToTrade: '点击卡片快速投注',
    matchLive: '比赛进行中',
    finals: '7月19日 决赛',
    whodaresbet: '谁敢押注',
    worldCupWinner: '2026 世界杯冠军是...',
    marketProbability: '市场概率',
    chooseSide: '选择阵营',
    win: '胜',
    drawLabel: '平局 DRAW',
    buyYes: '买入是',
    loadingMarket: 'Loading Market Data...',
    hotMatches: '热门赛事',
  },

  // ─── 首页 ───
  home: {
    allCategory: '⚡ 全部',
    schedule: '赛程',
    standings: '积分榜',
    scorers: '射手榜',
    knockout: '淘汰赛',
    funBets: '趣味投注',
    matchStart: '开赛',
    volume: '交易量',
    group: '组',
    knockoutStage: '淘汰赛',
    live: '实时',
    ended: '已结束',
    upcoming: '未开赛',
    all: '全部',
  },

  // ─── 交易终端 ───
  trade: {
    terminal: '交易终端',
    betAmount: '投注金额',
    walletBalance: '钱包余额...',
    availableBalance: '可用余额',
    bestBuyProb: '最优买入概率',
    odds: '赔率',
    expectedReturn: '预期回报',
    buy: '买入',
    homeTeam: '主队',
    awayTeam: '客队',
    draw: '平局',
    securedBy: 'Secured by Polymarket Protocol',
    insufficientBalance: '可用余额不足，当前最大可用',
    minBetError: '投注金额必须大于等于$1',
  },

  // ─── 交易状态遮罩 ───
  tx: {
    preparing: '准备中',
    deploying: '部署金库',
    approving: '代币授权',
    placing: '提交订单',
    success: '交易成功',
    error: '交易失败',
    doNotClose: '请勿关闭页面，交易正在链上处理中...',
    orderId: '订单 ID',
    depositAddress: '您的专属金库地址 (Polygon)',
    depositHint: '提示：请通过 Polygon 网络向此地址转入至少',
    depositHintSuffix: '。到账后点击下方重试。',
    retryAfterDeposit: '已充值，继续下注',
  },

  // ─── 设置面板 ───
  settings: {
    title: '设置',
    preferences: '偏好设置',
    language: '语言',
    languageZh: '中文',
    languageEn: 'English',
    notifications: '通知设置',
    notificationsOn: '已开启',
    appearance: '外观',
    darkMode: '暗黑模式',
    helpSupport: '帮助与支持',
    helpCenter: '帮助中心',
    about: '关于 SEER.SPORTS',
    legal: '法律与隐私',
    privacy: '隐私政策',
    terms: '用户协议',
    loggedInAccount: 'SEER SPORTS 登录账户',
    proxyWallet: '智能金库 (Polymarket Proxy)',
    signerWallet: '底层钱包 (Signer EOA)',
    notAssigned: '未分配',
    notConnected: '未连接',
  },

  // ─── 个人中心 ───
  profile: {
    loginPrompt: '连接进入预测场',
    overview: '总览',
    positions: '持仓',
    orders: '挂单',
    history: '战绩',
    transactions: '明细',
    totalPnl: '总净盈亏',
    totalInvested: '总投入',
    totalReturned: '总收入',
    currentPositions: '当前持仓汇总',
    noPositions: '暂无持仓',
    noOrders: '暂无挂单',
    noHistory: '暂无历史战绩',
    noTransactions: '暂无交易明细',
    sell: '卖出',
    redeem: '兑现',
    cancelOrder: '取消订单',
    avgPrice: '均价',
    size: '数量',
    pnl: '盈亏',
    probability: '概率',
  },

  // ─── 挑战页 ───
  challenge: {
    title: '2026 FIFA World Cup',
    today: '今天',
    tomorrow: '明天',
    dayAfter: '后天',
    filterByTeam: '按球队筛选',
    share: '分享',
    participants: '参与人数',
  },

  // ─── 搜索页 ───
  search: {
    placeholder: '搜索球队或赛事...',
    hotRecommend: '热门推荐',
    noResults: '未找到相关结果',
  },

  // ─── 充值抽屉 ───
  deposit: {
    title: '充值 USDC',
  },

  // ─── 分享 ───
  share: {
    shareCard: '分享卡片',
    saveImage: '保存图片',
    shareTo: '分享到',
  },

  // ─── 日期格式化 ───
  date: {
    monthDay: (month: number, day: number) => `${month}月${day}日`,
    finals: '7月19日 决赛',
  },
};

export default zh;

// Widen to string so en.ts can use different string values
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => R
  : T[K] extends object ? DeepStringify<T[K]>
  : string;
};

export type TranslationKeys = DeepStringify<typeof zh>;

