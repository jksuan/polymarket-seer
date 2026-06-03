# AI 与自动化协作规范（polymarket-seer）

本文面向使用 Cursor / 其他 AI 助手、脚本或 CI 修改本仓库的开发者与 Agent。目标：**行为可预期、源码不被错误编码破坏**。

## 1. 源码与文本编码

- 所有 **文本源码**（`.ts`、`.tsx`、`.js`、`.json`、`.md` 等）统一为 **UTF-8**；与团队约定一致时可选 **无 BOM** 或 **带 BOM**，但须全员一致。
- **禁止**依赖「系统默认 ANSI / 代码页」读写项目文件。
- 通过 **脚本或自动化** 写回仓库文件时，必须在 API 中 **显式指定 UTF-8**（例如 Python `encoding="utf-8"`，Node `utf8`）。

## 2. Windows 与 PowerShell（高风险路径）

历史上出现过：**在 PowerShell 管道中向 `.tsx` 写入含中文的内容**，导致 UTF-8 被误解释，源码中出现字面量 `?` 或非法字节，进而引发 Turbopack 报错。

**约定：**

- **不要**用 `echo` / `>` / 管道把「大段含中文的 TSX」写进文件。
- 若必须用 Shell 辅助：优先在 **仓库根目录** 使用 **相对路径**，且由 **显式 UTF-8** 的脚本（Python/Node）读写；避免让 Shell 本身承担转码。
- 批量替换大段 UI 文案时，优先 **IDE 内编辑** 或 **结构化补丁**，避免「终端里拼字符串再重定向」。

## 3. AI / Agent 改代码时的偏好

- 修改含 **中文或特殊 Unicode 符号**（如 `•`、`≈`）的字符串时：**不要**通过易损管道塞入非 ASCII 原文；必要时可临时使用 `\uXXXX` 转义，再在 UTF-8 安全环境下还原为直写中文。
- 改动应保持 **最小必要范围**，避免无关格式化导致巨大 diff。
- 提交说明与命令行习惯见仓库根目录 **`gitcommit.md`**（例如：提交说明用中文、注释中不含 ASCII 双引号、多个 git 命令用分号分隔、不要 push 等——以该文件为准）。

## 4. 校验与合并前

- 对改动过的 TypeScript 文件建议至少：`npm run lint`（按需加路径）、`npx tsc --noEmit`。
- 若曾出现乱码，可本地用编辑器或脚本确认文件为合法 UTF-8，并检查是否出现异常的连续 `?` 字面量。
- 合入 `main` 前：若变更影响产品行为或模块边界，更新 **ARCHITECTURE.md** 与 **CONTEXT.md**（版本日期、待办 Issue 可写在 ARCHITECTURE §6.5）；术语新增优先写 CONTEXT，避免只在代码注释里留痕。

## 5. Cursor 专用规则文件

本仓库在 **`.cursor/rules/`** 下提供可版本控制的 **`.mdc` 规则**（与上述约定一致；Cursor 会读取）。若你使用其他 AI 工具，可将同一条目手工同步到其「项目说明」或系统提示中。

---

*修订时请保持本文简短、可执行；细则可拆到 `.cursor/rules/` 多条规则中。*

## Agent skills

### Issue tracker

本仓库使用 GitHub Issues 进行需求、缺陷与任务跟踪。详见 `docs/agents/issue-tracker.md`。

### Triage labels

Issue 分拣使用五种标准状态标签映射（needs-triage/needs-info/ready-for-agent/ready-for-human/wontfix）。详见 `docs/agents/triage-labels.md`。

### Domain docs

当前采用 single-context 布局：仓库根目录 `CONTEXT.md`（若存在）+ `docs/adr/`（若存在）。详见 `docs/agents/domain.md`。
