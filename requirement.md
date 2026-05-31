# Crazy Fox — 产品需求文档 (PRD)

> **版本**：v2.7 · 最后更新：2026-05-30
> **产品定位**：2026 世界杯体育预测 H5 应用，以 Polymarket 为底层交易引擎。

## 文档维护边界

- 本文档定位为产品需求与体验目标总览，重点说明用户价值、核心流程和体验标准。
- 细粒度 UI 文案、像素级样式、短期实验项可能与实现存在时间差，具体以当前代码和 issue 讨论为准。
- 与实现强耦合的规则（如资产白名单、图标优先级、链路约束）应同步在 `docs/adr/` 留痕，避免需求与实现脱节。

---

## 1. 项目视觉风格定位 (Visual Style)

| 维度 | 规范 |
|---|---|
| **核心理念** | 去交易化、直觉化、高颜值、社交感 |
| **设计风格** | 暗黑系新野兽主义 (Dark Neobrutalism)，以深紫底 `#0D0518` 为主色调，荧光绿 `#6bff8f` 为强调色，搭配玻璃拟态 (Glassmorphism) 卡片 |
| **动效标准** | 全站使用 Framer Motion 过渡动画，页面切换带模糊聚焦效果，交互元素带 `active:scale-95` 微按压反馈 |
| **加载策略** | 全页面采用高保真骨架屏 (Skeleton Screen)，禁止使用旋转圈或"加载中"文本 |
| **国际化 (i18n)** | 全局原生强类型的中英双语支持。已建立独立的 **LanguageDrawer** 作为全局一级入口，支持底部滑出式（Bottom Sheet）交互。语言偏好写入 Cookie + localStorage，SSR 通过 `initialLocale` 与首屏对齐。已覆盖基础 UI、内容卡片、充值抽屉（DepositDrawer）及 40 余项交易状态文案。 |
| **适配目标** | 移动端 H5 优先（特别优化 X/Twitter 内置浏览器体验），使用 `100dvh` 适配各类视口。 |

---

## 2. 页面结构总览

### 2.1 全局框架

应用采用 **SPA 单页模式**，使用底部导航栏 (BottomNav) 作为唯一路由入口，通过 `sessionStorage` 持久化当前 Tab 状态，页面切换通过 `AnimatePresence` 实现无缝过渡。

### 2.2 顶部栏 (TopHeader)

- **固定吸顶 (Sticky)**：毛玻璃效果 `backdrop-filter: blur(12px)`
- **左侧**：品牌 Logo（`logo.png`）+ 应用名称（`APP_BRAND_NAME`，当前为 Crazy Fox；Bigtimes 字体）
- **右侧**：
  - **未登录**：显示"登录"按钮 + 全局语言切换图标
  - **已登录**：
    - **余额胶囊**：荧光绿 pill 展示 `$XX.XX` 与下拉箭头（**可交易 pUSD 余额**，与 CLOB 一致，见 ADR-0004）；点击展开 **资金菜单 (Funds Action Sheet)**，可选择充值或提现。副标题统一为「余额: $x.xx」。EVM 签名未就绪时禁用资金入口并展示简短说明条。
    - **极简语言切换**：Globe 图标，点击调起全局语言选择器。
    - **用户头像**：点击弹出设置抽屉（包含账户管理、法律条款等）。

### 2.3 底部导航栏 (BottomNav) — 五大频道

> **Tab ID 与页面组件映射以 `src/app/page.tsx` 为准**（名称与组件语义 intentionally 交叉，见各节说明）。

| 序号 | Tab ID | 名称 | 图标/位置 | 页面组件 |
|---|---|---|---|---|
| 1 | `home` | 首页 | Home 🏠 | `HomePage` |
| 2 | `discover` | 发现 | Compass 🧭 | `ChallengePage`（划动对阵卡片） |
| 3 | `challenge` | 挑战 | 中央奖杯 ⚽ | `DiscoverPage`（聚合发现流大卡片） |
| 4 | `search` | 搜索 | Search 🔍 | `SearchPage` |
| 5 | `profile` | 我的 | User 👤 | `ProfilePage` |

---

## 3. 各频道功能定义

### 3.1 首页 (Home)

#### 3.1.1 导航层
- **分类标签栏 (CategoryTabs)**：横向滚动选项，包含"⚡ 全部"以及各联赛/运动分类（世界杯、NBA、网球等），由 API 动态获取
- **子标签栏 (SubTabs)**：
  - **赛程 Tab**：二级可切换 `全部 | A组 | B组 | ... | L组 | 淘汰赛`，支持按世界杯小组和淘汰赛阶段筛选；可选 **TeamFilterSheet** 按球队过滤；**小组赛 moneyline 对阵共 72 场**（经 `/api/search` 翻页拉全 tag 102232 后由 `parseMatchEvents` 解析）
  - **积分榜 Tab**：展示 2026/2022/2018/2014 四届世界杯积分排名表
  - **射手榜 Tab**：展示各届最佳射手统计
  - **趣味投注 Tab**：展示非比赛类的 Outright 预测市场（冠军、小组第一、射手等）

#### 3.1.2 内容层
- **赛程**：按日期分组的 `MatchCard` 列表；加载态使用 `MatchCardSkeleton`
- **趣味投注**：`OutrightCard` / `BinaryOutrightCard`；加载态使用 `OutrightCardSkeleton`

#### 3.1.3 交互流
1. 用户在卡片上点击投注按钮 → 调起 **ChooseSideDrawer**（胜平负）或 **ConfirmModal**
2. 弹窗内展示：选中方向、实时赔率、预期收益、滑动金额选择器
3. 确认下注 → TxOverlay 展示链上交易进度

### 3.2 挑战 (Challenge Tab → `DiscoverPage`)

#### 3.2.1 功能定义
中央奖杯 Tab，展示 **模块化发现流**：夺冠热门、热门对赌、势均力敌、以小博大等主题大卡片。

#### 3.2.2 UI 结构（Discover Feed）
- **1. TITLE RACE (夺冠热门)**：Outright 金卡 + 横向 Top 候选列表
- **2. TRENDING (热门对赌)**：交易量最大的焦点单场
- **3. SPLIT (势均力敌)**：赔率差 ≤15% 的胶着战
- **4. LONG SHOT (以小博大)**：低概率 (5%–20%) 冷门
- 各主题均配 **HorizontalMatchRow** 横排小卡，支持 Master-Detail 切换 Hero 主卡
- **加载态**：`DiscoverPageSkeleton` 结构化骨架屏（与首页 Skeleton 视觉一致），禁止居中英文 Loading 文案

#### 3.2.3 交互流
1. 点击大卡片 → **ChooseSideDrawer** → **ConfirmModal** → TxOverlay

### 3.3 发现 (Discover Tab → `ChallengePage`)

#### 3.3.1 功能定义
Compass「发现」Tab：Tinder 式 **左右划动** 单场对阵卡片，低门槛探索下注。

#### 3.3.2 UI 结构
- 全屏轮播 `CarouselCard`：大圆圈国旗、胜平负赔率、市场池、底部三键下注
- 左右切换更多场次；加载态为与卡片布局对齐的 **内联骨架屏**（见 `ChallengePage`）

#### 3.3.3 分享功能
- 战报卡片 (ShareCardModal)：Canvas 生成分享海报

### 3.4 搜索 (Search)

#### 3.4.1 功能定义
全局球队/赛事快速搜索入口。

#### 3.4.2 UI 结构
- **搜索框**：顶部常驻，支持中英文模糊搜索
- **热门推荐**：空闲态展示热门赛事/球队快捷入口
- **搜索结果**：实时匹配 Polymarket API 返回结果，以卡片列表形式展示
- **详情进入**：点击搜索结果卡片可直接展开投注操作
- **加载态**：结构化骨架反馈

### 3.5 我的 (Profile)

#### 3.5.1 功能定义
个人中心，提供完整的账户管理和交易记录视图。

#### 3.5.2 未登录状态
- 居中登录引导页："连接进入预测场" + 大按钮"登录"

#### 3.5.3 已登录状态 — 五大 Tab
| Tab | 名称 | 功能 |
|---|---|---|
| `stats` | 总览 | 总净盈亏、总投入/总收入、当前持仓汇总（总本金/总价值/浮动盈亏）、分类盈亏条形图 |
| `active` | 持仓 | 当前持有的预测头寸列表，支持卖出（市价/限价）和兑现操作 |
| `orders` | 挂单 | 未成交的限价订单列表，支持取消操作 |
| `history` | 战绩 | 已结算的历史交易记录，按赛事展示胜率和盈亏 |
| `transactions` | 明细 | 全部交易流水（入账、出账、兑现），按时间倒序展示 |

#### 3.5.4 加载策略
- 所有 Tab 统一使用骨架屏过渡
- "总览"使用 `ProfileOverviewSkeleton`（三联卡片骨架）
- "持仓/挂单/战绩"使用 `ProfileCardSkeleton`（通用卡片骨架）
- "明细"使用 `ProfileTransactionSkeleton`（单行流骨架）
- 空态文字（如"暂无历史战绩"）仅在数据请求完毕且结果为空时才展示

#### 3.5.5 分享功能
- 持仓分享卡片 (PositionShareCard)
- 战绩分享卡片 (HistoryShareCard)
- 一键生成海报 + QR 码

#### 3.5.6 规划优化 (图表与大盘重构计划 - 待开发)
待核心功能闭环后，计划对现有的单调图表（如 Recharts）进行深度情感化与视觉重构：
1. **统一的高保真视觉语言**：摒弃干瘪压抑的扁平图表，运用如首页般发光的动态渐变、玻璃态阴影，实现霓虹呼吸感。
2. **引入时间走势曲线 (Equity Curve)**：打破单一的分类统计截面，增加“Robinhood式”平滑资金时间走势曲线图，增强连续性的多巴胺正向反馈。
3. **增加高阶触觉交互**：重做 Tooltip，使其在滑动屏幕触摸节点时支持震动反馈及 iOS 级别原生流畅飘带提示框。
4. **盈亏情绪渲染**：赋予盈浮大字与背景板动态光晕呼吸效，盈利时触发荧光绿生命力光效，亏损时转为暗红警示光环，引发更强的交易情绪价值。

---

## 4. 核心交互流程

### 4.1 用户认证流程
1. 使用 **Privy** 社交/邮箱登录（默认：邮箱、Google、X/Twitter、GitHub；**不含** MetaMask / WalletConnect 登录入口）
2. **Telegram** 登录代码已实现，弹窗入口默认关闭（`NEXT_PUBLIC_ENABLE_TELEGRAM_LOGIN=true` 可启用）
3. 登录后由应用层 `createWallet()` 创建/恢复 Polygon Embedded 钱包（Privy `createOnLogin` 已关闭，见 ADR-0005 §6 修订）
4. 自动向 Polymarket CLOB 服务注册 API Key（签名授权）
5. 建立 Proxy Wallet 代理关系
6. 全程免 Gas（Polymarket 代付）

### 4.2 下单交易流程
1. 用户选择预测方向 → 确认弹窗展示赔率和预期收益
2. 默认执行市价单 (Market Order)，屏蔽复杂限价设置
3. 链上签名 → Polymarket Relayer 提交 → 等待撮合 → 完成
4. TxOverlay 全程覆盖展示交易状态（支持重试）

### 4.3 数据转换规则

| Polymarket 原始数据 | UI 展示 |
|---|---|
| `price: 0.75` | 75% 胜率 / 1.33× 赔率 |
| Order Book | 隐藏（内部调用 Market Order 接口） |
| Limit Order | 高级用户可在卖出时使用限价单 |
| Token ID | 隐藏，内部映射到球队/选项名称 |

### 4.4 充值与提现流程

#### 4.4.1 充值 (DepositDrawer)

- **入口**：顶栏资金菜单 → 充值；或历史兼容入口（如有）。
- **首页**：加密货币 Tab 为主路径；银行 Tab 为「即将上线」灰态。两条并行子路径：
  - **Connected Wallet**：已连接钱包选资产 → 输入金额 → 确认页报价（deBridge / 同链）→ 钱包签名；支持 EVM 与 Solana（SVM）。失败可引导回 Transfer。
  - **Transfer Crypto**：选择 token / 链 → 展示入账地址与 QR → 用户链上转账 → 轮询入账状态直至完成或失败。
- **副标题**：各步骤标题下展示「余额: $x.xx」。
- **条款**：首页底部展示适用条款摘要（与提现样式一致）。

#### 4.4.2 提现 (WithdrawDrawer)

- **入口**：顶栏资金菜单 → 提现。
- **表单**：到账固定 **Polygon · PUSD**（只读）；用户填写 **收款地址**（external 会话可一键填入已连接钱包）、**金额**；展示 Uniswap 换币引导（需 USDC 等时自行兑换）。
- **执行**：`POST /withdraw` 创建 bridge 入金地址 → `ensureSafeDeployed` → relayer 以 Safe 身份转 pUSD 至 bridge → `/status` 轮询（含失败提示、约 2 分钟超时与重试）；进行中禁用重复提交；完成后展示成功态。

工程细节见 `CONTEXT.md` 与 `docs/adr/`。

---

## 5. 性能与体验要求

| 维度 | 要求 |
|---|---|
| **首屏加载** | 骨架屏即刻呈现，真实数据在 1-3 秒内填充 |
| **数据刷新** | SWR 轮询，赛事数据 15 秒自动静默更新 |
| **页面可见性** | 利用 Page Visibility API，后台暂停轮询以节省资源 |
| **缓存与原子化** | SWR 去重 + 模块级缓存；针对 Tick Size & 赔率 API 存在竞态条件的问题，通过原子化的服务端请求和精准拦截，彻底消除价格跳动与滑点失败 |
| **交易延迟** | 下单弹窗内使用高频轮询（3 秒）确保买卖盘赔率即时准确 |
| **布局稳定** | 严禁 Layout Shift；原子 `Skeleton` 覆盖首页赛程、挑战 Tab（DiscoverPage）、发现 Tab（ChallengePage）、Profile 等 |
| **持仓数据透传** | 通过全局 Data Hook 贯穿整个组件树，用户的 Size 和 Avg Price 直观显示在任何卡片顶部 |
| **离线容错** | 弱网环境显示最后一次成功的缓存数据 |

---

## 6. 社交功能

- **分享海报**：Canvas 渲染 → 一键保存/分享到社交平台
- **海报内容**：预测详情 + 实时赔率 + 比赛视觉图 + 专属 QR 码
- **QR 码**：指向特定比赛预测详情页面 `/c/[conditionId]`
- **分享方式**：Web Share API（移动端原生分享菜单）

---

## 7. 技术栈概要

| 层级 | 技术选型 |
|---|---|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript + React 19 |
| 样式 | Tailwind CSS v4 |
| 动画 | Framer Motion (motion/react) |
| 数据 | SWR |
| 链上 | ethers.js v5 + Polymarket CLOB Client |
| 认证 | Privy (嵌入式钱包 + 社交登录) |
| 图表 | Recharts |
| 图标 | Lucide React |