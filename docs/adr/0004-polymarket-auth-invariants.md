# ADR-0004: Polymarket 认证与余额不变量



- 状态：**Partially Superseded**（§3 登录/漂移见 [ADR-0005](./0005-auth-session-mode.md)；§1 余额于 2026-05-28 修订以纳入 pUSD）

- 日期：2026-05-14

- 修订：2026-05-28（pUSD collateral 与 balance sync）



## 背景



`PolymarketAuthContext` 同时承担 Privy 会话、钱包选主、CLOB 凭证、余额轮询与外链账户漂移检测。历史上曾出现 derive 400 误报成功、顶栏余额长期为 0、登出后抽屉未关等问题。需要把关键行为写成不变量，便于拆分模块与回归测试。



> **废止说明（2026-05-19）**：§3 外链漂移「自动 logout + 自动 login」及与之耦合的登录分流已由 **ADR-0005** 取代。



## 决策



### 1. 顶栏余额数据源（2026-05-28 修订，2026-05-28 二次修订）



Polymarket 交易 collateral 为 **pUSD**（6 decimals）。顶栏展示 **可下单余额**，必须与 CLOB 一致，禁止「链上有钱、CLOB 为 0 仍展示非零」。



**官方路径（`src/auth/collateralBalance.ts`）：**



1. 有效 CLOB creds 时：`updateBalanceAllowance({ asset_type: COLLATERAL })` → `getBalanceAllowance(COLLATERAL)`（proxy Safe funder，`signatureType = GNOSIS_SAFE`）

2. 若 CLOB=0 且 proxy 上仍有 **legacy USDC.e**：经 relayer 对 Safe 执行 **Collateral Onramp**（`approve` + `wrap` USDC.e→pUSD，合约 `0x93070…B8ee`），并 batch **pUSD allowance** 至 Exchange/CTF

3. wrap 后再次 `updateBalanceAllowance` → `getBalanceAllowance`

4. **展示值 = 上述 sync 后的 CLOB collateral atomic**（格式化为两位小数 USD）；未 wrap 成功的 USDC.e **不计入**顶栏



实现：`ensureProxyCollateralSynced`（余额拉取与下单预检共用）；`readUsdcBalanceDisplay` 仅格式化 CLOB 结果。`useBalanceSync` / `useTrading` 均调用同一 ensure 路径。



### 2. CLOB API Key



- 仅当 `key`、`secret`、`passphrase` 均为非空字符串时视为有效（`isValidApiKeyCreds`）。

- derive 返回 400 空壳对象不算成功；应尝试 create 或放弃 CLOB 路径。

- 每会话仅尝试一次 derive/create 组合（`hasAttemptedDerive`）。

- 逻辑集中在 `src/auth/resolveClobApiKeyCreds.ts`，Provider 只调用其公开接口。



### 3. 外链账户漂移（已由 ADR-0005 取代）



- 仅 `sessionMode === 'external'` 时监听外链 `accountsChanged`；漂移后 logout + 手动重登提示。详见 ADR-0005 §4。



### 4. 登出与会话遮罩



- 清除 creds 缓存、sticky、余额相关状态。

- `sessionEpoch` 在 `performSessionLogout` 时递增；顶栏抽屉用 `useCloseOnSessionEpoch` 重置本地打开态。

- 交易终端用 `useDismissOverlayOnSessionEnd`：打开时绑定 epoch，epoch 变化则 `onCancel`。



## 非目标



- 不在本 ADR 规定 DepositDrawer 内部步骤机细节（见充值相关 ADR）。

- 不在此 ADR 覆盖 deposit wallet（`POLY_1271` / signature type 3）完整 onboarding；embedded Safe 用户沿用 type 2。



## 影响



- legacy Safe 仅持有 USDC.e 时，顶栏可正确展示链上余额，不再因 CLOB 返回 0 而长期显示 $0.00。

- 入金或 approve 后应依赖 `updateBalanceAllowance` 刷新 CLOB 缓存；链上读数作为 legacy 与 sync 失败时的兜底。

- Auth 模块可继续拆为 `useBalanceSync`、`useExternalAccountDrift` 等，但不得违反上述不变量。

