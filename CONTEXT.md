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
