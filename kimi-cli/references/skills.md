# Agent Skills（编写与发现）

依据 https://www.kimi.com/code/docs/kimi-code-cli/customization/skills.html

Skill = 一份带 YAML frontmatter 的 Markdown，描述某项专业知识/工作流；可斜杠命令一键加载，或让模型按需自动调用。（本仓库自身就是一组 Skill。）

## 文件结构

- **目录形式（推荐）**：`<name>/SKILL.md`，同目录可放脚本/参考资料。`<name>/SKILL.md` 与同名 `<name>.md` 并存时以子目录为准。
- **扁平形式**：单个 `<name>.md`，Skill 名取文件名。

## Frontmatter 字段

| 字段 | 说明 |
|---|---|
| `name` | Skill 名（目录型**必填**；扁平省略则用文件名；大小写不敏感） |
| `description` | 一行总结，模型据此判断何时用（目录型**必填**；扁平省略则取正文首行非空，≤240 字符） |
| `type` | `prompt`(默认)/`inline`(同 prompt 语义)/`flow`(仅手动调用)。其它值跳过 |
| `whenToUse` | 触发场景（也接受 `when-to-use`/`when_to_use`） |
| `disableModelInvocation` | `true` 禁止模型自动调用（也接受 `disable-model-invocation`/`_`） |
| `arguments` | 命名参数列表（字符串数组或空白分隔串如 `arguments: target mode`）；正文用 `$<name>` 读取 |

> ⚠️ 目录型 `SKILL.md` 的 `name` 与 `description` 必须显式填，缺任一解析失败。

## 正文占位符

- `$ARGUMENTS`：完整原始参数串
- `$ARGUMENTS[0]`/`$0`、`$ARGUMENTS[1]`/`$1`：按空白分词的位置参数（支持引号包裹）
- `$<name>`：`arguments` 声明的命名参数
- `${KIMI_SKILL_DIR}`：当前 Skill 文件所在目录
- 正文不含任何占位符时，调用附带文本以 `\n\nARGUMENTS: <文本>` 追加到末尾

## 存放位置（优先级 Project > User > Extra > Built-in）

- **用户级**：`$KIMI_CODE_HOME/skills/`（默认 `~/.kimi-code/skills/`，随 `KIMI_CODE_HOME` 移动）、`~/.agents/skills/`（真实 OS home，跨工具共享）
- **项目级**（项目根＝向上最近含 `.git` 的目录）：`.kimi-code/skills/`、`.agents/skills/`
- **额外目录**：`config.toml` 顶层 `extra_skill_dirs = ["~/team-skills", ".agents/team-skills"]`
- **内置**：随 CLI 分发，最低优先级（如配 MCP、定制主题、改配置等开箱工作流）

## 调用

- 主动：`/skill:<name> [文本]`（无系统命令冲突时可简写 `/<name>`）
- 自动：模型按 `description`/`whenToUse` 调用（除非 `disableModelInvocation:true` 或 `type:flow`）
- 嵌套最多 3 层，超过终止

## 示例

```markdown
---
name: review-pr
description: 按团队标准审查 PR，输出结构化 review 报告
type: prompt
whenToUse: 当用户让我审查 PR、检查代码变更或评估提交质量时
arguments:
  - pr_ref
---

请审查 $pr_ref：拉取 diff → 对照检查项 → 参考同目录 `references/checklist.md` → 输出报告。
```

存为 `~/.kimi-code/skills/review-pr/SKILL.md`，重开会话后 `/skill:review-pr #1234`（`#1234` 展开到 `$pr_ref`）。

> 打包分发见 `plugins.md`；Skill 对子 agent 的影响见 `kimi-subagent/references/patterns.md`。
