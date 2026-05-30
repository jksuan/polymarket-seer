# Crazy Fox — 工程架构文档 (ARCHITECTURE)

> **版本**：v1.6 · 最后更新：2026-05-28
> **技术栈**：Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · SWR · ethers.js · Privy

## 文档维护边界

- 本文档定位为工程架构总览，重点描述稳定的模块边界、关键数据流和核心设计决策。
- 目录树、组件清单等高频变动信息可能滞后，具体实现以仓库当前代码为准。
- 领域术语统一沉淀在 `CONTEXT.md`，重大且难以逆转的决策统一记录在 `docs/adr/`。

---

## 1. 项目目录结构

```
polymarket-seer/
├── public/                         # 静态资源（图片、图标等）
├── src/
│   ├── app/                        # Next.js App Router 入口
│   │   ├── api/                    # 服务端 API 路由（代理层）
│   │   │   ├── book/route.ts       # Polymarket 订单簿代理
│   │   │   ├── cards/route.ts      # 市场卡片数据代理
│   │   │   ├── images/[id]/route.ts # 图片代理（绕 CORS）
│   │   │   ├── proxy-image/route.ts # 通用图片代理
│   │   │   ├── search/route.ts     # 搜索 / 世界杯 events 代理
│   │   │   ├── search/worldCupEvents.ts # tag 102232 翻页拉全 + 衍生盘过滤
│   │   │   ├── share-card/route.tsx # 分享卡片 SSR 渲染
│   │   │   ├── sign/route.ts       # Polymarket CLOB 签名代理
│   │   │   ├── sports/route.ts     # 体育赛事数据代理
│   │   │   ├── bridge/             # Polymarket Bridge 代理（充值地址 / 报价 / 提现 / 状态）
│   │   │   │   ├── deposit/route.ts
│   │   │   │   ├── withdraw/route.ts
│   │   │   │   ├── quote/route.ts
│   │   │   │   ├── supported-assets/route.ts
│   │   │   │   └── status/[address]/route.ts
│   │   │   └── dln/                # deBridge DLN 代理（Connected 跨链报价与订单）
│   │   │       ├── quote/route.ts
│   │   │       ├── same-chain/route.ts
│   │   │       └── order/[id]/route.ts (+ cancel-tx)
│   │   ├── testing/                # 开发联调页（生产默认关闭，见 README）
│   │   ├── c/[id]/                 # 动态路由：分享卡片详情页
│   │   ├── globals.css             # 全局样式（Tailwind + 自定义）
│   │   ├── layout.tsx              # 根布局（HTML head、字体、Providers）
│   │   └── page.tsx                # ★ 应用主入口（SPA 路由控制器）
│   │
│   ├── components/                 # 组件库
│   │   ├── ChallengeCard.tsx       # 挑战页比赛卡片
│   │   ├── MarketSearch.tsx        # 搜索结果卡片
│   │   ├── Navbar.tsx              # 顶部导航栏（已登录态）
│   │   ├── Portfolio.tsx           # 投资组合面板（旧版，保留参考）
│   │   ├── Providers.tsx           # 全局 Provider 封装（Privy）
│   │   ├── TxOverlay.tsx           # 交易状态全屏遮罩
│   │   │
│   │   ├── pages/                  # ★ 页面级组件
│   │   │   ├── DiscoverPage.tsx    # 挑战 Tab：聚合发现流（夺冠/热门/胶着/冷门大卡片）
│   │   │   ├── discover/DiscoverPageSkeleton.tsx # 挑战 Tab 加载骨架屏
│   │   │   ├── HomePage.tsx        # 首页：赛程/积分榜/射手榜/趣味投注
│   │   │   ├── ChallengePage.tsx   # 发现 Tab：Tinder 式划动对阵卡片
│   │   │   ├── SearchPage.tsx      # 搜索页（全局搜索入口）
│   │   │   ├── LeaderboardPage.tsx # 排行页（待重构）
│   │   │   ├── ProfilePage.tsx     # 个人中心（Tab 容器：总览/持仓/挂单/战绩/明细）
│   │   │   └── profile/            # 个人中心子页面
│   │   │       ├── ProfileOverview.tsx      # 总览 Tab（盈亏统计+持仓摘要+分类图表）
│   │   │       ├── ProfilePositions.tsx     # 持仓 Tab（当前头寸列表）
│   │   │       ├── ProfileOrders.tsx        # 挂单 Tab（未成交订单列表）
│   │   │       ├── ProfileHistory.tsx       # 战绩 Tab（已结算交易）
│   │   │       ├── ProfileTransactions.tsx  # 明细 Tab（全部交易流水）
│   │   │       ├── CategoryPnlChart.tsx     # 分类盈亏条形图组件
│   │   │       ├── useProfileStats.ts       # 总览数据计算 Hook
│   │   │       ├── useProfileHistory.ts     # 战绩数据处理 Hook
│   │   │       ├── useProfileTransactions.ts # 明细数据处理 Hook
│   │   │       ├── utils.ts                 # Profile 工具函数
│   │   │       └── components/              # Profile 共享子组件
│   │   │           ├── GlassCard.tsx                # 玻璃拟态卡片容器
│   │   │           ├── OutcomePill.tsx               # 结果标签（胜/负/待定）
│   │   │           ├── ProfileEmptyState.tsx         # 空态占位组件
│   │   │           ├── ProfileCardSkeleton.tsx       # ★ 通用卡片骨架屏
│   │   │           └── ProfileTransactionSkeleton.tsx # ★ 明细专用骨架屏
│   │   │
│   │   └── ui/                     # ★ 通用 UI 组件库
│   │       ├── Skeleton.tsx        # 原子骨架屏基础组件（标准化无布局偏移加载）
│   │       ├── TopHeader.tsx       # 吸顶头部栏（余额 pill + 资金菜单入口）
│   │       ├── FundsActionSheet.tsx # 资金菜单（充值 / 提现）
│   │       ├── BottomNav.tsx       # 底部导航栏
│   │       ├── DiscoverCard.tsx    # ★ 聚合发现流组件集合包 (包含 Champion/Trending/Split/Underdog)
│   │       ├── CategoryTabs.tsx    # 分类导航标签
│   │       ├── SubTabs.tsx         # 子标签栏（首页二级导航）
│   │       ├── BannerCarousel.tsx  # 轮播图（首页横幅）
│   │       ├── MatchCard.tsx       # 比赛卡片 + MatchCardSkeleton
│   │       ├── OutrightCard.tsx    # 趣味投注卡片 + OutrightCardSkeleton
│   │       ├── MarketCard.tsx      # 通用市场卡片
│   │       ├── BinaryOutrightCard.tsx # 二元/Outright 市场卡片
│   │       ├── OutrightListView.tsx   # Outright 列表视图
│   │       ├── ConfirmModal.tsx    # 下单确认弹窗（金额/赔率/滑点，100% i18n 支持）
│   │       ├── ChooseSideDrawer.tsx# 独立阵营选择弹窗（支持 SVG 高保真国旗与动态 i18n 映射）
│   │       ├── SellDrawer.tsx      # 卖出抽屉（市价/限价，i18n适配）
│   │       ├── RedeemDrawer.tsx    # 兑现抽屉
│   │       ├── DepositDrawer.tsx   # 充值抽屉（Connected + Transfer Crypto）
│   │       ├── WithdrawDrawer.tsx  # 提现抽屉（Bridge withdraw + 状态轮询）
│   │       ├── FundsMovementTermsPanel.tsx # 充/提/转入共用适用条款摘要
│   │       ├── deposit/            # 充值子模块（connected / transfer / confirm 等）
│   │       ├── withdraw/           # 提现子模块（表单 / 报价 / 校验 / 执行）
│   │       ├── SettingsDrawer.tsx  # 设置抽屉（账户信息、法律文档入口）
│   │       ├── LanguageDrawer.tsx  # ★ 语言选择抽屉（全局一级入口，Portaled 底部滑出）
│   │       ├── settings/           # ★ 模块化设置内容组件
│   │       │   ├── AboutContent.tsx    # 关于我们（中英双语自研渲染）
│   │       │   ├── PrivacyContent.tsx  # 隐私政策
│   │       │   └── TermsContent.tsx    # 用户协议
│   │       ├── ShareModal.tsx      # 分享弹窗
│   │       ├── SharePoster.tsx     # 分享海报生成器
│   │       ├── ShareCardModal.tsx  # 分享卡片弹窗
│   │       ├── TeamBadge.tsx       # 球队徽章组件
│   │       ├── TeamFilterSheet.tsx # 球队筛选弹出框
│   │       ├── StandingsView.tsx   # 积分榜视图
│   │       ├── StandingsNav.tsx    # 积分榜年份导航
│   │       ├── ScorersView.tsx     # 射手榜视图
│   │       ├── ScorersNav.tsx      # 射手榜年份导航
│   │       ├── KnockoutBracketView.tsx # 淘汰赛对阵图
│   │       ├── PlaceholderScreen.tsx    # 通用占位屏
│   │       └── share-cards/        # 分享卡片模板
│   │           ├── PositionShareCard.tsx  # 持仓分享卡片
│   │           └── HistoryShareCard.tsx   # 战绩分享卡片
│   │
│   ├── auth/                       # 认证与余额同步（从 Context 拆出的逻辑）
│   │   ├── sessionMode.ts          # loginMethod → embedded/external
│   │   ├── privyUserIdentity.ts    # 社交/邮箱展示名与 Connected 门禁
│   │   ├── collateralBalance.ts    # pUSD collateral sync / Onramp wrap / 预检共用
│   │   ├── safeRelayExecutor.ts    # Safe relayer gasless 批次
│   │   ├── readUsdcBalanceDisplay.ts # 顶栏可交易余额格式化
│   │   ├── useBalanceSync.ts       # CLOB 余额拉取与重试
│   │   ├── useExternalAccountDrift.ts # 外链钱包漂移检测
│   │   └── resolveClobApiKeyCreds.ts  # CLOB 凭证解析
│   │
│   ├── contexts/                   # React Context 全局状态
│   │   └── PolymarketAuthContext.tsx # ★ 认证上下文（Privy + Polymarket CLOB 鉴权）
│   │
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useTrading.ts           # ★ 核心交易 Hook（下单/卖出/兑现/SWR轮询）
│   │   ├── useBridge.ts            # Bridge 充值地址 / 状态 / 提现 API
│   │   ├── useDln.ts               # deBridge DLN 报价与订单状态
│   │   ├── useLockBodyScroll.ts    # 抽屉打开时锁定 body 滚动
│   │   ├── useMatchData.ts         # 比赛数据获取 Hook
│   │   ├── useOutrightData.ts      # 趣味投注数据获取 Hook
│   │   ├── useShareCard.ts         # 分享卡片生成 Hook
│   │   └── useSportCategories.ts   # 运动分类映射 Hook
│   │
│   ├── i18n/                       # ★ 全局国际化体系
│   │   ├── locales/                # 字典目录 (zh.ts / en.ts)
│   │   ├── I18nContext.tsx         # 国际化上下文 Provider
│   │   ├── useTranslation.ts       # t / locale 获取 Hook
│   │   └── countryNames.ts         # 体育垂直领域专用：国家名词典映射引擎
│   │
│   ├── lib/                        # 工具库 & 静态数据
│   │   ├── brandAssets.ts          # APP_BRAND_NAME、Logo、favicon 单一来源
│   │   ├── brandFont.ts            # 顶栏品牌字体（Bigtimes.otf）
│   │   ├── constants.ts            # 全局常量（合约地址、API 端点等）
│   │   ├── bridgeClient.ts         # Bridge API 客户端封装
│   │   ├── dlnClient.ts            # DLN API 客户端封装
│   │   ├── utils.ts                # 通用工具函数
│   │   ├── countryFlags.ts         # 国旗 Emoji + 国家名映射表
│   │   ├── mockStandings.ts        # 世界杯积分榜静态数据（2026/2022/2018/2014）
│   │   ├── mockScorers.ts          # 射手榜静态数据
│   │   ├── mockKnockout.ts         # 淘汰赛对阵静态数据
│   │   └── mockMarkets.ts          # 市场模拟数据
│   │
│   └── types/                      # TypeScript 类型定义
│       ├── sports.ts               # 体育相关类型
│       ├── bridge.ts               # Bridge 充提 API 类型
│       └── dln.ts                  # DLN 报价 / 订单类型
│
├── requirement.md                  # 产品需求文档 (PRD)
├── ARCHITECTURE.md                 # 本文档（工程架构）
├── package.json                    # 依赖管理
├── tsconfig.json                   # TypeScript 配置
├── next.config.ts                  # Next.js 配置
├── postcss.config.mjs              # PostCSS 配置（Tailwind）
└── eslint.config.mjs               # ESLint 配置
```

---

## 2. 核心架构设计

### 2.1 应用路由架构

本项目采用 **SPA 客户端路由 + Next.js App Router 服务端 API** 的混合架构：

```
┌─────────────────────────────────────────────────┐
│  layout.tsx (Root Layout)                       │
│  ├── Providers.tsx (Privy Auth Provider)         │
│  └── page.tsx (SPA Router Controller)            │
│      ├── PolymarketAuthProvider (认证 Context)    │
│      ├── AppRouterContent                        │
│      │   ├── AnimatePresence (页面过渡动画)        │
│      │   │   ├── HomePage                        │
│      │   │   ├── DiscoverPage (challenge Tab)   │
│      │   │   ├── ChallengePage (discover Tab)    │
│      │   │   ├── SearchPage                      │
│      │   │   └── ProfilePage                     │
│      │   ├── BottomNav (底部导航)                  │
│      │   └── TxOverlay (交易状态遮罩)              │
│      └── Suspense Boundary                       │
└─────────────────────────────────────────────────┘
```

**关键设计决策**：
- 使用 `useState('home')` + `sessionStorage` 实现客户端 Tab 切换（非 URL 路由），避免移动端浏览器历史栈混乱
- 所有页面始终挂载在同一个 `page.tsx` 下，通过条件渲染 + `AnimatePresence` 实现页面切换动效
- 唯一的服务端动态路由 `/c/[id]` 用于分享卡片直链

### 2.2 认证体系架构

```
用户点击登录
    │
    ▼
┌──────────────────────┐
│  Privy 统一弹窗       │  ← email / Google / Twitter / GitHub
│  (无 wallet/SIWE)     │     Telegram 可选（env 默认关）
│  (嵌入式钱包自动创建)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  PolymarketAuthContext │
│  1. 获取嵌入式钱包地址   │
│  2. 向 CLOB 注册 API Key │ ← POST /api/sign
│  3. 获取 Proxy Wallet    │
│  4. ensureProxyCollateralSynced │
│     (CLOB sync → 必要时 USDC.e→pUSD) │
│  5. 顶栏展示可交易 pUSD 余额 │
│  6. 缓存凭据到 localStorage │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  hasCreds = true     │ → 触发 SWR 开始拉取账户数据
│  walletAddress ✓     │
│  proxyAddress ✓      │
└──────────────────────┘
```

**凭据存储**：
- `seer_clob_api_key` / `seer_clob_api_secret` / `seer_clob_api_passphrase` → localStorage
- `seer_proxy_address` / `seer_wallet_address` → localStorage
- 登出时全部清除

### 2.3 数据流架构

```
                Polymarket REST API
                       │
                       ▼
              ┌────────────────┐
              │  /api/* 代理层  │  ← Next.js API Routes (绕过 CORS)
              │  (服务端执行)    │
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │   SWR 缓存层    │  ← 去重 + 自动重验证 + 智能轮询
              │                │
              │  refreshInterval: 15s (赛事数据)
              │  refreshInterval: 3s  (下单弹窗内实时价格)
              │  revalidateOnFocus: true
              │  dedupingInterval: 2s
              └────────┬───────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
      useTrading   useMatchData  useOutrightData
      (交易核心)    (比赛数据)    (趣味投注)
           │           │           │
           ▼           ▼           ▼
       页面组件      页面组件     页面组件
```

### 2.4 API 代理层

所有对 Polymarket 原始 API 的请求都通过 Next.js API Routes 在服务端代理，解决 CORS 限制：

| 代理路由 | 上游 API | 用途 |
|---|---|---|
| `/api/sports` | `gamma-api.polymarket.com` | 获取体育赛事市场列表 |
| `/api/search` | `gamma-api.polymarket.com` | 搜索市场；FIFA 查询对 tag 102232 **翻页拉全**，返回前过滤无 moneyline 的 vs 衍生 event（见 `worldCupEvents.ts`） |
| `/api/cards` | `gamma-api.polymarket.com` | 获取市场卡片详情 |
| `/api/book` | `clob.polymarket.com` | 获取订单簿 + Tick Size |
| `/api/sign` | `clob.polymarket.com` | CLOB API Key 注册/签名 |
| `/api/images/[id]` | 外部图片 CDN | 图片代理（绕 CORS） |
| `/api/proxy-image` | 任意图片 URL | 通用图片代理 |
| `/api/share-card` | — (SSR) | 服务端渲染分享卡片 |
| `/api/bridge/deposit` | Polymarket Bridge | 创建 Transfer 入账地址 |
| `/api/bridge/withdraw` | Polymarket Bridge | 创建提现临时 bridge 地址 |
| `/api/bridge/quote` | Polymarket Bridge | 提现报价 |
| `/api/bridge/status/[address]` | Polymarket Bridge | 入账地址交易状态轮询 |
| `/api/bridge/supported-assets` | Polymarket Bridge | 可充值资产列表 |
| `/api/dln/quote` | deBridge DLN | Connected 跨链报价 |
| `/api/dln/same-chain` | deBridge DLN | 同链报价 |
| `/api/dln/order/[id]` | deBridge DLN | 订单状态查询 |
| `/api/dln/order/[id]/cancel-tx` | deBridge DLN | 取消交易构造（如适用） |

---

## 3. 核心模块详解

### 3.1 资金模块（充值 / 提现）

顶栏 **余额 pill**（`$` + `▾`）展开 `FundsActionSheet`，分别进入 `DepositDrawer` 与 `WithdrawDrawer`。展示值为 **CLOB sync 后可交易 pUSD**（非链上 USDC.e 简单相加）；legacy Safe 经 Collateral Onramp wrap。领域术语见 `CONTEXT.md`；Transfer / Connected 见 `docs/adr/0001`–`0003`；余额与 CLOB 见 `docs/adr/0004`；认证见 `docs/adr/0005`。

| 模块 | 入口 | 要点 |
|---|---|---|
| **充值 · Connected** | 已连接钱包 → 选资产 / 金额 → 确认 | EVM / SVM 执行引擎分流；报价经 `/api/dln/*`；失败可回退 Transfer |
| **充值 · Transfer** | 链上转入 | 自动创建 `Deposit Address`；`/api/bridge/status` 轮询；会话基线过滤历史终态 |
| **提现** | 选 Receive token/chain、收款地址、金额 | `/api/bridge/quote` + `POST /withdraw`；状态轮询与超时重试 |

`isEvmSignerReady` 为 false 时顶栏禁用资金入口并展示说明条（见 `docs/superpowers/specs/2026-05-12-evm-wallet-readiness-design.md`）。

### 3.2 useTrading.ts — 交易核心引擎

项目中最核心、最复杂的文件（~770 行），承担以下职责：

| 功能 | 实现方式 |
|---|---|
| **账户数据获取** | SWR 集成，以 `[proxyAddress, walletAddress]` 为 Key，15 秒自动轮询 |
| **市价下单** | `handlePlaceRealBet()` → 构建 Market Order → CLOB 签名 → Relayer 提交 |
| **限价卖出** | `handleLimitSellPosition()` → 构建 Limit Order → CLOB 签名 → 直接提交 |
| **市价卖出** | `handleSellPosition()` → 构建 Market Sell → 签名 → 提交 |
| **兑现/归档** | `handleRedeem()` → 调用 Builder Relayer Client 执行链上兑现 |
| **取消订单** | `handleCancelOrder()` → CLOB Cancel API |
| **交易状态管理** | `txStep` 状态机：idle → signing → submitting → confirming → done/error |
| **Loading 状态** | `portfolioLoading = isLoading || isAuthInitializing`（覆盖凭据初始化缝隙） |

**关键设计**：
- `isAuthInitializing`：当 `authenticated=true` 但 `swrKey=null && !data` 时强制为 loading，消除空态文字闪现
- SWR 的 `isLoading` vs `isValidating`：前者仅首次加载为 true，后者每次轮询为 true。`portfolioLoading` 只绑定 `isLoading`，确保后台静默轮询不会触发骨架屏

### 3.3 PolymarketAuthContext.tsx — 认证上下文

管理整个应用的认证生命周期：

1. **Privy 集成**：监听 `usePrivy()` 的 `authenticated` 状态
2. **钱包初始化**：从 Privy 嵌入式钱包获取 EOA 地址
3. **CLOB 凭据**：自动向 Polymarket 注册 API Key 并缓存
4. **Proxy Wallet**：建立代理钱包关系
5. **余额同步**：`ensureProxyCollateralSynced`（CLOB sync + 必要时 Onramp），顶栏与下单预检共用
6. **登出清理**：`handleLogout()` 清除所有 localStorage 状态

### 3.4 UI 与动画体系设计

1. **统一骨架屏 (Skeleton Architecture)**
   - 痛点：使用传统 Spinner 在数据加载时导致巨大的 Layout Shifts（组件跳动/突变），导致体验廉价。
   - 解决方案：引入原子的 `<Skeleton>` 组件。为每个包含网络 IO 的视图构建 1:1 像素级模拟的占位视图 (`ProfileTransactionSkeleton`, `MatchCardSkeleton` 等)。
   - 实现：统一使用 `animate-pulse` 及 `bg-white/5` 透明度映射进行暗黑主题适配。

2. **全局组件交互 (Master-Detail Portals)**
   - 痛点：在长列表中弹出确认交易单时，常遇到 CSS z-index 和父节点 overflow 截断问题。
   - 解决方案：`DiscoverPage` 广泛使用 `createPortal` 以及 Framer Motion 的 `AnimatePresence` 处理抽屉或全屏 Overlay 弹起逻辑。像 `ChooseSideDrawer` 和 `ConfirmModal` 均直接附着于 `document.body`，剥离了内部上下文的视觉耦合。

3. **色彩令牌工厂 (Color Tokens Abstraction)**
   - 我们抛弃了随地写死的 Tailwind hex 色值，统一提取主题配置引擎，如 `DISCOVER_THEME`。
   - 通过 JS 常量管理 `accentGold` (TITLE RACE金)、`dangerMagenta` (LONG SHOT危险紫红) 及其自带的高斯模糊光晕变量 `dangerMagentaGlow`，使得后续可无痛拓展皮肤和调整色阶。

4. **全球化自适应渲染 (i18n Engine)**
   - 基于纯 Context 打造了轻量级、完全类型安全的国际化引擎字典 (`zh.ts` 与 `en.ts`)。
   - 实现了特殊的 `countryNames.ts` 翻译器，确保由于 API 返回的原生国家名称（甚至特殊变体如 `BIH/ITA/NIR/WAL`）可以无缝、原子化地翻译，不再出现中英混杂硬编码问题。
   - 全局图文架构中，涉及到 `国旗` 的场景，全部使用 `getCountryFlagUrl(name, 'svg')` 请求统一的正规 4:3 矢量 SVG 资源，取代失真 PNG，强化“转播级”专业感。
   - 【核心演进】将语言切换提升为全局一级交互，使用 **LanguageDrawer** 配合 `createPortal` 挂载至 `document.body`，彻底解决了 `fixed` 定位在嵌套容器中的渲染冲突，确保在移动端始终能稳固贴底。
   - 【核心演进】完成了核心交易流（`useTrading.ts` 及其挂载弹窗等）的状态文案与语言系统的深度解耦，实现了 40+ 交易进度文案的多语言自动化映射，并针对 `DepositDrawer`、`WithdrawDrawer` 与资金菜单补齐了充提流程的中英双语文案。
   - 【核心演进】推行“组件级双语渲染”模式处理复杂文档（如隐私政策等），绕过传统的 JSON 字典，确保了富文本排版的灵活性与开发效率。

---

## 4. 状态管理策略

本项目**不使用** Redux/Zustand 等外部状态库，而是通过以下方式管理状态：

| 层级 | 技术 | 数据类型 |
|---|---|---|
| **全局认证** | React Context (`PolymarketAuthContext`) | 用户身份、钱包地址、余额 |
| **服务端数据** | SWR 缓存 | 市场数据、账户持仓、订单 |
| **页面级状态** | `useState` + `useCallback` | 当前 Tab、弹窗状态、筛选条件 |
| **持久化** | `sessionStorage` | 当前活跃 Tab（防刷新丢失） |
| **凭据** | `localStorage` | CLOB API Key、Proxy/Wallet 地址 |

---

## 5. 关键依赖说明

| 依赖包 | 版本 | 用途 |
|---|---|---|
| `next` | 16.1.6 | 框架核心（App Router + API Routes） |
| `react` / `react-dom` | 19.0.0 | UI 渲染引擎 |
| `tailwindcss` | v4 | 原子化 CSS |
| `motion` | 12.38.0 | 动画库（Framer Motion React 版） |
| `swr` | 2.4.1 | 数据获取与缓存 |
| `ethers` | 5.8.0 | 以太坊交互（签名、合约调用） |
| `@privy-io/react-auth` | 3.16.0 | 社交登录 + 嵌入式钱包 |
| `@polymarket/clob-client` | 5.8.0 | Polymarket CLOB 交易客户端 |
| `@polymarket/builder-relayer-client` | 0.0.8 | 兑现操作 Relayer |
| `recharts` | 3.8.0 | 图表（分类盈亏条形图） |
| `lucide-react` | 0.577.0 | 图标库 |
| `html-to-image` / `html2canvas` | — | 分享海报生成 |
| `qrcode.react` | 4.2.0 | QR 码生成 |
| `canvas-confetti` | 1.9.4 | 交易成功撒花特效 |
| `embla-carousel-react` | 8.6.0 | 轮播图 |

---

## 6. 开发规范

### 6.1 文件命名
- 页面组件：`PascalCase` → `HomePage.tsx`、`ProfilePage.tsx`
- Hooks：`camelCase` 前缀 `use` → `useTrading.ts`、`useMatchData.ts`
- 工具库：`camelCase` → `utils.ts`、`constants.ts`
- 静态数据：`camelCase` 前缀 `mock` → `mockStandings.ts`

### 6.2 组件组织
- **页面组件**存放在 `components/pages/`
- **通用 UI 组件**存放在 `components/ui/`
- **页面专属子组件**就近存放（如 `profile/components/`）
- **骨架屏**：简单的内联在对应组件文件中，复杂的或需跨文件复用的独立成文件

### 6.3 Git 工作流
- `main`：稳定主干，始终可部署
- `feat/*`：功能开发分支，开发完毕合并回 `main` 后不再使用
- `fix/*`：Bug 修复分支，基于最新 `main` 创建
- `refactor/*`：重构分支

### 6.4 样式规范
- 优先使用 Tailwind 原子类
- 复杂渐变/阴影使用 `style={{}}` 内联
- 深色主题基色：`#0D0518`
- 强调色：荧光绿 `#6bff8f`
- 卡片背景：玻璃拟态渐变 `rgba(255,255,255,0.04) → rgba(255,255,255,0.01)` + `border: 1px solid rgba(255,255,255,0.06)`
