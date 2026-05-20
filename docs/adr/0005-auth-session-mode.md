# ADR-0005: Privy 认证 sessionMode 与登录分流

- 状态：Accepted
- 日期：2026-05-19
- 取代：[ADR-0004](./0004-polymarket-auth-invariants.md)（登录/漂移相关条款）

## 背景

`PolymarketAuthContext` 曾通过 Privy 统一弹窗 + 外链 `accountsChanged` 漂移检测（ADR-0004 §3）实现「MetaMask 切账户 → 自动 logout + 自动 login」。该方案在以下场景反复失败：

- 同一浏览器 **MetaMask 登录 → 退出 → Google 登录**（尤其 iPhone Chrome + WalletConnect 残留）
- 补丁叠补丁导致桌面 **无法正常退出**、切账户行为与预期不符

根因是 **WalletConnect 会话、Privy 连接器与 OAuth 共用同一前端状态机**，自动 `login()` 放大竞态。需要以 **登录完成后的 sessionMode** 隔离外链与社交/邮箱路线，并简化漂移处理。

## 决策

### 1. 登录入口（UI）

- 顶栏保留 **一个「登录」按钮**，调用 Privy `login()` **统一弹窗**。
- 用户在弹窗内自选：外链钱包 / Google / 邮箱 / Twitter 等；**不在弹窗外预承诺路线**。
- 登录完成后通过 `useLogin({ onComplete })` 的 `loginMethod` 写入 **sessionMode**（见 §2）。

### 2. sessionMode

| `loginMethod`（Privy） | sessionMode | 主钱包 |
|------------------------|-------------|--------|
| `siwe` | `external` | 本会话锁定的外链连接器 |
| `google`、`email`、`twitter` 等 | `embedded` | Privy embedded（`walletClientType === 'privy'`） |

- sessionMode 持久化在 **`sessionStorage`**（键：`polymarket-seer:session-mode`），刷新后仍有效；**logout 时清除**。
- 已登录但 storage 缺失时，可从 `user`（google/email/twitter 字段）推断为 `embedded`。
- **embedded 会话**：`selectPrimaryWallet` 启用 `preferEmbedded`；无 embedded 时 **不得回退** 至残留外链，避免误 `setActiveWallet`。
- **external 会话**：沿用 sticky `walletClientType`；首屏 session 地址与外链一致时尽早锁定 sticky。

### 3. 运行环境与 walletList

客户端 mount 后按环境配置 `PrivyProvider` 的 `appearance.walletList`（禁止 SSR 默认列表污染手机）：

| 环境 | walletList 要点 |
|------|-----------------|
| 桌面浏览器 | `metamask`、`detected_ethereum_wallets`、`wallet_connect_qr` 等 |
| 手机浏览器（Chrome/Safari） | `metamask`、`wallet_connect`（无注入，MetaMask 走 WC） |
| 钱包 App 内置浏览器 | 仅 `metamask`（有注入，避免多余 WC） |

OAuth / 邮箱路线 **不依赖** walletList；仅用户选择「钱包」时生效。

### 4. 外链账户漂移（取代 ADR-0004 §3）

- **仅** `sessionMode === 'external'` 时监听外链 `accountsChanged`，300ms 防抖；锚点仍为 `user.wallet.address`（小写）。
- 检测到漂移：**执行 logout + 清除本会话状态**，顶栏提示「钱包账户已变更，请重新登录」。
- **禁止** 漂移后自动调用 `login()`（原 ADR-0004 与 Polymarket 官网对齐的自动重登废止）。

### 5. 登出（分模式）

共用：`sessionEpoch` 递增、creds/sticky/余额状态清除（继承 ADR-0004 §4 抽屉与交易终端行为）。

| sessionMode | 额外清理 |
|-------------|----------|
| `external` | 断开外链 `disconnect()`；清除 WalletConnect localStorage / IndexedDB |
| `embedded` | 无 WC 清理 |

登出后 `sessionMode` 置空。手机 external 登出若仍有 WC 脏状态，可后续迭代 **整页 reload**（本 ADR 不强制）。

### 6. Embedded 钱包创建

- Provider 配置 `embeddedWallets.ethereum.createOnLogin: 'users-without-wallets'`（Privy 弹窗路径）。
- `embedded` 会话若仍无 privy 钱包，Provider 内显式 `createWallet()` 兜底。

### 7. 继承 ADR-0004 的余额与 CLOB 不变量

以下条款 **继续有效**，本 ADR 不修改：

- 顶栏余额：有效 CLOB creds → `getBalanceAllowance`（COLLATERAL / proxy Safe）；否则链上读 proxy Safe USDC.e。
- CLOB API Key：`isValidApiKeyCreds`、derive 400 不算成功、每会话一次 derive/create；逻辑在 `resolveClobApiKeyCreds.ts`。
- 登出与会话遮罩：`sessionEpoch`、`resolveOverlayOpen`、交易终端 epoch 取消。

## 非目标

- ClobAuth 延迟到首次交易（Bug B）。
- Coinbase 手机 ClobAuth 后余额展示（Bug C）。
- Polymarket 式 Safe onboarding 四步 UI。
- 自研双按钮 LoginSheet 替代 Privy 弹窗。

## 影响

- Auth 模块可拆为：`sessionMode`、`usePrivyLoginSession`（或 Context 内聚）、环境 `walletList`、分模式 `performSessionLogout`、收窄后的 `useExternalAccountDrift`。
- 单测：`accountSwitch` 用例期望 **logout 且无自动 login**；补充 social + 残留外链、sessionMode 持久化用例。
- `ARCHITECTURE.md` 认证描述以本 ADR 为准；ADR-0004 标记 Superseded。

## 验收（手动）

1. 桌面：MetaMask → 退出 → Google → 已登录。
2. iPhone Chrome：同上。
3. 清缓存先 Google → 正常。
4. 桌面 MetaMask 内切账户 → 登出 + 提示，手动点登录可重连。
5. MetaMask 登录过程无 WC `session topic doesn't exist` 刷屏（或显著减少）。
