# Triage Labels

下列为本仓库 triage 状态机的标准标签映射。

## 分类标签（category）

- `bug`
- `enhancement`

## 状态标签（state）

- `needs-triage`：等待维护者评估
- `needs-info`：等待提单人补充信息
- `ready-for-agent`：需求清晰，可由 AI Agent 独立执行
- `ready-for-human`：需要人工主导实现或决策
- `wontfix`：确认不处理

## 执行规则

- 每个 issue 应只有一个 category 标签 + 一个 state 标签
- 若存在冲突状态标签，先提示维护者确认，再执行迁移
- 若仓库后续采用不同命名，请同步更新本文，作为 skills 的唯一映射来源
