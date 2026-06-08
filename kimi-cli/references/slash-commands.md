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
| `/theme` | 切换终端配色 |

## 会话管理

| 命令 | 说明 |
|---|---|
| `/new`（`/clear`） | 新会话，丢弃上下文 |
| `/sessions`（`/resume`） | 浏览并切换历史会话 |
| `/tasks`（`/task`） | 查看后台任务列表 |
| `/fork` | 基于当前会话分叉，保留完整历史 |
| `/title [文本]`（`/rename`） | 显示/设置会话标题 |
| `/compact [指令]` | 压缩上下文释放 token |
| `/init` | 分析代码库并生成 `AGENTS.md` |
| `/export-md [路径]`（`/export`） | 导出会话为 Markdown |
| `/export-debug-zip` | 导出调试 ZIP |

## 模式与执行控制

| 命令 | 说明 |
|---|---|
| `/yolo [on\|off]`（`/yes`） | 切换 YOLO（跳过工具审批） |
| `/auto [on\|off]` | 切换 auto 权限模式 |
| `/plan [on\|off]` / `/plan clear` | 切换 Plan 模式 / 清除当前 plan |
| `/goal [...]` | 目标模式（实验）：`status` / `pause` / `resume` / `cancel` / `replace <目标>` / `next <目标>` / `next manage` |

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
| `/feedback` | 提交反馈 |

## Skill 动态命令

| 命令 | 说明 |
|---|---|
| `/skill:<name> [text]` | 调用指定 Skill，可带参数文本 |
| `/<name>` | `/skill:<name>` 简写（未被系统命令占用时） |

## 退出

`/exit`（`/quit` `/q`）退出 Kimi Code CLI。
