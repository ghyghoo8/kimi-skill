# kimi 命令完整参考（Node 版）

依据 https://www.kimi.com/code/docs/kimi-code-cli/reference/kimi-command.html

## 主命令 `kimi [options]` / `kimi <subcommand> [options]`

### 核心 flag

| Flag | 短 | 说明 |
|---|---|---|
| `--version` | `-V` | 显示版本并退出 |
| `--help` | `-h` | 帮助信息 |
| `--session [id]` | `-S` | 续接指定 id 会话，或交互式选择 |
| `--continue` | `-c` | 续接当前目录最近会话（**unreleased/main**：#999 把主短从 `-C` 改为 `-c`，`-C` 降为隐藏别名；截至 v0.19.1 仍是 `-C`） |
| `--model <model>` | `-m` | 指定本次启动模型别名；缺省取 config 的 `default_model` |
| `--prompt <prompt>` | `-p` | 非交互单条执行；流式输出到 stdout，不开 TUI |
| `--output-format <fmt>` | — | `text`（默认，transcript 样式）或 `stream-json`（JSONL）；**仅配合 `-p`**。调用方要结构化数据看下方 |
| `--yolo` | `-y` | 自动批准常规工具调用，跳过确认 |
| `--auto` | — | auto 权限模式启动；工具自动处理，无需用户确认 |
| `--plan` | — | 以 Plan 模式开新会话；先用只读工具探索 |
| `--skills-dir <dir>` | — | 从指定目录加载 Skills，**替代自动发现**（可重复） |
| `--add-dir <dir>` | — | 为本次会话添加额外工作目录；相对路径按 cwd 解析；**可重复**（v0.19） |

**隐藏别名**：`-r` / `--resume` ＝ `--session`；`--yes` / `--auto-approve` ＝ `--yolo`；`-C` ＝ `--continue`（截至 v0.19.1 仍是主短；**unreleased/main** #999 改主短为 `-c`、`-C` 降为别名）。

### Flag 互斥规则

- `--continue` ↔ `--session`（互斥）
- `--yolo` ↔ `--auto`（互斥）
- `--prompt` 不能与 `--yolo` / `--auto` / `--plan` 同用
- `--output-format` 仅在有 `--prompt` 时有效
- **v0.14.2 起**：`--auto` / `--yolo` / `--plan` **可**与 `--continue` / `--session` 同用——把该模式应用到续接的会话（旧版为互斥）。

### 非交互（`-p`）模式行为

- 采用 **`auto` 权限策略**：常规工具按 auto 规则放行，**静态 deny 策略仍生效**。
- **流向**：Assistant 正文 → **stdout**；thinking、工具进度、"恢复会话"提示 → **stderr**。
- **`text`（默认）**：stdout 是 transcript 样式——Assistant 正文以 `•` 开头、换行两空格缩进，**非干净纯文本**。
- **`stream-json`**：stdout 每行一个 JSON 对象；调用工具时按「带 `tool_calls` 的 Assistant 消息 → Tool 消息 → 后续 Assistant 消息」顺序输出；**thinking 不写入 JSONL**。官方未公开精确字段名。
- 调用方要稳定拿**格式化/结构化数据** → 用 **JSON 契约**（prompt 里要求最后只输出约定 JSON 再提取）。完整解析法、示例与退出码 → `kimi-subagent/references/headless-output.md`。

## 子命令

| 子命令 | 说明 |
|---|---|
| `kimi login` | 非交互 OAuth 设备码登录 |
| `kimi doctor [config\|tui] [path]` | 校验 `config.toml` / `tui.toml` |
| `kimi export [id]` | 打包会话为 ZIP |
| `kimi migrate` | 迁移旧版 kimi-cli 数据到 kimi-code |
| `kimi upgrade` | 检查并安装更新 |
| `kimi provider <action>` | 供应商管理（见下） |
| `kimi acp` | IDE 集成（ACP）— ⚠️ 交互式，**超出 subagent 底座范围**，不展开 |
| `kimi vis [id]` | 浏览器会话可视化 — ⚠️ 交互式，**超出范围**，不展开 |
| `kimi web` / `kimi server <sub>` | 浏览器 Web 模式 / 本地服务 — ⚠️ 交互式，**超出范围**，不展开 |

### `kimi login`

RFC 8628 设备码流程，不进 TUI。验证 URL 与 user code 打印到 **stderr**，轮询直到浏览器授权完成；token 写入与 TUI `/login` 相同位置。无 flag。成功退出码 0，取消/失败 1。

### `kimi doctor [subcommand] [path]`

不启动 TUI、不改文件地校验配置。读 `KIMI_CODE_HOME`（未设则 `~/.kimi-code`）。

| 形式 | 说明 |
|---|---|
| `kimi doctor` | 校验默认 `config.toml` 和 `tui.toml` |
| `kimi doctor config [path]` | 只校验 `config.toml`，给路径则校验该文件 |
| `kimi doctor tui [path]` | 只校验 `tui.toml`，给路径则校验该文件 |

给了显式 path 时文件必须存在。全部合法/跳过则退出码 0；指定文件缺失或非法则 1。

### `kimi export [sessionId] [options]`

打包会话目录为 ZIP（分享/存档/报 issue）。

| 参数 | 短 | 说明 |
|---|---|---|
| `sessionId` | — | 要导出的会话 id；省略则在当前目录选最近会话并确认 |
| `--output <path>` | `-o` | 输出 ZIP 路径；缺省为当前目录标准文件名 |
| `--yes` | `-y` | 跳过默认会话的确认，直接导出 |
| `--no-include-global-log` | — | 排除全局诊断日志 `~/.kimi-code/logs/kimi-code.log`（默认包含） |

### `kimi provider <action> [options]`

Shell 内管理供应商，等价于非交互的 TUI `/provider`。

| 动作 | 说明 |
|---|---|
| `provider add <url>` | 从自定义注册表（`api.json`）导入全部供应商。`--api-key <key>`（或环境变量 `KIMI_REGISTRY_API_KEY`）。写入 `[providers.<id>]` 与 `[models.<alias>]`；id 已存在则先删后写；不自动设默认模型 |
| `provider remove <providerId>` | 删除该供应商及其全部模型别名；若它是默认则清空 `default_model` |
| `provider list` | 每行打印一个已配供应商（类型/模型数/来源）；加 `--json` 输出原始 `providers`/`models` 表 |
| `provider catalog list [providerId]` | 浏览 models.dev 公共目录而不改配置。`--filter <子串>`（对 id/name 不区分大小写）、`--url <url>`（默认 `https://models.dev/api.json`）、`--json` |
| `provider catalog add <providerId>` | 按 id 直接导入已知供应商（如 `anthropic`/`openai`）。`--api-key <key>`（或 `KIMI_REGISTRY_API_KEY`）、`--default-model <modelId>`（导入后设 `default_model` 为 `<providerId>/<modelId>`）、`--url <url>` |

### 交互/Web 子命令（超出范围，仅标记）

`kimi acp`（IDE/ACP）、`kimi vis`（浏览器会话可视化）、`kimi web` / `kimi server`（Web UI 本地服务）均面向**交互式**使用，与「kimi 做 subagent 底座」定位无关，**本仓库有意不展开**。需要时见官方 `reference/kimi-command` / `guides/ides`。

## 环境变量（常用）

| 变量 | 作用 |
|---|---|
| `KIMI_CODE_HOME` | 数据目录，默认 `~/.kimi-code`（`kimi doctor` 等据此定位配置） |
| `KIMI_REGISTRY_API_KEY` | `provider add` / `provider catalog add` 的注册表/供应商 API key |
| `KIMI_SHELL_PATH` | Windows 下 Git Bash 非默认路径时指定 shell |

> 全部环境变量（`KIMI_MODEL_*` 临时模型、`KIMI_LOG_*`、`KIMI_CODE_EXPERIMENTAL_*`、OAuth 端点等）、
> 覆盖优先级与数据目录结构见 **`env-and-data.md`**。

## Skills 发现

按优先级：**Project > User > Extra > Built-in**。

- 用户级：`~/.kimi-code/skills/`、`~/.agents/skills/`
- 项目级（向上找最近 `.git` 目录）：`.kimi-code/skills/`、`.agents/skills/`
- 额外目录（`config.toml`）：`extra_skill_dirs = ["~/team-skills", ".agents/team-skills"]`
- 内置：随 CLI 分发（最低优先级）
- 命令行覆盖：`--skills-dir <dir>`（可重复，替代自动发现）

调用：`/skill:<name> [text]`；未与系统命令冲突时可简写 `/<name>`。Skill 调用最多 3 层嵌套。

## 配置与数据位置

- 数据目录：`~/.kimi-code/`（完整目录结构见 `env-and-data.md`）
- 配置文件：`config.toml`（行为/供应商/模型/skills 等）+ `tui.toml`（终端 UI）。**所有配置键的完整说明见 `config-files.md`**。
- MCP 服务器不在 config.toml，而在 `~/.kimi-code/mcp.json` 或项目级 `.kimi-code/mcp.json`
- `kimi doctor` 校验配置合法性
- 覆盖优先级（配置文件 / 命令行 / 环境变量）见 `env-and-data.md`

## 键盘快捷键

| 键 | 作用 |
|---|---|
| `Esc` | 中断流式 / 关闭弹窗 |
| `Ctrl-C` | 停止输出；连按两次退出 |
| `Shift-Tab` | 切换 Plan 模式 |
| `Ctrl-S` | 输出过程中插入消息 |
| `Ctrl-O` | 折叠 / 展开工具输出 |

完整快捷键见 https://www.kimi.com/code/docs/kimi-code-cli/reference/keyboard.html
