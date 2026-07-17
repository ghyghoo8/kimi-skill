---
name: kimi
description: |
  Kimi (Moonshot AI) 总入口路由 Skill。当需要把任务委派给 Kimi Code CLI 当子 agent 跑、
  利用内置 coder 的后台任务、Plan、Skill 与嵌套 Agent 能力、
  使用 kimi 命令行（交互/会话/斜杠命令/官方文档问答/插件/MCP/安装升级）、调用 Kimi 开放平台 API
  (kimi-k2.6 / kimi-latest) 与工具调用、或用 kimi-datasource 查金融/宏观/企业/学术数据时，先进此 Skill 做分发。
whenToUse: |
  用户提到 kimi / Kimi CLI / kimi-code / 月之暗面 / Moonshot；想让 kimi 跑一段活、并行委派、
  headless 调用 kimi，或让内置 coder 在任务中继续拆分、后台执行、调用 Skill/嵌套 Agent；
  问 kimi 命令行参数、会话、斜杠命令、官方文档、装插件/MCP；接入 Kimi API 或 tool calls；
  用 kimi-datasource 查股票行情/宏观经济/企业工商/学术文献等数据。
---

# Kimi 路由（skill-router）

本 Skill 是 **Kimi 全平台能力的入口与分发器**。它本身不含细节——按下表识别用户意图，
**调用（`/skill:<name>`）或读取对应子 Skill 的 `SKILL.md` 后再作答**。子 Skill 各自独立、也可被直接触发。

> 核心定位：指引**宿主 agent**（如 Claude Code / Kimi 主 agent）把 **Kimi Code CLI 当作可委派的子 agent**（headless 外壳调用），并灵活使用 kimi 的其它能力。

## 意图 → 子 Skill 路由表

| 用户意图（命中任一即路由） | 子 Skill |
|---|---|
| 把子任务**委派**给 kimi 跑、**并行**派活、**headless/`-p` 调用** kimi、让 kimi 在隔离上下文里独立完成一段工作、利用内置 `coder` 的后台任务/Plan/Skill/嵌套 Agent、解析 kimi 输出 | **`kimi-subagent`** ★ |
| **交互式**使用 kimi、命令行**参数/flag**、**会话**管理、**斜杠命令**、内置**官方文档问答**、装**插件/MCP**、Plan/YOLO/Auto 模式、**安装/升级/登录**、`kimi doctor` | **`kimi-cli`** |
| 接入 **Kimi 开放平台 API**（`kimi-k2.6` / `kimi-latest`）、**工具调用（Tool Calls）**、流式响应、用代码调 Kimi | **`kimi-api`** |
| 用 **kimi-datasource** 查数据：**金融**（股票行情/技术指标/财报/选股、宏观经济）、**企业工商**、**学术文献**；装/用该插件 | **`kimi-datasource`** |

## 路由原则

- **先路由，再作答**：命中即加载对应子 Skill，不要凭记忆直接回答 kimi 相关问题（CLI/API 变化快）。
- **可组合**：一个请求可能跨多个子 Skill（例：「写个 Python 脚本调 Kimi API 并发委派 kimi 跑测试」→ `kimi-api` + `kimi-subagent`）。按需依次加载。
- **拿不准归属**时，默认进 `kimi-subagent`（最核心场景）或 `kimi-cli`（通用命令行）。
- 不在本文件堆砌细节，避免与子 Skill 重复、撑大上下文。

## 子 Skill 一览

- `kimi-subagent` — 宿主把 `kimi` 当子 agent：`kimi -p`、`--output-format stream-json`、传上下文、并发委派、多轮、内置 `coder` 的后台/嵌套 Agent、输出解析、退出码。
- `kimi-cli` — Node 版 Kimi Code CLI 交互用法、完整 flag、会话、斜杠命令、插件/MCP、安装升级。
- `kimi-api` — Kimi 开放平台 API、模型列表、Tool Calls、流式。
- `kimi-datasource` — 数据网关（源码逆向）：直连 HTTP 用静态 API key 取金融（股票/财报/宏观）、企业工商、学术结构化数据，绕开 OAuth 15min 过期；也含 CLI 自然语言问数。

## 官方文档

- Kimi Code 文档：https://www.kimi.com/code/docs/
- Kimi Code CLI 入门：https://www.kimi.com/code/docs/kimi-code-cli/guides/getting-started.html
- 开放平台：https://platform.kimi.com
