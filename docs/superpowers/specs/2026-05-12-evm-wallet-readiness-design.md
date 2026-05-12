# EVM 主钱包就绪态与体验门控（设计说明）

**日期**：2026-05-12  
**状态**：可评审（实现以本页 v1 为准，Privy active wallet 对齐列为 v2）

## 1. 背景与问题

用户在 **Phantom** 等扩展中从 **EVM 账户** 切换到 **仅 Solana / 不支持当前站点的账户** 时，常出现：

- Privy `useWallets()` 与扩展 UI **短暂或持续不一致**；
- 应用曾通过 `selectPrimaryWallet` + `sticky` **避免静默跳到另一扩展**，但在「同扩展下暂时选不出 EVM 主钱包」时，`fetchBalance` **抛错**，Console 刷红，用户仍可能看到**过期的余额**；
- 后续充值、签名仍可能在不明确状态下被触发，**体验与风控**都不理想。

参考讨论结论：**优先 A（产品态 + UI 门控），B（与 Privy active wallet 显式对齐）为后续迭代，C（探测签名触发钱包原生提示）为可选增强。**

## 2. 目标与非目标

### 目标（v1）

1. **单一可观测状态**：在已登录且存在 `wallets` 时，能回答「当前是否有一条可用于 EVM 签名的主钱包（与现有 `selectPrimaryWallet` + `sticky` 规则一致）」。
2. **可预期失败**：当主钱包不可解析时，`fetchBalance` **不抛异常**；不将此类情况记为未处理 Error 刷屏。
3. **余额不误导读**：主钱包不可用时，**不展示「看似仍有效的旧余额」**（v1 将余额置为 `0.00` 并 `hasCreds = false`，与「不能签」一致）。
4. **门控敏感入口**：顶栏 **充值** 在不可用时禁用；**交易类** 在 `useTrading` 内对关键路径做守卫（避免仅禁 UI仍被其它入口调用）。

### 非目标（v1 不做）

- 不实现 **主动 `personal_sign` 探测**（C 项）；可在 v1.1 单独开任务。
- 不在 v1 内完成 **Privy active wallet API 全面对齐**（B 项）；文档中记录为 v2 调研项。
- 不解决 **Phantom 与 Privy 内部竞态** 的根因（依赖上游）；仅改善本应用侧表现。

## 3. 架构与数据流

### 3.1 就绪定义

`isEvmSignerReady` **派生**自与 `fetchBalance` 相同的输入：

- `wallets`（Privy `useWallets()`）
- `user?.wallet?.address`（首选地址）
- `stickyExternalWalletClientType`（会话内锁定外链类型）

判定：`Boolean(selectPrimaryWallet(wallets, user?.wallet?.address, { stickyClientType: stickyExternalWalletClientType }))`

与 `fetchBalance` 内实际选用的钱包 **同源**，避免两套逻辑漂移。

### 3.2 fetchBalance 行为变更

| 场景 | v1 行为 |
|------|---------|
| 能解析出 `wallet` | 与现网一致：更新 `walletAddress` / `proxy`、拉 CLOB / 链上余额 |
| **不能**解析出 `wallet` | **不** `throw`；`setHasCreds(false)`；`setUsdcBalance("0.00")`；`return false` |

不在此分支清空 `walletAddress` 字符串（避免顶栏展示与 `displayIdentifier` 剧烈抖动）；**以 `isEvmSignerReady` 为门控真值**。

### 3.3 UI

- **顶栏**：已登录且 `!isEvmSignerReady` 时展示 **简短说明条**（i18n），并 **禁用充值按钮**（可点击区域 `pointer-events-none` 或等价）。
- **交易**：在 `useTrading` 内对依赖钱包签名的关键入口若 `!isEvmSignerReady` 则 **提前返回**并给出用户可见错误（沿用现有 `txStep` / 文案机制或简短 toast 文案，以现有模式为准）。

## 4. 测试策略（TDD 竖切）

1. **纯函数层**：已有 `selectPrimaryWallet` 单测覆盖 sticky；本需求不新增重复封装则**不强制**新文件，可选增加「就绪与选主一致」的注释或一条集成断言。
2. **回归**：全量 `vitest run` 通过；若有 `DepositDrawer` / `TopHeader` 的 mock，为 `usePolymarketAuth` 补充 `isEvmSignerReady: true` 默认值，避免破坏现有用例。

## 5. v2  backlog（不在本 MR 范围）

- 对照 Privy 文档「多钱包时 set active wallet」与当前 `@privy-io/react-auth` 版本 API，将 **显式 active** 与 `sticky` 策略合并或替代。
- 可选：在仍能 `getEthereumProvider` 时做一次 **轻量 EVM 探测**以触发 Phantom 原生提示（C）。

## 6. 自检

- [x] 无 TBD 占位  
- [x] v1 范围与 v2 拆分明确  
- [x] 与现有 `sticky` 行为兼容且不重复定义选主规则  

## 7. 实现记录（v1 落地）

- 代码：`PolymarketAuthContext` 派生 `isEvmSignerReady`；`fetchBalance` 无主钱包时不抛错并清零余额与 creds 标志；`TopHeader` 提示条与禁用充值；`useTrading` 对下单、赎回、撤单、市价卖、限价卖入口使用 `guardEvmSignerOrShowError`。
- 测试：`TopHeader.test.tsx` 覆盖不可用提示；`DepositDrawer.test` mock 补充 `isEvmSignerReady: true`。

## 8. B 项落地（Privy active wallet 对齐）

- SDK：`@privy-io/react-auth` 3.16 提供 **`useActiveWallet`**（`wallet` + **`setActiveWallet`**）。
- 实现：`PolymarketAuthProvider` 内 `useEffect` 将 **`selectPrimaryWallet`（含 sticky）** 得到的 `desired` 与 **`privyActiveWallet?.address`** 比较；若 **`shouldSyncPrivyActiveWallet`** 为真则 **`setActiveWallet(desired)`**（`desired` 必须来自当前 `wallets` 数组引用）。
- 纯函数与单测：`src/lib/privyActiveWalletSync.ts` + `privyActiveWalletSync.test.ts`。
- 门控与拉余额仍以 **`isEvmSignerReady` / `fetchBalance` 内同一套 `selectPrimaryWallet`** 为真值来源；B 为 **侧向同步**，减少与连接器内部 active 漂移，而非替换 A 的判定式。
