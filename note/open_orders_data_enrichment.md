# 关于解决“挂单（未成交订单）”缺失事件名称和图片的记录

## 1. 背景与问题描述
在重构 Polymarket Seer 个人中心的“挂单（Orders）”标签页时，我们面临了一个核心数据缺失的问题：
通过 Polymarket CLOB 官方 SDK 的 `getOpenOrders()` 获取的用户未成交订单列表，其返回的数据结构纯粹是“交易层”的数据。

**CLOB 返回的字段仅包含：**
- `market`: Condition ID（十六进制哈希字符串，非常不适合人类阅读，如 `0x97d...`）
- `asset_id`: Token ID
- `side`: 买卖方向 (BUY/SELL)
- `price` / `original_size` / `size_matched`: 价格和交易量
- `outcome`: 交易结果方向 (Yes/No)

**缺失的关键字段：**
- `title` / `question`: 市场事件的完整名称
- `icon` / `image`: 事件对应的图片
- `endDate`: 市场到期时间

这导致前端界面在渲染“挂单”卡片时，只能 fallback 显示难以阅读的十六进制哈希地址（Condition ID），且没有事件图片，严重影响用户体验。

## 2. 问题根因分析
根据 Polymarket API 的设计原则，订单撮合系统（CLOB）与市场数据系统（Gamma/Data）是分离的：
1. **CLOB API / SDK**: 专注于极速撮合和高速订单流，不携带沉重的市场元数据。
2. **Gamma API**: 负责存储和提供友好的市场元数据（标题、类别、图片等）。
3. **Data API**: 负责提供聚合历史和头寸数据。

因此，要解决挂单显示不全的问题，必须在客户端进行跨 API 的**数据组合与拼接（Data Enrichment）**。

## 3. 失败的尝试：Gamma API 按 Token 过滤
**初期尝试方案**：用 `getOpenOrders()` 拿到 `asset_id` 后，通过 Gamma API `/markets?clob_token_ids={asset_id}` 批量获取缺失的信息。
**失败原因**：在实际使用中发现，Gamma API 的 `/markets` 列表端点对于某些 ID 参数过滤机制并不严格，经常忽略过滤条件而默认返回全站前 20 条市场记录，导致匹配精度极低或无法命中正确图片。

## 4. 最终解决方案：三层防翻算法 (3-Tier Enrichment)
鉴于个人中心页面的业务场景：用户在查看自己的“挂单”时，我们通常在同一时间也拉取了“持仓”数据。因此我们设计了一套能在前端独立完成的高效“三层匹配补全”算法。

在 `useTrading.ts` 钩子中，我们实现了以下信息富化流程：

### 层级 1：本地交叉匹配内存复用（最快、零网络开销）
优先从刚刚同步拉取下来的**持仓（Positions）列表**中借用数据。
由于 `Data API` 获取的 `positions` 已经自带了完整准确的 `title`、`icon` 和 `endDate`，极大概率可以覆盖用户当前的挂单资产。
```typescript
// 1. 构建持仓记录的哈希表（支持双键映射，提高命中率）
const infoByAssetId = {};
const infoByCondId = {};
posArr.forEach(p => {
    const info = { question: p.title, icon: p.icon, endDate: p.endDate };
    if (p.asset) infoByAssetId[p.asset] = info;
    if (p.conditionId) infoByCondId[p.conditionId] = info;
});
```

### 层级 2：按需向 CLOB 节点精确查询（补漏）
对于某些用户刚刚下达挂单，但账户中**零持仓**的市场情况，层级 1 缓存未命中。
此时仅收集这些漏网的 `Condition ID`（即订单对象中的 `market` 字段），**并行调用** CLOB SDK 提供的精确单点查询接口 `clob.getMarket(conditionId)` 获取。
```typescript
// 2. 对于缺漏的 ID，并发向 CLOB 查询底层市场信息
await Promise.all(unmatchedCondIds.map(async condId => {
    const mkt = await clob.getMarket(condId);
    if (mkt && mkt.question) {
        clobMarketInfo[condId] = {
            question: mkt.question,
            icon: mkt.icon,
            endDate: mkt.end_date_iso
        };
    }
}));
```

### 层级 3：优雅降级与兜底过滤（安全兜底）
在完成信息组合富化后传给 UI 渲染。如果在极端网络状况下（或由于脏数据）仍旧没有拿到名称，UI 层加入了字符串降级机制，决不让长串哈希地址直接暴露给用户：
```typescript
// 3. UI 层的兜底过滤器
const displayTitle = order.title || 
    (order.market && !order.market.startsWith('0x') ? order.market : '未知市场');
```

## 5. 总结与最佳实践
通过这套**“本地复用已知数据 -> 精准 API 补齐缺口 -> UI 层安全降级”**的三层策略，不仅彻底根治了挂单栏事件名称和图片无法正常显示的行业常见痛点，更重要的是**最大限度地重用了已知接口内存数据**，大幅降低了 API 的网络请求压力，提升了 H5 界面的渲染速度。

这种“智能数据富化（Smart Enrichment）”模式也是处理 Web3 订单撮合流与链下元数据分离架构的最佳实践典范。
