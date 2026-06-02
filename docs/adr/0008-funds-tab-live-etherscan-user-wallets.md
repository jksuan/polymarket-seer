# ADR-0008: 资金 Tab live 链上列表与 Neon 用户登记

- 状态：Accepted
- 日期：2026-06-02
- 取代：[ADR-0007](./0007-funds-tab-neon-ledger.md) 的 Bridge→Neon 流水实施路径（0007 文档保留作历史）

## 背景

ADR-0007 曾规划 Bridge 终态写入 Neon `funds_movements`，并辅以索引表与 P2 补同步。产品方向调整为：

- Neon **仅登记登录用户**（`user_wallets`），用于统计与 proxy 映射；
- **不在库内**持久化充提流水；
- Profile **资金 Tab** 打开时，服务端拉取 Polygon proxy 的 Etherscan `tokentx`，分类后返回列表（**不入库**）；
- 充提抽屉仍走现有 Bridge 轮询，**不写 Neon**。

## 决策

### 1. Neon 表职责

| 表 | 写入 |
|----|------|
| **`user_wallets`** | 是 — 登录且解析出 proxy 后 UPSERT |
| **`user_deposit_bridges`** | 否 — migration 保留 |
| **`withdraw_bridge_destinations`** | 否 — migration 保留 |
| **`funds_movements`** | 否 — migration 保留 |

### 2. API

| 路由 | 用途 |
|------|------|
| `PUT /api/funds/wallet` | Privy 鉴权，UPSERT `user_wallets` |
| `GET /api/funds/movements-live` | Privy 鉴权 + proxy 归属校验；Etherscan V2 `tokentx` → 精简 DTO |

环境变量：`DATABASE_URL`、`PRIVY_APP_SECRET`、`ETHERSCAN_API_KEY`（均仅服务端）。

### 3. 资金 Tab

- Tab 顺序：`stats` → … → `transactions` → **`funds`**
- **无**刷新按钮；激活 Tab 时请求 `movements-live`
- UI 仅展示：充值/提现标签、美元金额、时间
- 分类：proxy 上 **pUSD / USDC.e** 转入/转出；**优先级**：① 顶层 `methodId` 排除撮合（如 `matchOrders` / `0x3c2b4399`，整笔 tx hash 忽略）→ ② `from`/`to` 相对 proxy 判充提 → ③ 对手方 Exchange / CTF / Onramp 等 **denylist 兜底**

### 4. 明确不做

- Bridge `GET /status` 写入 Neon
- `POST /api/funds/sync`、客服 admin API
- 抽屉完成写库、失败态入库、跨链打款时刻对齐

## 影响

- 新代码：`src/lib/funds/onchain/`、`src/app/api/funds/`、`src/hooks/useUserWalletSync.ts`
- `requirement.md` / `CONTEXT.md` / `ARCHITECTURE.md` 已同步资金 Tab 数据源与 Neon 职责
- 合入 `main` 前须 revert `1dfd1aa`、`6da21c9`（ADR-0007 旧实现），避免双轨并存
