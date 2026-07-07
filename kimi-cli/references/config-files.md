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
| `support_efforts` | array<string> | | 模型目录声明的 Thinking 档位；刷新可能改写，手动固定请放到 `overrides` |
| `default_effort` | string | | 模型默认 Thinking 档位；刷新可能改写，手动固定请放到 `overrides` |
| `display_name` | string | | UI 显示名（缺省取 `model`） |
| `reasoning_key` | string | | 仅 OpenAI；非标准推理字段名 |
| `adaptive_thinking` | bool | | 仅 Anthropic；强制自适应 thinking 开/关 |

```toml
[models."gpt-4.1"]
provider = "openai"
model = "gpt-4.1"
max_context_size = 1047576
```

### 模型覆盖项（v0.22）

供应商模型刷新会改写 `[models.<alias>]` 的目录字段。需要长期保留的用户覆盖写到 `[models."<alias>".overrides]`；运行时有 override 就用 override，否则用顶层字段。

```toml
[models."kimi-code/kimi-for-coding"]
provider = "managed:kimi-code"
model = "kimi-for-coding"
max_context_size = 262144

[models."kimi-code/kimi-for-coding".overrides]
max_context_size = 131072
display_name = "Kimi for Coding (custom)"
```

`overrides` 可覆盖普通模型字段：`max_context_size`、`max_output_size`、`capabilities`、`display_name`、`reasoning_key`、`adaptive_thinking`、`support_efforts`、`default_effort`。不可覆盖身份/路由字段：`provider`、`model`、`protocol`、`beta_api`。

### `[thinking]` — 全局 thinking 默认

| 字段 | 类型 | 默认 | 取值 |
|---|---|---|---|
| `enabled` | bool | `true` | 新会话是否默认开启 Thinking；`false` 强制关闭 |
| `effort` | string | — | `low` / `medium` / `high` / `xhigh` / `max` 等，实际取决于模型 `support_efforts` |
| `keep` | string | `"all"` | Kimi 模型保留历史 `reasoning_content` 的透传设置；`off`/`none`/`false`/`0` 等关值可禁用 |

已废弃字段：v0.21 起 `default_thinking` 改为 `[thinking].enabled`；`thinking.mode = "off"` 改为 `enabled = false`，`mode = "on"` / `"auto"` 等价于默认开启。

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
| `keep_alive_on_exit` | bool | `false` | 退出会话时保留运行中任务；print 模式下为 `true` 时会在退出前等待后台任务跑完 |
| `print_wait_ceiling_s` | int | `3600` | `kimi -p` 且 `keep_alive_on_exit = true` 时，主 turn 结束后等待后台任务的最长秒数 |

`keep_alive_on_exit` 可被环境变量 `KIMI_CODE_BACKGROUND_KEEP_ALIVE_ON_EXIT` 覆盖（env 优先）。

v0.22.2 起：在 print 模式（`kimi -p "<prompt>"`）中，如果被派 kimi 内部启动了后台任务（如后台子 agent）并希望它们完成，设置 `keep_alive_on_exit = true`。否则主 turn 结束时后台任务会随进程清理。v0.22.3 起普通 `kimi -p` 会等待后台子 agent 完成并响应其结果后再退出，避免提前结束本轮。

### `[experimental]` — 实验特性开关

实验字段会随版本变化；v0.21 后 micro-compaction 已移除，不再记录 `[experimental].micro_compaction`。

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
| `disable_paste_burst` | bool | `false` | 禁用非 bracketed paste 的粘贴突发兜底；默认开启以避免快速多行粘贴被逐行提交 |
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
