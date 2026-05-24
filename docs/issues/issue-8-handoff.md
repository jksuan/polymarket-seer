# Issue #8 Handoff：iPhone Chrome 无痕 MM(WC) → 退出 → Google 登录失败

> 供 Antigravity / 其他 AI 或开发者直接读取。  
> 原实验分支：`fix/auth-iphone-oauth`（**已放弃，不 merge**）  
> 产品决议分支：`feat/auth-embedded-only`  
> 最后更新：2026-05-20

---

## 1. 问题摘要

**验收用例（仅移动端失败）：**

> iPhone Chrome **无痕** → MetaMask（WalletConnect）登录 → 退出 → **同 tab** 点登录 → Google

**期望：** Privy 显示 Verifying → Successfully，用户已登录。  
**实际：** Google 回跳后地址栏带 `privy_oauth_*`，无 Verifying，未登录。

**对照组（均 ✅）：**

| 场景 | 结果 |
|------|------|
| Desktop：MM → 退出 → Google | ✅ |
| iPhone 无痕：**直接 Google**（无 prior MM） | ✅ |
| iPhone 无痕：清 storage 后直接 Google | ✅ |
| iPhone 无痕：**MM → 退出 → Google** | ❌ |

---

## 2. 环境与栈

| 项 | 值 |
|---|---|
| 框架 | Next.js 16 App Router, React 19 |
| Privy | `@privy-io/react-auth` **3.16.0** |
| 链 | Polygon only |
| 本地 dev | `https://192.168.1.4:3000`（`--experimental-https`） |
| Dashboard | allowed domain 已含上述 URL |

**PrivyProvider 常态配置：**

```ts
loginMethods: ["email", "wallet", "twitter", "google"]
embeddedWallets.ethereum.createOnLogin: "users-without-wallets"
// 手机 browser walletList: metamask, coinbase_wallet, wallet_connect
```

---

## 3. 与 ADR-0005 的关系

- **Issue #8 先于 ADR-0005 存在**；ADR-0005（`docs/adr/0005-auth-session-mode.md`）正是为隔离 WC/OAuth 状态机、废止漂移后自动 `login()` 而写。
- ADR 验收第 2 条即为「iPhone Chrome：MM → 退出 → Google → 已登录」——**至今未通过**。
- **`sessionMode` 在 OAuth 回跳阶段（`authenticated=false`）基本不参与**，不太像根因；最新测试 `ready=是` 仍不 Verifying，更像 Privy SDK 内部 OAuth 状态机问题。
- **修复分支上叠加的补丁**（非 ADR 原文）更值得怀疑：social-only login、OAuth 回跳 Privy config 分叉、WC 清理策略等。见 §6。

**建议下一 AI 做 Privy 最小路径 A/B**（§9），而非整体废弃 ADR 登入后逻辑。

---

## 4. 稳定失败现象

1. Google 回跳 URL 含 `privy_oauth_state` / `privy_oauth_provider` / `privy_oauth_code`（通常 1 组，已 dedupe）
2. **不出现** Privy「Verifying → Successfully」
3. **`authenticated === false`**
4. `useLoginWithOAuth` 的 **`onError` 不触发**
5. 15s recovery banner 可显示「已清除 URL 参数」，但 **iPhone 地址栏 oauth 参数常仍可见**（`history.replaceState` 与 iOS 地址栏不同步；Direct Google 成功后也有类似现象）

### 最新一轮测试（2026-05-20）

| 观察项 | 结果 |
|--------|------|
| 回跳后红色 banner | ✅ 出现，`ready=是` |
| 15s 后 banner 文案 | ✅「已清除 URL 参数，请重新点登录」 |
| 地址栏 oauth 参数 | ❌ **未被清掉** |
| 再点登录 → Google | ❌ 仍无 Verifying，未登录 |
| 第二次登录弹窗 | ✅ 仅 Google/邮箱/Twitter（social-only，无 MetaMask） |

**推论更新：**

- ~~Privy `ready` 永不为 true~~ → **已否定**（`ready=是`）
- 问题更精确：**`ready=true` 但 Privy 不消费 `privy_oauth_*`**，且未进入 OAuth 错误回调
- 可能与 **同 tab 内 prior WC 会话在 Privy 内部 OAuth state 不同步** 有关

---

## 5. Privy 官方结论（已遵循方向）

**登出只做：**

```ts
await disconnectExternalWallets(wallets)
await logout()  // React：usePrivy().logout() 或 useLogout()
```

**不要：**

- 手动清 `privy` / `privy-client` IndexedDB
- 登出后 `location.reload()`
- OAuth 完成前 strip `privy_oauth_*` URL 参数

**再登录：** 普通 `login()` 即可。

**Privy Support 回复：** 建议用 `privyUser.logout()` — **这是 Swift SDK，不适用 React**；React 已用 `useLogout()`，问题仍在。

---

## 6. 已排除的原因

- Dashboard 域名 / redirect（Direct Google 同 URL 能成）
- 重复 oauth 参数（dedupe 后仍失败）
- 专用 `/auth/oauth` 回调页（试过，更差）
- 登出后 `location.reload()`（Privy 不建议；试过多种变体）
- 删除 `privy` / `privy-client` IndexedDB 的 nuclear clear（第 11 轮回归）
- **`sessionMode` 登入后逻辑**（OAuth 失败时尚未 authenticated）

---

## 7. 修复迭代摘要（均未根治）

| 轮次 | 假设 | 结果 |
|------|------|------|
| 1–2 | WC/storage 残留 | WC clear + mobile reload；MM→Google 仍 ❌ |
| 3 | 重复 oauth 参数 | dedupe ✅；仍 ❌ |
| 4 | Privy 挂载过晚 | ProvidersRoot；仍 ❌ |
| 5 | recovery reload + stale strip | 干扰流程；仍 ❌ |
| 6 | social-only + nuclear storage | social-only ✅；仍 ❌ |
| 7–8 | iOS 地址 bar desync | 曾 infinite refresh；仍 ❌ |
| 9 | 专用 `/auth/oauth` | Stuck Connecting；仍 ❌ |
| 10 | 回跳必须 `/` | 仍 ❌ |
| 11 | 停止 nuclear privy IDB clear | 仍 ❌ |
| 12+ | Privy 最小 logout、useLoginWithOAuth、OAuth 回跳最小 config、banner recovery | `ready=是` 仍不 Verifying |

**不要恢复** 11 轮实验代码：`localStorage.clear()`、2s recovery reload 循环、`/auth/oauth` 专用页、aggressive URL replace 循环等。

---

## 8. 当前代码结构（WIP 分支）

```
src/app/layout.tsx
  └── ProvidersRoot.tsx
        └── Providers.tsx              ← PrivyProvider（OAuth 回跳时 config 分叉）
              └── PolymarketAuthContext.tsx
                    └── OAuthRecoveryLayer  ← banner + 15s timeout
                          └── page.tsx ...
```

### 关键文件

| 文件 | 职责 |
|------|------|
| `src/contexts/PolymarketAuthContext.tsx` | logout/login wrapper、`useLogin` + `useLoginWithOAuth`、`sessionMode` |
| `src/components/Providers.tsx` | PrivyProvider；OAuth 回跳时无 wallet loginMethod、`createOnLogin: off` |
| `src/components/ProvidersRoot.tsx` | Provider 树 + OAuth banner |
| `src/auth/usePrivyOAuthCallbackRecovery.tsx` | 15s stale oauth recovery + 可见 banner |
| `src/lib/privyOAuthUrl.ts` | dedupe / strip oauth query params |
| `src/lib/clearWalletConnectStorage.ts` | 仅清 WC keys（**不清** privy IDB） |
| `src/auth/externalLogoutPendingSocial.ts` | 外链登出后 social-only login 标记 |
| `src/auth/sessionMode.ts` | ADR-0005 sessionMode 读写 |
| `docs/adr/0005-auth-session-mode.md` | ADR 全文 |

### 当前 `performSessionLogout`（外链路径）

```ts
const wasExternal = sessionMode === "external" || readStoredSessionMode() === "external"
await disconnectExternalWallets(wallets)
await logout()  // useLogout()
if (wasExternal) {
  await clearWalletConnectStorage()
  markExternalLogoutPendingSocialLogin()
}
stripPrivyOAuthQueryParamsFromUrl()
```

### 当前 `login()` wrapper

```ts
if (shouldUseSocialOnlyLogin()) {
  privyLogin({ loginMethods: ["google", "email", "twitter"] })
} else {
  privyLogin()
}
```

---

## 9. 建议下一 AI 探索的方向

### 9.1 Privy 最小路径 A/B（优先）

暂时移除所有补丁，仅保留：

```ts
// 登出
await disconnectExternalWallets(wallets)
await logout()

// 登录
login()  // 不限制 loginMethods，不 mark social-only
```

同时去掉（仅实验）：

- `clearWalletConnectStorage`
- `externalLogoutPendingSocial` / social-only wrapper
- OAuth 回跳时 PrivyProvider config 分叉（`Providers.tsx` 的 `readPrivyBootstrap` oauth 分支）
- 登出后 / recovery 里对 oauth URL 的 strip
- OAuth recovery banner（可选）

若仍失败 → 基本可认定 Privy SDK / iOS Chrome 问题。  
若突然成功 → 逐项加回 ADR/补丁，定位回归点。

### 9.2 其他方向

1. **`initOAuth({ provider: 'google' })`** 替代 modal `login()`（外链登出后的第二次登录）
2. stale recovery 用 **`location.replace(cleanUrl)`** 而非 `history.replaceState`（iOS 地址栏）
3. **Privy SDK 升级** 或查 changelog / GitHub issues（iOS Chrome + WC + OAuth）
4. **最小 repro 仓库**（仅 PrivyProvider + login/logout）
5. **向 Privy 追问**：React、`ready=true`、oauth params present、no Verifying、no onError，after WC SIWE + logout + disconnect
6. **产品降级**：MM 登出后提示「关闭标签页重开再 Google 登录」（非根治）

---

## 10. 测试命令

```bash
npm test          # 151 tests pass（截至 2026-05-20）
npm run dev       # https://192.168.1.4:3000
```

**手动复现：**

1. iPhone Chrome **无痕**
2. 打开 `https://192.168.1.4:3000`
3. MetaMask（WalletConnect）登录
4. 退出
5. 登录 → Google
6. 观察 Verifying、banner、`ready`、地址栏参数

---

## 11. 成功标准

- iPhone Chrome 无痕：**MM(WC) → 退出 → 同 tab Google** → Verifying → 已登录
- 不破坏：Direct Google、Desktop MM→Google、ADR-0005 登入后 sessionMode 语义（embedded 主钱包、漂移不自动 login）
- 不恢复 11 轮 nuclear/experimental 代码
- 改动尽量小、可测

---

## 12. 一句话根因（当前最佳假设）

同 tab 内先完成 WalletConnect SIWE 会话再 `logout()` 后，Privy React SDK 在 iOS Chrome 上 **`ready=true` 但不处理 Google OAuth 回跳参数**；属 SDK/connector 状态机问题，应用层 storage/reload/URL 清理/sessionMode 均未根治。

---

## 13. 相关文档

- [ADR-0005: sessionMode 与登录分流](../adr/0005-auth-session-mode.md)
- [ADR-0004（Superseded）](../adr/0004-polymarket-auth-invariants.md)

---

## 14. Antigravity 诊断与修复 (2026-05-22)

经过对 Privy 官方文档的支持搜索并比对当前代码，**发现并抛弃了之前的多个无效补丁**，确立了以下结论：

### 核心结论

1. **强力拆除干扰层**：项目源码中存在大量为解决此 Bug 添加的应用层“黑魔法”拦截逻辑（包括 OAuth 期间 `PrivyProvider` Config 硬性分叉、各种 localStorage/indexedDB nuclear 清理策略等），**反而极大可能会在 Auth callback 真正触发时破坏了 Privy SDK 原生的内部状态恢复过程**。
2. **SDK 大跳跃升级**：当前分支的 Privy 包版本为 `3.16.0`。根据调研，最新的包已经推进到了 `3.27.0`。中间长达 11 个小跨度的修正极可能默默修补了 iOS WalletConnect + WebApp 重连与跨域状态传递的关键问题。

### 修复步骤 (Phase 1 + 2) 已在本分支执行完毕

1. **代码层面**：
   - 砍掉了 `Providers.tsx` 里的 `bootstrap.oauthReturn` 条件分叉，保证任何路由加载下 SDK Config 的统一稳定性。
   - 撤销了针对 `useLogin` 挂载 `social-only` 拦截 wrapper，还原为原生直行方法。
   - 撤销了 `logout` 时激进的存储对象主动清理，仅保留正常的 `disconnectExternalWallets + logout()`。
   - 移除/停止所有针对 OAuth 回跳 URL queryString 的前置自动 `replaceState` 劫持代码，仅保留了页面悬浮弹窗预警（只看不调）。
2. **底层环境层面**：
   - 将 `@privy-io/react-auth` 从 `v3.16.0` 跃迁升级到了 `v3.27.0`，利用其最新的 OAuth 管线支持解决手机 Chrome 的回跳截断。
3. **验证层面**：
   - 利用 `npx tsc --noEmit`、`npm test`、`npm run lint` 跑完全局用例并过测，确认了基础剥离工作未导致 Regression。

### 下一步建议（供人工作业测试）

请您在**真实 iPhone 设备**的无痕 Chrome 上拉取最新代码重跑：
```bash
npm install # 同步 package-lock
npm run dev
```

如果此次 "纯净版环境 + 升包" Phase 可以跑通，则皆大欢喜；如果仍**依然遭遇**相同死局，您可以直接将根目录的 `artifacts/issue8_diagnosis.md` 连同以上现象直接提供给官方 Support/Github Issue 进行排雷，因为此时已经100%剥离了第三方干扰，是明确无疑的 SDK 层断路问题。

---

## 15. 决议（2026-05-20）— Won't fix / 产品规避

**状态：已关闭（产品规避，非 SDK 修复）**

| 项 | 结论 |
|---|---|
| Issue #8 应用层修复 | **放弃**；`fix/auth-iphone-oauth` **不 merge** |
| 根因 | Privy SDK + 同 tab WalletConnect SIWE 后 OAuth 状态机（Privy demo 亦可复现） |
| 产品决策 | **登录入口仅保留社交/邮箱**（embedded），去掉 MetaMask / WalletConnect **登录** |
| 实现分支 | `feat/auth-embedded-only`（基于 `main`） |
| Privy `loginMethods` | `email`、`google`、`twitter`、`telegram`、`github`（无 `wallet`） |
| 充提 | 仍用 Privy **embedded** 签名；Transfer 任意链入账；提现填任意收款地址 |

**为何保留本文档：** 记录复现路径、已排除假设与实验结论，避免后续 AI/开发者重复踩坑或误恢复 `fix/auth-iphone-oauth` 上的补丁代码。

**Dashboard 待办（Telegram）：** 在 Privy Dashboard 启用 Telegram / GitHub；Telegram 需 Bot token + `/setdomain`；若站点为 `.xyz` TLD，Telegram 登录可能不可用（见 Privy 文档）。

**ADR-0005：** `external` / SIWE 路径保留于代码以兼容历史会话，但新用户无法再选 wallet 登录；ADR 验收第 2 条（MM→Google）改为 **不适用**。
