---
name: kimi-cli
description: |
  Node.js 版 Kimi Code CLI（@moonshot-ai/kimi-code）交互式用法：安装/升级/登录、启动与命令行
  参数、会话管理、Plan/YOLO/Auto 模式、斜杠命令、插件与 MCP、配置文件与 kimi doctor。
  用户问 kimi 命令怎么用、某个 flag/斜杠命令、装插件或 MCP、配置 kimi 时进此 Skill。
whenToUse: |
  交互式使用 kimi；询问 kimi 启动参数 / flag / 子命令；会话续接/分叉/导出；Plan/YOLO/Auto/Goal 模式切换；
  输入与快捷键、@ 引文件 / 贴图 / 外部编辑器；定时任务提醒（cron）；
  斜杠命令含义；安装/升级/登录 kimi；装插件或配置 MCP；添加/管理模型供应商（kimi provider）；
  config.toml / tui.toml 配置项、环境变量（KIMI_* / 临时模型）、数据目录与覆盖优先级、kimi doctor 排错。
---

# Kimi Code CLI（Node 版）交互式用法

> Kimi CLI 已从旧版 Python 重写为 **Node.js 包 `@moonshot-ai/kimi-code`**。旧的 uv/python 安装、
> `--agent-file` YAML agent、wire 模式等均已废弃。从旧版迁移用 `kimi migrate`。

## 1. 安装 / 升级 / 登录

```bash
# 脚本安装（推荐，无需预装 Node）
curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash         # macOS / Linux
irm https://code.kimi.com/kimi-code/install.ps1 | iex                 # Windows PowerShell

# 或 npm（需 Node ≥ 24.15.0）
npm install -g @moonshot-ai/kimi-code      # 或 pnpm add -g @moonshot-ai/kimi-code

kimi --version      # 验证
kimi upgrade        # 升级到最新
kimi migrate        # 迁移旧版 kimi-cli 数据
```

> 校准锚点 **v0.11.0（2026-06-05）**；各版本特性与「功能首次出现版本」→ `references/changelog.md`。

- 首次使用：进入后 `/login` 配置凭证（OAuth 设备码或 API key）。也可 `kimi login` 非交互登录。
- Windows 需 Git for Windows；Git Bash 非默认路径时设 `KIMI_SHELL_PATH`。

## 2. 启动与常用命令行参数

```bash
kimi                       # 启动交互式 TUI
kimi -w /path/to/project   # 指定工作目录
kimi -m kimi-k2.6          # 指定模型
kimi -C                    # 续接当前目录最近会话
kimi -S <id>               # 续接指定会话（或交互选择）
kimi --plan                # 以 Plan 模式启动（先只读探索）
kimi -y / --yolo           # 自动批准常规工具调用
kimi --auto                # auto 权限模式（工具自动处理，无需逐次确认）
kimi -p "..."              # 非交互单条执行（headless）→ 详见 kimi-subagent 子 Skill
```

完整 flag、子命令（`login` `acp` `doctor` `export` `migrate` `upgrade` `provider`）、互斥规则与快捷键 → `references/cli-reference.md`。

## 3. 交互模式

- **Plan 模式**：`Shift-Tab` 切换，或 `--plan` 启动 / `/plan`；`/plan clear` 清计划。先只读探索再行动。
- **YOLO 模式**：`/yolo` 或 `-y`，跳过工具审批（仅 Plan 退出例外，谨慎）。
- **Auto 模式**：`/auto` 或 `--auto`，工具自动放行但**禁止 agent 提问**，适合无人值守。
- **Goal 模式（实验）**：`KIMI_CODE_EXPERIMENTAL_GOAL_COMMAND=1` 启用；`/goal <目标>` 跨多轮朝终态推进，`/goal next` 排队、`/goal pause|resume|cancel|replace`。`-p` 下仅创建目标，退出码 `0/3/6` → `references/interaction.md`。

## 4. 会话管理

- `/new`（`/clear`）开新会话；`/sessions`（`/resume`）浏览切换；`/fork` 分叉（两份独立，**已存目标不带入**）；`/title`(`/rename`) 改/看标题。
- `/compact [指令]` 压缩上下文省 token；按工作目录分组存储，**勿手改 `sessions/`**。
- 导出：`/export-md [path]`（`/export`）导 Markdown；`kimi export [id]` 打包 ZIP；`/export-debug-zip` 调试包。
- `/btw [问题]` 在分叉子 agent 里开侧聊不打断主线。
- 输入机制（`@` 引文件、`Ctrl-V` 贴图、`Ctrl-G` 外部编辑器、审批面板）、会话存储与 Goal 模式细节 → `references/interaction.md`。

## 5. 斜杠命令

常用：`/help` `/model` `/status` `/usage` `/mcp` `/plugins` `/init`（生成 AGENTS.md）`/tasks` `/permission` `/settings`(`/config`)。完整清单与别名 → `references/slash-commands.md`。

## 6. 插件与 MCP

- **插件**：`/plugins` 交互式管理器；可从 marketplace、GitHub 仓库、zip URL 或本地路径安装；插件打包 Skills + MCP + 会话启动注入，安装显示信任等级（`kimi-official`/`curated`/`third-party`），**装插件不执行其中脚本**，仅对新会话生效。完整 manifest（`kimi.plugin.json`）、`/plugins` 子命令、存储与安全模型 → `references/plugins.md`。
- **MCP**：`/mcp` 查看服务器与连接状态；`/mcp-config` 对话式增改与鉴权 MCP，无需手改 JSON。MCP 声明在 `~/.kimi-code/mcp.json` 或项目级 `.kimi-code/mcp.json`。
- **钩子（Hooks）**：`config.toml` 的 `[[hooks]]`，「事件→脚本」自动化（如 `PreToolUse` 拦危险命令）；事件全表、stdin/退出码契约 → `references/hooks.md`。
- 官方数据源插件 `kimi-datasource`（金融/宏观/企业/学术）→ 见 `kimi-datasource` 子 Skill。

## 7. 配置与排错

- 数据目录 `~/.kimi-code/`（可用 `KIMI_CODE_HOME` 覆盖）；配置 `config.toml` + `tui.toml`。
- `kimi doctor [config|tui] [path]` 校验配置。
- 模型供应商：`kimi provider add/remove/list`、`kimi provider catalog list/add`（从 models.dev 目录导入，如 `anthropic`/`openai`）→ 详见 `references/cli-reference.md`。
- **配置项全表**（`[providers]` / `[models]` / `[thinking]` / `[loop_control]` / `[background]` / `[experimental]` / `[services]` / `[[permission.rules]]` / `[[hooks]]`、tui.toml）→ `references/config-files.md`。
- **覆盖优先级、环境变量全表、数据目录结构** → `references/env-and-data.md`。要点：命令行（仅本次）＞ 用户 `config.toml`；普通参数不从 shell env 取回退；凭证只从 `config.toml` 读；**无项目级 config.toml，跨项目隔离用 `KIMI_CODE_HOME`**；临时模型走 `KIMI_MODEL_*`。
- Skills 发现目录、`extra_skill_dirs`、`--skills-dir` 等细节 → `references/cli-reference.md`。
- **报错速查**（401 鉴权 / 429 限流配额 / 400 请求格式 / 404 模型端点 / 500 服务端 / 工具错误）→ `references/error-reference.md`。

## 8. 关键快捷键

`Enter` 发送 · `Shift-Enter`/`Ctrl-J` 换行 · `Esc` 中断流式/关弹窗 · `Ctrl-C` 停止输出（两次退出）· `Ctrl-D` 空输入退出 · `Shift-Tab` 切 Plan · `Ctrl-S` 输出中插话 · `Ctrl-O` 折叠/展开工具输出 · `Ctrl-V`/`Alt-V` 贴图 · `Ctrl-G` 外部编辑器 · `@` 引文件。完整交互与按键见 `references/interaction.md`。

## 9. 典型用例

理解陌生项目 · 实现新功能 · 修 Bug（先排查再修）· 测试与重构 · 一次性脚本/日志分析 · 定时任务与提醒（cron）· 文档同步。示例提示见 `references/interaction.md`。
