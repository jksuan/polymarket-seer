# Crazy Fox Context

## 项目核心目标

面向移动端用户，提供低门槛、可视化、交易反馈清晰的 Polymarket 预测交易体验。

## 品牌与对外资源

- **单一来源**：`src/lib/brandAssets.ts` — `APP_BRAND_NAME`、Logo（`/images/logo.png`）、favicon（`/images/logo.svg`）。
- **顶栏品牌字体**：`src/lib/brandFont.ts`（Bigtimes.otf）；全站文案引用 `APP_BRAND_NAME`，勿硬编码产品名。

## 关键领域术语

- **Transfer Crypto**：用户向 Polymarket 充值地址转入加密资产的流程入口。
- **Connected Wallet Deposit**：通过用户已连接钱包完成报价、授权与下单式入金的流程入口。
- **Connected Wallet (Tier3)**：仅指 Privy Tier 3 全功能链上的 Connected Wallet 入金流程，当前范围为 EVM 与 SVM（Solana）。
- **Execution Engine**：Connected Wallet 在报价/构建前确定的执行引擎，当前仅 `evm` 与 `svm`。
- **Connected Fallback to Transfer**：Connected Wallet 失败时，显式引导用户回退到 Transfer Crypto 继续充值。
- **Deposit Address**：由后端创建并轮询状态的入账地址，作为 Transfer Crypto 的收款目标。
- **Withdraw**：从 Polymarket 代理 Safe 经 Bridge 将 **Polygon pUSD** 提到用户指定的外部 EVM 地址；到账 token/chain **固定**为 Polygon · PUSD（只读展示）。用户确认后 `POST /withdraw` 生成临时 bridge 入金地址，relayer 执行 Safe → bridge 的 pUSD `transfer`；Bridge `/status` 轮询至完成。
- **Withdraw PUSD Direct**：产品决策（2026-05）：不再走 Bridge 多 token / USDC offramp（上游池不足时会 fallback 直发 pUSD，不可控）。换 USDC 等引导用户至 [Uniswap](https://app.uniswap.org/)。
- **Withdraw Safe Deploy**：仅充值、从未下单的账户 Safe 可能未部署；提现执行前 `ensureSafeDeployed`（`getDeployed` → 必要时 `deploy()`），与 `useTrading` 下单路径一致。
- **Withdraw Recipient**：用户指定的 `recipientAddr`；`sessionMode === 'external'` 时可一键填入 Connected Wallet（**Use connected**）。
- **Funds Action Sheet**：TopHeader 余额 pill（`$` + `▾`）展开的资金菜单，用于选择充值或提现入口。
- **Transfer UI Session Baseline**：每次从充值首页进入 Transfer Crypto 步骤时记录的时间戳；与同一张 Deposit Address 的创建时间取较大值，用于过滤 bridge 返回的 `transactions`，避免复用缓存地址时沿用上一笔终态。中间态若暂未带 `createdTimeMs`（例如 `DEPOSIT_DETECTED`），仍予以保留以便展示「处理中」，不在过滤器侧仅凭「列表中存在更早的旧流水」丢弃。
- **Bridge Transfer Row Priority**：同一地址 `status` 接口返回的 `transactions` 约定为新在前；会话过滤后的 **第一条** 即视为当前阶段状态（与官网「仅最新一条为 `DEPOSIT_DETECTED` 才提示处理中」一致）。上游在 `DEPOSIT_DETECTED` 阶段往往 **不提供 `txHash` 与 `createdTimeMs`**，无法用哈希或时间戳与列表内其它行做稳定关联，因此 **顺序是该阶段唯一可信的权威信号**，不再用各行的 `createdTimeMs` 取最大值代替排序语义。
- **Supported Assets**：后端桥接接口返回的可充值资产全集，前端可按业务策略进行白名单过滤。
- **Transfer Asset Whitelist**：Transfer 流程允许展示和选择的资产集合。
- **Transfer Chain Whitelist**：Transfer 流程允许展示和选择的链集合。
- **Icon Resolution Strategy**：图标解析优先级策略，用于保证弱网或外链失效时仍可稳定展示。

### 认证（Privy / ADR-0005）

- **Unified Login**：顶栏单一「登录」按钮，Privy 统一弹窗。
- **登录方式（2026-05-20）**：仅 **embedded** 路线 — 默认弹窗为 `email` / Google / Twitter / **GitHub**；**不提供** MetaMask / WalletConnect 登录（Issue #8 产品规避，见 `docs/issues/issue-8-handoff.md` §15）。
- **Telegram（可选）**：`privyUserIdentity` 已实现 Telegram 身份解析；Privy 弹窗入口由 `NEXT_PUBLIC_ENABLE_TELEGRAM_LOGIN` 控制（默认 `false`，见 `.env.local.example`）。
- **sessionMode**：新会话均为 `embedded`；`external` 仅兼容历史会话。细则见 `docs/adr/0005-auth-session-mode.md`。
- **Embedded 钱包创建**：Privy `createOnLogin: off`；`embedded` 会话由 `PolymarketAuthContext.ensureEmbeddedWalletForUser()` 统一 `createWallet()`，避免与 Privy 内置开户屏竞态导致双钱包。
- **登录身份解析**：统一由 `src/auth/privyUserIdentity.ts` 提供展示名与 Connected 充提门禁（`sessionMode === 'external'` 才展示 Connected）。
- **Issue #8（已关闭）**：iPhone MM(WC)→退出→Google 为 Privy SDK 已知问题；通过去掉 wallet 登录规避，不做应用层 patch。

### 国际化（i18n）

- **Locale 持久化**：`localStorage` 键 `seer_locale` + Cookie `seer_locale`（`src/i18n/localeStorage.ts`）。
- **SSR 对齐**：`layout.tsx` 读 Cookie 注入 `I18nProvider initialLocale`，避免首屏 Login/登录 水合不一致。

### 余额与交易 collateral（ADR-0004）

- **可交易余额**：顶栏与下单预检均展示 **CLOB sync 后的 pUSD collateral**，不与链上未 wrap 的 USDC.e 简单取 max。
- **ensureProxyCollateralSynced**：`updateBalanceAllowance` → `getBalanceAllowance(COLLATERAL)`；若 CLOB=0 且 proxy 仍有 legacy USDC.e，经 relayer 执行 **Collateral Onramp wrap** 后再 sync。
- **实现集中**：`src/auth/collateralBalance.ts`、`readUsdcBalanceDisplay.ts`；细则见 `docs/adr/0004-polymarket-auth-invariants.md` §1。

### 世界杯市场数据（Gamma tag 102232）

- **数据源**：`/api/search?q=FIFA World Cup`（或 `wc=1`）→ Gamma `events?tag_id=102232`。
- **翻页拉全**：单页 `limit=100` 不足；服务端按 `offset` 翻页去重（见 `worldCupEvents.ts`）。
- **衍生盘过滤**：返回前剔除 **无 moneyline 的 vs 衍生 event**（如 More Markets、Exact Score）；非 vs 趣味盘保留。
- **客户端解析**：`parseMatchEvents` 仍只摘 `sportsMarketType=moneyline` 且恰好 3 个子市场；小组赛共 **72 场** moneyline 对阵。

## 当前上下文约定

- Transfer 与 Connected 是两条并行入口，避免互相阻塞主路径。
- 产品入口当前仅保留 `Connected Wallet (Tier3 EVM/SVM)` 与 `Transfer Crypto`；`Tier2 RawSign Wallet` 暂不纳入实现范围。
- Connected Wallet 在 `quote/build` 前必须完成执行引擎分流，不在 execute 阶段临时分支。
- Transfer 流程默认“自动创建地址”，减少用户显式操作步骤。
- 与业务规则强耦合的展示约束需通过 ADR 留痕，并在代码中可追溯。

## 联调验证记录（Transfer Crypto）

- **Solana 主网路径**（2026-05-11）：代币 SOL、网络 Solana、svm 收款地址经链上转账后，**入账与 Polymarket 余额刷新**已在实际环境中跑通，可作为「Transfer Crypto · Solana」上线前冒烟基线。
- **Solana Explorer**：收款公钥在**首笔成功入账前**常显示 “Account does not exist”，表示该地址在对应集群上尚未建账；入账后即显示正常。排查时请确认 Explorer 所选集群（如 Mainnet）与收款网络一致。
- **界面「最低 $×」**：来自支持资产与链级规则的聚合展示；**是否入账以 Bridge 检测与上游规则为准**。若出现展示金额与实际入账规则不一致，应单独开 issue 对齐文案或后端规则，不在本段展开。
