# Funds API（P0 / ADR-0007）

所有路由需请求头：`Authorization: Bearer <Privy access_token>`（客户端 `getAccessToken()`）。

环境变量：`DATABASE_URL`、`PRIVY_APP_SECRET`、`NEXT_PUBLIC_PRIVY_APP_ID`。

## 迁移

```bash
npm run db:migrate
```

脚本会自动读取项目根目录的 `.env.local`（再读 `.env`）。

## 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/api/funds/wallet` | UPSERT `user_wallets` |
| PUT | `/api/funds/deposit-bridges` | UPSERT `user_deposit_bridges`（需先注册 wallet） |
| PUT | `/api/funds/withdraw-destinations` | UPSERT 提现四元组索引 |
| GET | `/api/funds/movements?limit=100` | 资金 Tab 列表（精简字段） |
| POST | `/api/funds/movements` | 幂等写入 `funds_movements` |

响应格式：`{ ok, data, requestId, timestamp }` 或 `{ ok: false, code, message, ... }`。

客户端封装：`src/lib/funds/client.ts`（P1 接入）。
