# ADR-0002: Connected Wallet Tier3 分流与范围边界

- 状态：Accepted
- 日期：2026-05-08

## 背景

当前充值路径包含 `Connected Wallet` 与 `Transfer Crypto` 两个入口。随着产品计划将 Connected Wallet 从 EVM 扩展到 Solana（SVM），团队面临以下架构分歧：

- 是否继续维持单入口心智，还是拆成多个入口。
- EVM/SVM 分流应在 `quote/build` 前还是 `execute` 时临时分支。
- 是否将 Privy Tier 2 RawSign 钱包一并纳入当前迭代。
- 出现 SVM 执行失败时，是否定义统一兜底路径。

若不提前定边界，后续实现容易在确认页、交易构建、错误处理与测试基线上出现语义混用。

## 决策

1. 产品入口保留两条主路径：
   - `Connected Wallet (Tier3 EVM/SVM)`
   - `Transfer Crypto`
2. `Connected Wallet` 采用“同一入口、内部按链能力分支”。
3. Connected 执行引擎必须在 `quote/build` 前确定，统一使用：
   - `executionEngine: "evm" | "svm"`
4. `Transfer Crypto` 保持多链充值地址统一入口，不与 Connected 执行引擎模型合并。
5. Solana 首期仅开放白名单资产（先控范围，不默认放开全部 SVM 资产）。
6. 当 Connected（尤其 SVM）执行失败时，提供明确回退到 `Transfer Crypto` 的兜底路径。
7. 当前迭代明确不纳入 `Tier2 RawSign Wallet`。

## 非目标（本 ADR 明确排除）

- 不在当前迭代实现 Tier2 链的 raw-sign 交易路径。
- 不在 execute 阶段临时追加 EVM/SVM 分流逻辑。
- 不将 Transfer 的地址模型改造成 Connected 执行模型。

## 影响

- 用户层面维持“同一 Connected 入口”心智，同时支持 EVM/SVM 能力扩展。
- 工程层面可将报价、构建、签名、执行和错误处理按引擎清晰拆分，降低条件分支复杂度。
- Transfer 与 Connected 各自保持独立职责，减少跨入口耦合。
- 失败兜底路径明确，可降低 SVM 首期上线风险与转化损失。

## 权衡

- 优点：边界清晰、扩展路径可控、测试矩阵可镜像架构分层。
- 代价：需要维护双引擎实现与双基线测试；短期内代码组织成本上升。

## 测试策略约束

- Connected 测试按引擎拆分为两套基线：
  - EVM 基线
  - SVM 基线
- 两套基线保持同一断言模板，但执行引擎与失败语义分别验证。
- Connected 失败回退到 Transfer 的关键路径必须纳入 E2E。

## Tier2 RawSign Wallet 未来准入条件

仅当以下条件同时满足，才允许启动 Tier2 RawSign Wallet 设计与实现：

1. 存在明确业务场景，且必须覆盖 Tier2 链能力。
2. 已定义独立执行引擎与错误码语义，不复用 Tier3 执行路径。
3. 已具备完整测试基线（单测 + E2E），并包含回退到 `Transfer Crypto` 的兜底验证。
