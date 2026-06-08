# kimi 命令完整参考（Node 版）

依据 https://www.kimi.com/code/docs/kimi-code-cli/reference/kimi-command.html

## 主命令 `kimi [options]` / `kimi <subcommand> [options]`

### 核心 flag

| Flag | 短 | 说明 |
|---|---|---|
| `--version` | `-V` | 显示版本并退出 |
| `--help` | `-h` | 帮助信息 |
| `--session [id]` | `-S` | 续接指定 id 会话，或交互式选择 |
| `--continue` | `-C` | 续接当前目录最近会话 |
| `--model <model>` | `-m` | 指定本次启动模型别名 |
| `--prompt <prompt>` | `-p` | 非交互单条执行；流式输出到 stdout，不开 TUI |
| `--output-format <fmt>` | — | `text` 或 `stream-json`；**仅配合 `-p`** |
| `--yolo` | `-y` | 自动批准常规工具调用，跳过确认 |
| `--auto` | — | auto 权限模式启动；工具自动处理，无需用户确认 |
| `--plan` | — | 以 Plan 模式开新会话；先用只读工具探索 |
| `--skills-dir <dir>` | — | 从指定目录加载 Skills，**替代自动发现**（可重复） |
| `--work-dir <dir>` | `-w` | 工作目录 |

### Flag 互斥规则

- `--continue` ↔ `--session`
- `--yolo` ↔ `--auto`
- `--yolo` / `--auto` 不能与 `--continue` 或 `--session` 同用
- `--plan` 不能与 `--continue` 或 `--session` 同用
- `--prompt` 不能与 `--yolo` / `--auto` / `--plan` 同用
- `--output-format` 仅在有 `--prompt` 时有效

### 非交互（`-p`）模式行为

- 采用 **`auto` 权限策略**：常规工具按 auto 规则放行，**静态 deny 策略仍生效**。
- thinking / assistant 过程内容输出到 **stderr**（`•` 前缀）；assistant 最终回复到 **stdout**。
- `--output-format stream-json`：stdout 每行一个 JSON（Tool 消息、含 `tool_calls` 的 Assistant 消息）。
- 解析与退出码详见 `kimi-subagent/references/headless-output.md`。

## 子命令

| 子命令 | 说明 |
|---|---|
| `kimi login` | 非交互 OAuth 设备码登录 |
| `kimi acp` | 切换 Agent Client Protocol 模式（IDE 集成） |
| `kimi doctor` | 校验 `config.toml` 与 `tui.toml` |
| `kimi export [id]` | 打包会话为 ZIP（`-o` / `-y` / `--no-include-global-log`） |
| `kimi migrate` | 迁移旧版 kimi-cli 数据到 kimi-code |
| `kimi upgrade` | 检查并安装更新 |
| `kimi provider <action>` | 供应商管理：`add` / `remove` / `list` / `catalog list` / `catalog add` |

## Skills 发现

按优先级：**Project > User > Extra > Built-in**。

- 用户级：`~/.kimi-code/skills/`、`~/.agents/skills/`
- 项目级（向上找最近 `.git` 目录）：`.kimi-code/skills/`、`.agents/skills/`
- 额外目录（`config.toml`）：`extra_skill_dirs = ["~/team-skills", ".agents/team-skills"]`
- 内置：随 CLI 分发（最低优先级）
- 命令行覆盖：`--skills-dir <dir>`（可重复，替代自动发现）

调用：`/skill:<name> [text]`；未与系统命令冲突时可简写 `/<name>`。Skill 调用最多 3 层嵌套。

## 配置与数据位置

- 数据目录：`~/.kimi-code/`
- 配置文件：`config.toml`（行为/供应商/模型/skills 等）+ `tui.toml`（终端 UI）
- `kimi doctor` 校验配置合法性

## 键盘快捷键

| 键 | 作用 |
|---|---|
| `Esc` | 中断流式 / 关闭弹窗 |
| `Ctrl-C` | 停止输出；连按两次退出 |
| `Shift-Tab` | 切换 Plan 模式 |
| `Ctrl-S` | 输出过程中插入消息 |
| `Ctrl-O` | 折叠 / 展开工具输出 |

完整快捷键见 https://www.kimi.com/code/docs/kimi-code-cli/reference/keyboard.html
