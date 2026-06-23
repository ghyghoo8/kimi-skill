# 配置文件完整参考（config.toml / tui.toml）

依据 https://www.kimi.com/code/docs/kimi-code-cli/configuration/config-files.html

## 位置与加载

- 主配置：`~/.kimi-code/config.toml`（行为/供应商/模型/权限/钩子等）
- UI 偏好：`~/.kimi-code/tui.toml`（终端 UI）
- **项目级本地配置**：`.kimi-code/local.toml`（v0.19 起，工作目录下；存额外工作目录等本地/工作区设置，由 `/add-dir` 选「记住」写入，建议加 `.gitignore`）
- 二者首次运行自动创建。`KIMI_CODE_HOME` 可改基目录 → `$KIMI_CODE_HOME/config.toml`、`$KIMI_CODE_HOME/tui.toml`。
- TOML 语法：字段用 snake_case；含 `.` 的键名要加引号（如 `[models."gpt-4.1"]`）。
- **凭证只从 `config.toml` 读**：shell 里的 `export KIMI_API_KEY=...` 不会自动注入供应商。
- **MCP 不在此**：MCP 服务器配在 `~/.kimi-code/mcp.json` 或项目级 `.kimi-code/mcp.json`（schema、stdio/HTTP/SSE 接入见 `mcp.md`）。
- `kimi doctor` 校验合法性；`/reload-tui` 只重载 `tui.toml`，`/reload` 两者都重载。

---

## config.toml

### 顶层标量字段

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `default_model` | string | — | **必填**，模型别名（须在 `[models]` 中定义） |
| `default_thinking` | bool | `false` | 新会话默认开 thinking |
| `default_permission_mode` | string | `manual` | `manual` / `auto` / `yolo` |
| `default_plan_mode` | bool | `false` | 以「先规划后执行」模式启动 |
| `merge_all_available_skills` | bool | `true` | 合并所有目录的 Skills |
| `extra_skill_dirs` | array<string> | — | 额外 skill 搜索路径 |
| `telemetry` | bool | `true` | 匿名遥测 |

### `[providers.<name>]` — API 供应商

`<name>` 为任意键名。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | string | ✅ | `kimi` / `anthropic` / `openai` / `openai_responses` / `google-genai` / `vertexai` |
| `api_key` | string | | 明文 API key |
| `base_url` | string | | API 端点 URL |
| `oauth` | table | | OAuth 凭证（`storage`、`key`），登录流程自动注入 |
| `env` | table<string,string> | | 备用凭证来源（如 `KIMI_API_KEY`） |
| `custom_headers` | table<string,string> | | 每请求自定义 HTTP 头 |

凭证优先级：`api_key` ＞ `env` 子表 ＞ 两者都缺则启动报错。CLI 不从 shell 环境变量自动取凭证。

`type` 对应协议（thinking/视觉/工具调用等能力按模型名前缀自动匹配）：

| type | 协议 | 典型用途 |
|---|---|---|
| `kimi` | OpenAI 兼容 | Kimi Code 托管服务、Kimi Platform key |
| `anthropic` | Anthropic Messages | Claude |
| `openai` | OpenAI Chat Completions | OpenAI 及兼容（DeepSeek/Qwen 等） |
| `openai_responses` | OpenAI Responses | OpenAI 较新接口 |
| `google-genai` | Google GenAI | Gemini |
| `vertexai` | Google GenAI on Vertex | Vertex AI |

```toml
[providers.kimi.env]
KIMI_API_KEY = "sk-xxx"
KIMI_BASE_URL = "https://api.moonshot.ai/v1"
```

> 交互式管理用 TUI `/provider`（或 `kimi provider`，见 `cli-reference.md`）；OAuth 托管账号不在 `/provider` 里、用 `/login`、`/logout` 管。

### `[models.<alias>]` — 模型别名

`<alias>` 用于 `default_model` 或 `-m`。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `provider` | string | ✅ | `[providers]` 中的供应商名 |
| `model` | string | ✅ | 实际发给 API 的 model ID |
| `max_context_size` | int | ✅ | 最大上下文 token（≥1） |
| `max_output_size` | int | | 输出 token 上限（Anthropic 专用） |
| `capabilities` | array<string> | | 能力标签：`thinking` / `image_in` / `video_in` / `audio_in` / `tool_use` |
| `display_name` | string | | UI 显示名（缺省取 `model`） |
| `reasoning_key` | string | | 仅 OpenAI；非标准推理字段名 |
| `adaptive_thinking` | bool | | 仅 Anthropic；强制自适应 thinking 开/关 |

```toml
[models."gpt-4.1"]
provider = "openai"
model = "gpt-4.1"
max_context_size = 1047576
```

### `[thinking]` — 全局 thinking 默认

`mode = "off"` 会覆盖 `default_thinking = true`。

| 字段 | 类型 | 默认 | 取值 |
|---|---|---|---|
| `mode` | string | — | `auto` / `on` / `off` |
| `effort` | string | `high` | `low` / `medium` / `high` / `xhigh` / `max` |

### `[loop_control]` — Agent 执行循环

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `max_steps_per_turn` | int | — | 每轮最大步数（0 或不设＝无限） |
| `max_retries_per_step` | int | `3` | 单步失败重试次数 |
| `reserved_context_size` | int | — | 为输出预留的 token；触发自动压缩 |

### `[background]` — 后台任务并发

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `max_running_tasks` | int | — | 最大并发后台任务数 |
| `keep_alive_on_exit` | bool | `true` | 退出会话时保留运行中任务 |

`keep_alive_on_exit` 可被环境变量 `KIMI_CODE_BACKGROUND_KEEP_ALIVE_ON_EXIT` 覆盖（env 优先）。

### `[experimental]` — 实验特性开关

**v0.12 起目前仅剩一个用户可见字段**（`goal_command` / `background_ask` / `sub_skill` 均已正式发布、移出实验）：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `micro_compaction` | bool | `true` | 清理较旧的大型工具结果、保留最近对话；仅在想关闭自动清理时设 `false` |

可直接改或用 TUI `/experiments`；环境变量 `KIMI_CODE_EXPERIMENTAL_MICRO_COMPACTION` 优先。
（≤v0.11 该表还有 `goal_command`/`background_ask`/`sub_skill`，默认 `false`；现已转正，见 `changelog.md`。）

### `[services]` — 内置服务

仅识别 `moonshot_search` 与 `moonshot_fetch`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `base_url` | string | 服务 API URL |
| `api_key` | string | 凭证 |
| `oauth` | table | OAuth 凭证 |
| `custom_headers` | table<string,string> | 自定义 HTTP 头 |

```toml
[services.moonshot_search]
base_url = "https://api.moonshot.cn/v1/search"
api_key = "sk-xxx"
```

### `[[permission.rules]]` — 权限规则（数组）

按顺序求值，首个命中生效。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `decision` | string | ✅ | `allow` / `deny` / `ask` |
| `scope` | string | | `turn-override` / `session-runtime` / `project` / `user`（默认 `user`） |
| `pattern` | string | ✅ | `ToolName` 或 `ToolName(param_pattern)` |
| `reason` | string | | 审计/调试备注 |

### `[[hooks]]` — 生命周期钩子（数组）

```toml
[[hooks]]
event = "PreToolUse"
matcher = "Bash"
command = "node ~/.kimi-code/hooks/check-bash.mjs"
timeout = 5
```

字段：`event`（必填）、`matcher`（正则，可选）、`command`（必填）、`timeout`（1–600 秒，默认 30）。
事件全表、stdin 输入与退出码/JSON 输出契约 → `hooks.md`。

---

## tui.toml

终端 UI / 客户端偏好。缺省创建；若损坏则回退默认值。

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `theme` | string | `auto` | `auto` / `dark` / `light` |
| `[editor].command` | string | `""` | 长输入用的外部编辑器；回退 `$VISUAL`/`$EDITOR` |
| `[notifications].enabled` | bool | `true` | 桌面通知 |
| `[notifications].notification_condition` | string | `unfocused` | `unfocused` / `always` |
| `[upgrade].auto_install` | bool | `true` | 自动安装更新 |

```toml
theme = "auto"

[editor]
command = ""

[notifications]
enabled = true
notification_condition = "unfocused"

[upgrade]
auto_install = true
```

改动在下次启动或 `/reload-tui`（仅 `tui.toml`）、`/reload`（两者）后生效。
