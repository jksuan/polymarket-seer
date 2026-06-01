# ADR-0006: CLOB V2 与 Deposit Wallet 交易金库

- 状态：Accepted
- 日期：2026-05-31
- 取代：[ADR-0004](./0004-polymarket-auth-invariants.md) §1 中 Safe / GNOSIS_SAFE 相关表述；工程上移除 `ensureSafeDeployed` / `safeRelayExecutor` 路径

## 背景

2026-05 起 Polymarket 新 Builder / API 集成推荐使用 **Deposit Wallet**（CLOB `signatureType = 3`，`POLY_1271`）配合 **CLOB V2 订单**。本项目在迁移过程中遇到：

- 旧 `@polymarket/clob-client` 签 V1 订单 → `order_version_mismatch`
- 以 Gnosis Safe 作 maker → `maker address not allowed, please use the deposit wallet flow`
- V2 Exchange 与 Neg Risk 市场需额外 pUSD / ERC1155 授权

需要统一交易金库模型、CLOB 客户端与 relayer 批次，并保持 Privy EOA 签名者不变。

## 决策

### 1. 钱包分层

| 角色 | 说明 | 是否变化 |
|------|------|----------|
| **Signer EOA** | Privy Embedded 钱包，用户签名 CLOB 与 relayer 批次 | 不变 |
| **Trading Vault（funder）** | Polymarket **Deposit Wallet**，链上推导地址；UI 仍称「智能金库」 | 自 Safe 迁移 |
| **Bridge 临时地址** | 充值 / 提现时 Bridge 分配的入账地址 | 不变 |

- `proxyAddress` 在应用内指 **Deposit Wallet 地址**（`resolveTradingVault` → `deriveDepositWalletAddress()`）。
- 旧 Safe 内资产 **不会自动迁移**；缓存地址与推导不一致时以推导为准。

### 2. CLOB 客户端

- 依赖 **`@polymarket/clob-client-v2`**，统一经 `src/lib/clobClientFactory.ts` 的 `createClobClient()` 创建。
- 默认 `signatureType = POLY_1271`（type 3），`funderAddress = Deposit Wallet`。
- 可选 env `NEXT_PUBLIC_POLY_BUILDER_CODE`（bytes32 builder code）用于 V2 订单归因。
- 订单成功/失败解析见 `src/lib/clobOrderResponse.ts`。

### 3. Relayer 与金库模块

- **`@polymarket/builder-relayer-client` ^0.0.10**：`deployDepositWallet()`、`executeDepositWalletBatch()`。
- 抽象层 `src/auth/vault/`：
  - `resolveTradingVault` — 解析 funder 与 signatureType
  - `depositVaultOps` — 部署、分块授权、批次执行
  - `depositRelayExecutor` — gasless 批次封装
- 部署检查：`ensureTradingVaultDeployed`（提现、余额 sync、下单前共用）。

### 4. 交易授权（下注 / 卖出）

**pUSD（ERC20 approve）** — 买入前：

- 标准市场：`CTF_EXCHANGE_V2`
- Neg Risk：`NEG_RISK_ADAPTER` + `NEG_RISK_CTF_EXCHANGE_V2`
- 全量清单见 `TRADING_APPROVAL_SPENDERS`（`collateralBalance.ts`）
- 经 `ensureDepositTradingApprovals` 仅补缺失 spender，分块提交（deadline 600s，每批 ≤4 笔）

**Outcome 代币（ERC1155 setApprovalForAll）** — 卖出前（下注时预授权）：

- 标准市场：`CTF_EXCHANGE_V2`
- Neg Risk：`NEG_RISK_ADAPTER` + `NEG_RISK_CTF_EXCHANGE_V2`
- 经 `ensureDepositErc1155Approvals` 补缺失 operator
- 卖出前另调用 `updateBalanceAllowance({ asset_type: CONDITIONAL, token_id })` 刷新 CLOB 缓存

### 5. 余额 sync（延续 ADR-0004 不变量）

- 顶栏与下单预检仍展示 **CLOB sync 后可交易 pUSD**，禁止链上有钱、CLOB 为 0 仍展示非零。
- funder 改为 **Deposit Wallet**；legacy USDC.e wrap 与 pUSD approve 经 **Deposit Wallet batch** 执行。
- 实现仍集中在 `ensureProxyCollateralSynced` + `useBalanceSync` / `useTrading`。

### 6. 提现

- `executePusdWithdraw`：`ensureTradingVaultDeployed` → Deposit Wallet batch 转 pUSD 至 Bridge 临时地址。
- 不再使用 `ensureSafeDeployed` / Safe `RelayerTxType.SAFE` 路径。

## 非目标

- 不支持 polymarket.com 老用户 Safe / Proxy（type 1/2）自动迁移；本应用 embedded 新用户统一 type 3。
- 不在此 ADR 规定 DepositDrawer / WithdrawDrawer 逐步 UI 细节。

## 影响

- `ARCHITECTURE.md`、`CONTEXT.md`、`requirement.md` 需同步术语与流程。
- ADR-0004 §1 中 Safe/GNOSIS_SAFE 表述以本文为准；§2–§4（API Key、登出）仍有效。
- 合约常量见 `src/lib/constants.ts`（含 `CTF_EXCHANGE_V2`、`NEG_RISK_CTF_EXCHANGE_V2`、`NEG_RISK_ADAPTER`）。
