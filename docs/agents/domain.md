# Domain Docs Layout

当前仓库采用 **single-context** 布局。

## 约定位置

- 领域词汇表：`CONTEXT.md`（仓库根目录，若存在）
- 架构决策记录：`docs/adr/`（若存在）

## Skills 消费规则

- `grill-with-docs`、`tdd`、`diagnose`、`improve-codebase-architecture` 在进入实现前应优先读取上述文档
- 若 `CONTEXT.md` 不存在：在首次沉淀明确领域术语时创建
- 若 `docs/adr/` 不存在：在首次需要记录“难以逆转且有权衡”的决策时创建

## 术语与决策更新原则

- 术语更新应偏业务语义，避免实现细节
- ADR 仅记录关键决策与权衡，不记录琐碎实现
