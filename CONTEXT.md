# Polymarket Seer Context

## 项目核心目标

面向移动端用户，提供低门槛、可视化、交易反馈清晰的 Polymarket 预测交易体验。

## 关键领域术语

- **Transfer Crypto**：用户向 Polymarket 充值地址转入加密资产的流程入口。
- **Connected Wallet Deposit**：通过用户已连接钱包完成报价、授权与下单式入金的流程入口。
- **Connected Wallet (Tier3)**：仅指 Privy Tier 3 全功能链上的 Connected Wallet 入金流程，当前范围为 EVM 与 SVM（Solana）。
- **Execution Engine**：Connected Wallet 在报价/构建前确定的执行引擎，当前仅 `evm` 与 `svm`。
- **Connected Fallback to Transfer**：Connected Wallet 失败时，显式引导用户回退到 Transfer Crypto 继续充值。
- **Deposit Address**：由后端创建并轮询状态的入账地址，作为 Transfer Crypto 的收款目标。
- **Transfer UI Session Baseline**：每次从充值首页进入 Transfer Crypto 步骤时记录的时间戳；与同一张 Deposit Address 的创建时间取较大值，用于过滤 bridge 返回的 `transactions`，避免复用缓存地址时沿用上一笔终态。中间态若暂未带 `createdTimeMs`（例如 `DEPOSIT_DETECTED`），仍予以保留以便展示「处理中」，不在过滤器侧仅凭「列表中存在更早的旧流水」丢弃。
- **Bridge Transfer Row Priority**：同一地址 `status` 接口返回的 `transactions` 约定为新在前；会话过滤后的 **第一条** 即视为当前阶段状态（与官网「仅最新一条为 `DEPOSIT_DETECTED` 才提示处理中」一致）。上游在 `DEPOSIT_DETECTED` 阶段往往 **不提供 `txHash` 与 `createdTimeMs`**，无法用哈希或时间戳与列表内其它行做稳定关联，因此 **顺序是该阶段唯一可信的权威信号**，不再用各行的 `createdTimeMs` 取最大值代替排序语义。
- **Supported Assets**：后端桥接接口返回的可充值资产全集，前端可按业务策略进行白名单过滤。
- **Transfer Asset Whitelist**：Transfer 流程允许展示和选择的资产集合。
- **Transfer Chain Whitelist**：Transfer 流程允许展示和选择的链集合。
- **Icon Resolution Strategy**：图标解析优先级策略，用于保证弱网或外链失效时仍可稳定展示。

## 当前上下文约定

- Transfer 与 Connected 是两条并行入口，避免互相阻塞主路径。
- 产品入口当前仅保留 `Connected Wallet (Tier3 EVM/SVM)` 与 `Transfer Crypto`；`Tier2 RawSign Wallet` 暂不纳入实现范围。
- Connected Wallet 在 `quote/build` 前必须完成执行引擎分流，不在 execute 阶段临时分支。
- Transfer 流程默认“自动创建地址”，减少用户显式操作步骤。
- 与业务规则强耦合的展示约束需通过 ADR 留痕，并在代码中可追溯。
