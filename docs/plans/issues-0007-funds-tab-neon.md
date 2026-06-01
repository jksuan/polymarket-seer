# Issues 文案：资金 Tab + Neon（ADR-0007）

> 仓库：`jksuan/polymarket-seer`  
> 设计依据：[ADR-0007](../adr/0007-funds-tab-neon-ledger.md)  
> 创建前请确认标签策略：`docs/agents/triage-labels.md`（建议每个 issue **一个 category + 一个 state**）。

**已创建（2026-06-01）**

| Issue | 链接 |
|-------|------|
| Epic | https://github.com/jksuan/polymarket-seer/issues/10 |
| P0 | https://github.com/jksuan/polymarket-seer/issues/11 |
| P1 | https://github.com/jksuan/polymarket-seer/issues/12 |
| P2 | https://github.com/jksuan/polymarket-seer/issues/13 |
| P3 | https://github.com/jksuan/polymarket-seer/issues/14 |

---

## Epic（母 Issue）

**标题：** `[Epic] 资金 Tab + Neon 充提流水（ADR-0007）`

**标签建议：** `enhancement`（category）

**正文：**

```markdown
## 背景

在「我的」页 **明细** 之后新增 **资金 / Funds** Tab，展示充值与提现（仅美元金额 + 时间）。完整字段写入 Neon 供客服查询；打开 Tab 时只读数据库，不批量请求 Bridge。

架构决策见 [ADR-0007](https://github.com/jksuan/polymarket-seer/blob/main/docs/adr/0007-funds-tab-neon-ledger.md)。

## 子任务

- [ ] #___ P0 — Neon 四表 + 服务端 API + 完成态写入
- [ ] #___ P1 — 资金 Tab UI + 接入写入/读库
- [ ] #___ P2 — Bridge 补同步 + 客服全量查询
- [ ] #___ P3 — 权益曲线等扩展（backlog）

（创建子 issue 后把编号填入上方 checkbox。）

## 验收（Epic 关闭条件）

- P0、P1 完成且可在资金 Tab 看到本账号充提记录（换设备/清 sessionStorage 后仍可从 Neon 读取）
- **明细** Tab 行为无回归
- ADR-0007 与实现一致
```

---

## P0 — Neon 数据底座与服务端 API

**标题：** `[P0][ADR-0007] Neon 四表迁移与资金流水 API`

**标签建议：** `enhancement` + `ready-for-agent`

**正文：**

```markdown
## 目标

实现 ADR-0007 P0：Neon（项目 `crazyfox`）schema、Privy 鉴权后的服务端读写、充提完成态入库；**不包含** 资金 Tab UI。

## 范围

### 数据库（迁移进仓库）

1. `user_wallets` — `privy_user_id` PK；`signer_address`；`proxy_address`；可选 `session_mode`；`updated_at`
2. `user_deposit_bridges` — 每用户/proxy 一行；`evm` / `svm` / `tron` / `btc`；`updated_at`
3. `withdraw_bridge_destinations` — 唯一约束 `(privy_user_id, to_chain_id, to_token_address, recipient_addr)`；可选 `bridge_evm`
4. `funds_movements` — `movement_type` deposit|withdraw；全量客服字段 + `raw_bridge_transaction` JSONB；`idempotency_key` 唯一

### API（示例路径，可调整）

- 登录/金库就绪后 UPSERT `user_wallets`
- 记录/更新 `user_deposit_bridges`、`withdraw_bridge_destinations`
- `POST` 写入 `funds_movements`（幂等；至少 `completed`，建议含 `failed`）
- `GET` 资金列表：仅返回 `movement_type`、`amount_usd`、`occurred_at`（+ 可选 `status`）

### 接入点（逻辑约定，可与 P1 联调）

- 充值：`transferBridgeComplete` / `depositBridgeComplete` 终态
- 提现：Bridge `COMPLETED`（建议 `FAILED` 亦写）

### 工程

- `DATABASE_URL` 仅服务端；不将 CLOB secret 入库
- 写/读必须校验 Privy 会话，绑定 `privy_user_id`

## 不在范围

- Profile 资金 Tab UI（P1）
- 打开 Tab 时 Bridge 批量 status（明确不做）
- P2 补同步、P3 权益曲线

## 验收标准

- [ ] 迁移可在 Neon `crazyfox` 执行成功
- [ ] 本地/预览环境能 UPSERT `user_wallets` 与写入一条测试 `funds_movements`
- [ ] 重复提交同一 `idempotency_key` 不产生 duplicate
- [ ] `GET` 列表仅返回 ADR 约定的精简字段
- [ ] 未认证请求无法读写他人流水

## 参考

- `docs/adr/0007-funds-tab-neon-ledger.md`
```

---

## P1 — 资金 Tab 产品闭环

**标题：** `[P1][ADR-0007] 我的页资金 Tab（只读 Neon）`

**标签建议：** `enhancement` + `ready-for-agent`

**依赖：** P0 已合并或可用的 API

**正文：**

```markdown
## 目标

实现 ADR-0007 P1：在 **明细** Tab 之后新增 **资金 / Funds** Tab；列表仅展示充值/提现、美元金额、时间；数据来自 P0 `GET` API，**打开 Tab 不请求 Bridge**。

## 范围

### UI

- `ProfilePage`：新 Tab `funds`，顺序在 `transactions` 之后；角标为流水条数（可选）
- `ProfileFunds.tsx`（或等价）：骨架屏、空态；行样式可与 `ProfileTransactions` 协调（标签色区分充/提）
- **不修改** `ProfileTransactions` / `useProfileTransactions` / 明细计数逻辑

### i18n

- `profile.funds`（资金 / Funds）
- `txDeposit`、`txWithdraw`、空态文案等（`zh.ts` / `en.ts`）

### 写入

- 充值/提现完成时调用 P0 API 写入 `funds_movements` 并更新索引表
- 登录/金库解析成功：UPSERT `user_wallets`
- 获得 deposit 地址：UPSERT `user_deposit_bridges`

### 读取

- 进入资金 Tab：`GET` 精简列表，按 `occurred_at` 倒序

## 不在范围

- P2 Bridge 补同步
- 列表展示链/地址/代币
- requirement.md 全文重构（可在本 PR 顺带改 §3.5 资金 Tab 一段）

## 验收标准

- [ ] 已登录用户完成至少一笔充值、一笔提现后，资金 Tab 可见两条（金额+时间）
- [ ] 刷新页面后列表仍存在（证明来自 Neon 而非仅内存）
- [ ] 明细 Tab 展示与条数与改动前一致
- [ ] 打开资金 Tab 时 Network 无批量 `/api/bridge/status` 或多次 withdraw/deposit（仅 P0 约定 API）

## 参考

- `docs/adr/0007-funds-tab-neon-ledger.md`
```

---

## P2 — 补同步与客服查询

**标题：** `[P2][ADR-0007] 资金流水补同步与客服全量查询`

**标签建议：** `enhancement` + `ready-for-agent`

**依赖：** P1 已上线或可在 preview 验证

**正文：**

```markdown
## 目标

实现 ADR-0007 P2：降低漏单概率；支持客服查询 `funds_movements` 全字段；文档与 ADR 对齐。

## 范围

### Bridge 补同步（幂等）

- 根据 `user_deposit_bridges` 对充值桥接地址调 `status`，补写缺失的 `funds_movements`
- 根据 `withdraw_bridge_destinations` 对每组四元组 `POST /withdraw` + `status`，补写缺失提现记录
- 触发策略（择一或组合）：手动刷新、距上次同步 >N 小时、仅内部运维入口——**用户资金 Tab 默认仍只读库**

### 数据质量

- 明确 `failed` / 可选 `processing` 在库内与 Tab 角标策略
- `amount_usd` 与链上 base unit 并存，供客服对账

### 客服查询

- 内部 API 或 documented SQL：按 `privy_user_id` / `proxy_address` / 时间范围查全列 + JSONB
- 访问控制：仅服务端/运维，不暴露给前端列表 API

### 文档

- 更新 `requirement.md` §3.5（资金 Tab）
- `CONTEXT.md` 增加资金 Tab / funds_movements 等术语
- `ARCHITECTURE.md` 增加 Neon 与 `/api/funds` 指针（若 P0/P1 路径已固定）

## 不在范围

- P3 权益曲线、排行榜

## 验收标准

- [ ] 故意跳过 P1 写入、仅保留 Bridge 终态时，补同步可幂等填入 `funds_movements`
- [ ] 客服路径可查到 `recipient_addr`、`raw_bridge_transaction` 等全字段
- [ ] 资金 Tab 默认路径仍不批量 Bridge

## 参考

- `docs/adr/0007-funds-tab-neon-ledger.md`
```

---

## P3 — 扩展能力（Backlog）

**标题：** `[P3][ADR-0007] 资金扩展：权益曲线与相关能力（Backlog）`

**标签建议：** `enhancement` + `ready-for-human`（或仅 `enhancement`，待产品排期）

**正文：**

```markdown
## 目标

ADR-0007 P3：在资金流水（P0–P2）稳定后，按产品优先级扩展 **非 Bridge Tab** 能力。

## 候选范围（分项立项，不必一次做完）

- **权益曲线 / 资金快照**：`equity_snapshots(privy_user_id, snapshot_at, value_usd)`，对齐 `requirement.md` §3.5.6
- **自建排行榜**（若与 Polymarket 榜分离）
- **`user_preferences`**：跨设备语言等（优先级低）

## 约束

- 不替代 `funds_movements` 作为充提历史来源
- 新表与 P0 schema 解耦，单独迁移

## 验收标准

- [ ] 产品确认首期 P3 子项（例如仅权益曲线）
- [ ] 子项各有独立验收与文档更新

## 参考

- `docs/adr/0007-funds-tab-neon-ledger.md`
- `requirement.md` §3.5.6
```

---

## 创建命令示例（维护者本地执行）

```bash
# Epic（先创建，记下编号后再建子 issue 并回填 Epic 正文中的 #___）
gh issue create --repo jksuan/polymarket-seer \
  --title "[Epic] 资金 Tab + Neon 充提流水（ADR-0007）" \
  --label "enhancement" \
  --body-file docs/plans/issues-0007-funds-tab-neon-epic.md

# 若将各 issue 正文拆成独立文件，可对 P0–P3 分别 --body-file
```

> 说明：上方 Epic 正文在本文 **Epic** 小节；P0–P3 正文在对应小节。`gh issue create` 不支持一次创建带子任务层级，需创建 Epic 后把子 issue 编号手动链回 Epic 描述或评论。
