# ADR-0007: 资金 Tab 与 Neon 充提流水

- 状态：Accepted
- 日期：2026-06-01
- 相关：[ADR-0003](./0003-transfer-bridge-status-row-order.md)（Bridge status 行序）、[ADR-0006](./0006-deposit-wallet-clob-v2.md)（Deposit Wallet / proxy）

## 背景

「我的」页 **明细** Tab 仅展示 Polymarket Data API `activity` 中的交易活动（`TRADE` / `REDEEM`），不包含 Bridge 充值 / 提现。

Bridge 行为经实测与文档确认：

| 能力 | 行为 |
|------|------|
| **`POST /deposit`** | 请求体仅需用户 **Deposit Wallet（`proxyAddress`）**；返回的 **evm / svm / tron / btc** 桥接入账地址对该 proxy **稳定**（与钱包绑定）。 |
| **`GET /status/{address}`** | 按 **桥接地址** 查询流水，非 proxy；同一充值地址会 **累积** 历史 `transactions`（见 ADR-0003 行序约定）。 |
| **`POST /withdraw`** | 需 **`address` + `toChainId` + `toTokenAddress` + `recipientAddr`**；返回桥接地址形态与 deposit 类似。 |
| **提现四元组** | 四参数 **任一变化** → 返回的 evm/svm/tron/btc **均变化**；无法凭单一 proxy 一次拉全所有提现历史。 |

产品需求：

- 在 **明细** 之后新增 **资金 / Funds** Tab；列表 **仅展示** 充值 / 提现、**美元金额**、**时间**。
- 客服需查询 **完整充提记录**（链、代币、数量、桥接地址、收款地址、原始 Bridge payload 等）。
- 打开资金 Tab **不应** 批量调用 Bridge（避免多次 `deposit` + 多路 `status` + 多路 `withdraw`）。
- 持久化使用 **Neon（Postgres）**（Vercel Marketplace）；**禁止** 依赖仓库内 SQLite 文件或可写本地盘（Serverless 不可靠）。
- **CLOB API 密钥** 不得迁入数据库（延续现有 localStorage 策略，本 ADR 不改动鉴权存储）。

## 决策

### 1. 产品边界

- **明细 Tab**：不改动数据源与展示逻辑。
- **资金 Tab**：`movement_type` 为 `deposit` | `withdraw` 的流水；UI **不展示** 链、代币、源/目标地址、收款人。
- Tab 顺序：`stats` → `active` → `orders` → `history` → `transactions` → **`funds`**。
- i18n：中文 **资金**，英文 **Funds**。

### 2. 用户身份与鉴权

- 服务端读写以 **`privy_user_id`** 为业务主键（Privy 登录态校验后方可写库 / 读库）。
- 同时维护 **`proxy_address`（Deposit Wallet）** 与 **`signer_address`（EOA）** 映射，供 Bridge 调用与客服反查。
- 客户端 **不得** 仅凭自报的 `proxyAddress` 读写他人流水。

### 3. Neon 表职责（四表）

| 表 | 职责 |
|----|------|
| **`user_wallets`** | 当前用户 ↔ EOA ↔ Deposit Wallet；可选 `session_mode`；登录或金库解析成功后 UPSERT。 |
| **`user_deposit_bridges`** | **充值**侧：每用户（或每 proxy）**一行**，缓存 `POST /deposit` 的 evm/svm/tron/btc（对同一 proxy 稳定）；用于补单、对账，非 Tab 列表必需。 |
| **`withdraw_bridge_destinations`** | **提现**侧：按 `(privy_user_id, to_chain_id, to_token_address, recipient_addr)` **去重**；可选缓存 `bridge_evm`；用于漏记时按地址 `status` 补拉。 |
| **`funds_movements`** | **充提统一流水**（客服全量 + 资金 Tab 列表源）；见 §4。 |

充值「目的地索引」与提现索引 **语义不同**：前者是 **一套固定四链地址**；后者是 **多组四元组**（因 `recipientAddr` 等变化）。

### 4. 统一流水表 `funds_movements`

- **一张表**，`movement_type` 区分 `deposit` | `withdraw`（不单拆 `deposits` / `withdrawals` 业务表，便于客服按时间查全量资金变动）。
- **Tab 列表 API** 仅返回：`movement_type`、`amount_usd`、`occurred_at`（及可选 `status` 角标）。
- **客服 / 对账** 使用完整列，建议包含（实现时可微调命名）：
  - 身份：`privy_user_id`、`proxy_address`
  - 金额：`amount_usd`、`from_amount_base_unit`、`token_decimals`、代币符号等
  - 链：`from_chain_id`、`to_chain_id`、`from_token_address`、`to_token_address`
  - 地址：`bridge_status_address`（轮询用的桥接 evm 等）、`recipient_addr`（提现）、`source_address`（充值源钱包，**可空**——Bridge 常不提供）
  - 状态：`status`（如 `completed` / `failed` / `processing`）
  - 关联：`tx_hash`、`idempotency_key`（幂等，如 `tx_hash` + `bridge_status_address` + `status`）
  - 审计：`raw_bridge_transaction`（JSONB，原始 status 行或等价 payload）
  - 时间：`occurred_at`、`created_at`
- **幂等写入**：同一笔 Bridge 终态不得重复插入。

### 5. 数据流：库为主，Bridge 为辅

```text
充/提进行中（抽屉）     → 现有 Bridge 轮询（不变）
终态 COMPLETED / FAILED → 服务端写入 funds_movements（+ 更新索引表）
资金 Tab 打开           → 仅 SELECT funds_movements（精简 DTO），不批量 Bridge
漏单 / 客服对账（P2）   → 凭索引表调 Bridge status 补写（幂等）
```

- **充值完成**：`transferBridgeComplete` / `depositBridgeComplete` 上升沿触发写入。
- **提现完成**：`useBridgeStatus` 判定 `COMPLETED`（建议 **FAILED** 亦写入）触发写入，并 UPSERT `withdraw_bridge_destinations`。
- **`amount_usd`**：优先采用应用内用户确认金额（提现表单、Connected 确认页）；链上 `fromAmountBaseUnit` 作对账字段并存。

### 6. 部署与访问

- `DATABASE_URL` **仅** 存在于 Vercel / 本地服务端环境变量，不暴露客户端。
- 数据访问经 **Next.js API Routes**（或 Server Actions），不直连浏览器。

## 非目标

- 不将 Polymarket `activity` / 持仓镜像到 Neon 替代 Data API。
- 不在此 ADR 实现权益曲线、自建排行榜、跨设备语言偏好（见实施阶段 P3）。
- 不保证功能上线 **之前** 的历史充提自动入库（可选 P2 一次性 Bridge 补导脚本）。
- 不在资金 Tab 展示收款地址或充值来源地址（客服在库内查看）。

## 权衡

| 选择 | 优点 | 代价 |
|------|------|------|
| 统一 `funds_movements` | Tab 一次查询混排；客服单表 | 部分列对 deposit/withdraw 可空 |
| Tab 只读库 | 打开快、无 Bridge 风暴 | 须保证完成时写入可靠；P2 补同步 |
| 提现四元组索引表 | 可拉全多收款人历史 | 表与写入逻辑略复杂 |
| 充值一行四链缓存 | 与稳定 deposit 地址一致 | 与提现索引模型不同，需文档区分 |

## 实施阶段

| 阶段 | 目标 | 交付物（摘要） |
|------|------|----------------|
| **P0** | 数据底座 + 服务端 API | Neon 迁移四表；Privy 校验；完成态写入 `funds_movements`；UPSERT 三张索引/映射表；`GET` 精简列表 API |
| **P1** | 产品闭环 | Profile **资金** Tab；i18n；充值/提现完成 hook 调 P0 API；**不改动明细 Tab** |
| **P2** | 可靠性与客服 | Bridge 补同步（幂等）；失败/漏单策略；客服全量查询（API 或运维文档）；更新 `requirement.md` / `CONTEXT.md` |
| **P3** | 扩展 | `equity_snapshots` 等（PRD §3.5.6）；自建排行榜；`user_preferences` 等——与 P0 表解耦，单独排期 |

执行跟踪见 `docs/plans/issues-0007-funds-tab-neon.md`（Epic + P0–P3 Issues）。

## 影响

- `requirement.md` §3.5：增加 **资金** Tab 说明（P1 实施时同步）。
- `CONTEXT.md`：增加 **资金 Tab**、**资金流水（funds_movements）** 等术语（P2 亦可）。
- `ARCHITECTURE.md`：资金模块与 Neon 依赖（实现后补 API 路径指针）。
- 新代码预期位置：`src/app/api/funds/`（或等价）、`src/db/`（或 `src/lib/db/`）、`src/components/pages/profile/ProfileFunds.tsx`。

## 后续动作

- 在 Neon 项目 `crazyfox` 配置 `DATABASE_URL` 并跑迁移。
- 选定 ORM / 查询层（如 Drizzle 或 `@neondatabase/serverless`）。
- 创建 GitHub Issues（Epic + P0–P3），标签见 `docs/plans/issues-0007-funds-tab-neon.md`。
