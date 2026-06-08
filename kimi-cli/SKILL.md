---
name: kimi-cli
description: |
  Node.js 版 Kimi Code CLI（@moonshot-ai/kimi-code）交互式用法：安装/升级/登录、启动与命令行
  参数、会话管理、Plan/YOLO/Auto 模式、斜杠命令、插件与 MCP、配置文件与 kimi doctor。
  用户问 kimi 命令怎么用、某个 flag/斜杠命令、装插件或 MCP、配置 kimi 时进此 Skill。
whenToUse: |
  交互式使用 kimi；询问 kimi 启动参数 / flag / 子命令；会话续接与导出；Plan/YOLO/Auto 模式切换；
  斜杠命令含义；安装/升级/登录 kimi；装插件或配置 MCP；config.toml / tui.toml 配置或排错。
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

- **Plan 模式**：`Shift-Tab` 切换，或 `--plan` 启动 / `/plan [on|off]`。先用只读工具探索再行动。
- **YOLO 模式**：`/yolo [on|off]` 或 `-y`，跳过工具审批（谨慎）。
- **Auto 模式**：`/auto [on|off]` 或 `--auto`，工具自动放行但保留静态 deny。
- **Goal 模式（实验）**：`/goal ...` 目标驱动。

## 4. 会话管理

- `/new`（`/clear`）开新会话；`/sessions`（`/resume`）浏览切换；`/fork` 基于当前会话分叉保留历史。
- `/compact [指令]` 压缩上下文省 token；`/title` 改标题。
- 导出：`/export-md [path]`（`/export`）导出 Markdown；`kimi export [id]` 打包 ZIP；`/export-debug-zip` 调试包。
- `/btw [问题]` 在分叉子 agent 里开侧聊不打断主线。

## 5. 斜杠命令

常用：`/help` `/model` `/status` `/usage` `/mcp` `/plugins` `/init`（生成 AGENTS.md）`/tasks` `/permission` `/settings`(`/config`)。完整清单与别名 → `references/slash-commands.md`。

## 6. 插件与 MCP

- **插件**：`/plugins` 交互式插件管理器；可从 marketplace 或任意 GitHub 仓库安装 skills / MCP / 数据源，安装时显示信任等级。
- **MCP**：`/mcp` 查看服务器与连接状态；`/mcp-config` 对话式增改与鉴权 MCP，无需手改 JSON。
- 官方数据源插件 `kimi-datasource`（A 股/港股行情）→ 见 `kimi-datasource` 子 Skill。

## 7. 配置与排错

- 数据目录 `~/.kimi-code/`；配置 `config.toml` + `tui.toml`。
- `kimi doctor` 校验 `config.toml` / `tui.toml`。
- Skills 发现目录、`extra_skill_dirs`、`--skills-dir` 等细节 → `references/cli-reference.md`。

## 8. 关键快捷键

`Esc` 中断流式/关弹窗 · `Ctrl-C` 停止输出（两次退出）· `Shift-Tab` 切 Plan · `Ctrl-S` 输出中插话 · `Ctrl-O` 折叠/展开工具输出。完整表见 `references/cli-reference.md`。
