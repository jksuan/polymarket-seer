# ADR-0004: Polymarket 认证与余额不变量

- 状态：**Superseded**（登录/漂移见 [ADR-0005](./0005-auth-session-mode.md)）
- 日期：2026-05-14

## 背景

`PolymarketAuthContext` 同时承担 Privy 会话、钱包选主、CLOB 凭证、余额轮询与外链账户漂移检测。历史上曾出现 derive 400 误报成功、顶栏余额长期为 0、登出后抽屉未关等问题。需要把关键行为写成不变量，便于拆分模块与回归测试。

> **废止说明（2026-05-19）**：§3 外链漂移「自动 logout + 自动 login」及与之耦合的登录分流已由 **ADR-0005** 取代。§1、§2、§4 余额/CLOB/会话遮罩不变量仍有效，并在 ADR-0005 §7 中显式继承。

## 决策

1. **顶栏余额数据源**
   - 有效 CLOB creds 时：优先 `getBalanceAllowance`（COLLATERAL，经 proxy Safe）。
   - 否则：链上读取 **proxy Safe** 地址上的 USDC.e（非 EOA）。
2. **CLOB API Key**
   - 仅当 `key`、`secret`、`passphrase` 均为非空字符串时视为有效（`isValidApiKeyCreds`）。
   - derive 返回 400 空壳对象不算成功；应尝试 create 或放弃 CLOB 路径。
   - 每会话仅尝试一次 derive/create 组合（`hasAttemptedDerive`）。
   - 逻辑集中在 `src/auth/resolveClobApiKeyCreds.ts`，Provider 只调用其公开接口。
3. **外链账户漂移**
   - 仅对外链钱包监听 `accountsChanged`，300ms 防抖。
   - 会话锚点：`user.wallet.address`（小写比较）。
   - 漂移后：自动 logout，在未登录态自动 login（与 Polymarket 官网对齐）；重登期间 `suppressAccountDrift` 抑制重复触发。
4. **登出与会话遮罩**
   - 清除 creds 缓存、sticky、余额相关状态。
   - `sessionEpoch` 在 `performSessionLogout` 时递增；顶栏抽屉用 `useCloseOnSessionEpoch` 重置本地打开态，可见性由 `resolveOverlayOpen` 与登录态共同决定。
   - 交易终端用 `useDismissOverlayOnSessionEnd`：打开时绑定 epoch，epoch 变化则 `onCancel`。

## 非目标

- 不在本 ADR 定义 pUSD 与 USDC.e 的统一展示口径（后续单独决策）。
- 不规定 DepositDrawer 内部步骤机细节（见充值相关 ADR）。

## 影响

- 新账户入账后，即使 CLOB derive 失败，仍可能通过链上 proxy USDC.e 显示顶栏余额。
- Auth 模块可继续拆为 `useBalanceSync`、`useExternalAccountDrift` 等，但不得违反上述不变量。
