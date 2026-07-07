# Kimi Code CLI 斜杠命令全表

依据 https://www.kimi.com/code/docs/kimi-code-cli/reference/slash-commands.html

## 账号与配置

| 命令 | 说明 |
|---|---|
| `/login` | OAuth 或 API key 登录 |
| `/logout` | 清除当前账号凭证 |
| `/provider` | 交互式供应商管理（查看/添加/删除） |
| `/model` | 切换当前会话模型 |
| `/settings`（`/config`） | 打开设置面板 |
| `/experiments`（`/experimental`） | 启用实验特性 |
| `/permission` | 选择权限模式 |
| `/editor` | 配置 Ctrl-G 外部编辑器 |
| `/theme` · `/custom-theme` | 配色主题 — ⚠️ 外观，**超出 subagent 底座范围** |
| `/import-from-cc-codex` | 从 Claude Code/Codex 导入设置 — ⚠️ 一次性，**超出范围** |

## 会话管理

| 命令 | 说明 |
|---|---|
| `/new`（`/clear`） | 新会话，丢弃上下文 |
| `/sessions`（`/resume`） | 浏览并切换历史会话 |
| `/tasks`（`/task`） | 查看后台任务列表 |
| `/fork` | 基于当前会话分叉，保留完整历史 |
| `/title [文本]`（`/rename`） | 无参显示当前标题；带参设新标题（≤200 字符） |
| `/compact [指令]` | 压缩上下文释放 token |
| `/undo [次数]` | 从当前上下文撤销最近的提示词；不带参打开交互式选择器（v0.14） |
| `/add-dir <path>` | 为当前会话添加额外工作目录；可选「记住」写入项目级 `.kimi-code/local.toml`（v0.19） |
| `/web` | 浏览器继续会话 — ⚠️ 交互/Web，**超出 subagent 底座范围** |
| `/init` | 分析代码库并生成 `AGENTS.md` |
| `/export-md [路径]`（`/export`） | 导出会话为 Markdown |
| `/export-debug-zip` | 导出调试 ZIP |

## 模式与执行控制

| 命令 | 说明 |
|---|---|
| `/yolo [on\|off]`（`/yes`） | 切换 YOLO（跳过工具审批） |
| `/auto [on\|off]` | 切换 auto 权限模式 |
| `/plan [on\|off]` / `/plan clear` | 切换 Plan 模式 / 清除当前 plan |
| `/goal [...]` | 目标模式（v0.12 正式发布；≤v0.11 实验）：`status` / `pause` / `resume` / `cancel` / `replace <目标>` / `next <目标>` / `next manage` |
| `/swarm on\|off` | 开/关 swarm 模式（多 agent 并行），不发提示词（v0.12 新增） |
| `/swarm <任务>` | 先开 swarm，再把 `<任务>` 作为普通提示词发送 |

## 信息与状态

| 命令 | 说明 |
|---|---|
| `/help`（`/h` `/?`） | 快捷键与命令 |
| `/btw [问题]` | 在分叉子 agent 中开侧聊 |
| `/usage` | token 用量与配额 |
| `/status` | 运行状态（版本/模型/目录/权限） |
| `/mcp` | MCP 服务器与连接状态 |
| `/plugins` | 交互式插件管理器 |
| `/version` | 显示版本 |
| `/feedback` | 提交反馈，可附加诊断日志和代码库上下文 |

## Skill 动态命令

| 命令 | 说明 |
|---|---|
| `/skill:<name> [text]` | 调用指定 Skill，可带参数文本 |
| `/<name>` | `/skill:<name>` 简写（未被系统命令占用时） |

## 退出

`/exit`（`/quit` `/q`）退出 Kimi Code CLI。

---

**深入**：`/plugins` 子命令与 manifest → `plugins.md`；`/goal` 完整语义 → `interaction.md`；会话/导出细节 → `interaction.md`；权限规则/钩子 → `config-files.md`、`hooks.md`；按键与输入机制 → `interaction.md`。
