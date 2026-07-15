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
| `max_output_size` | int | | 输出 token 上限（Anthropic 专用）；显式值覆盖内置 Claude 上限 |
| `capabilities` | array<string> | | 能力标签：`thinking` / `always_thinking` / `image_in` / `video_in` / `audio_in` / `tool_use` |
| `support_efforts` | array<string> | | 模型接受的 Thinking 档位；Kimi 运行时会校验，不支持的配置值回落到 `default_effort`；刷新可能改写，手动固定请放到 `overrides` |
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
| `effort` | string | — | `low` / `medium` / `high` / `xhigh` / `max` 等；Kimi 按 `support_efforts` 校验并回落，其他 provider 在协议支持时原样传递 |
| `keep` | string | `"all"` | 保留历史 thinking；Kimi 用 `thinking.keep`，Anthropic 用 `context_management.clear_thinking_20251015`（开启时走 beta Messages API）；`off`/`none`/`false`/`0` 等关值可禁用 |

已废弃字段：v0.21 起 `default_thinking` 改为 `[thinking].enabled`；`thinking.mode = "off"` 改为 `enabled = false`，`mode = "on"` / `"auto"` 等价于默认开启。

### `[loop_control]` — Agent 执行循环

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `max_steps_per_turn` | int | — | 每轮最大步数（0 或不设＝无限） |
| `max_retries_per_step` | int | `10` | 单步失败重试次数；v0.24.2 起默认从 3 提高到 10，429 / 过载等瞬时错误会指数退避数分钟后才让 turn 失败 |
| `reserved_context_size` | int | — | 为输出预留的 token；触发自动压缩 |

### `[background]` — 后台任务与 print 生命周期

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `max_running_tasks` | int | — | 最大并发后台任务数 |
| `keep_alive_on_exit` | bool | `false` | 退出会话时保留运行中任务；print 模式仅作兼容回退，`true` 等价于未显式设置 `print_background_mode` 时的 `"drain"` |
| `kill_grace_period_ms` | int | `5000` | 停止或超时后先请求正常退出，超过该毫秒数再强制终止 |
| `bash_auto_background_on_timeout` | bool | `true` | 前台 Bash 命令超时时转后台继续运行；`false` 恢复超时即终止 |
| `bash_task_timeout_s` | int | `600` | 后台 Bash 默认超时；`0`＝无超时；`kimi -p` 未显式配置时默认 `0` |
| `print_background_mode` | `"exit" \| "drain" \| "steer"` | `"steer"` | `kimi -p` 主 turn 结束后的策略：立即退出 / 等待但不回灌 / 等待并以完成结果 steer 主 Agent 进入新 turn |
| `print_wait_ceiling_s` | int | `315360000` | `drain` / `steer` 的墙钟上限；默认 10 年，近似不设限 |
| `print_max_turns` | int | `100000` | `steer` 由后台完成触发的新 turn 上限；默认近似不设限 |

`keep_alive_on_exit` 可被环境变量 `KIMI_CODE_BACKGROUND_KEEP_ALIVE_ON_EXIT` 覆盖（env 优先），但当前 print 模式优先使用显式的 `print_background_mode`。

**v0.24.2 当前默认**：`kimi -p` 只要还有未决后台任务就不退出；每个完成结果以合成 user 消息回灌给主 Agent，继续执行新 turn，直到某个 turn 结束时无未决任务。print 模式下后台 Bash 和子 Agent 未显式配置时均不设超时。需要 v0.23 及更早的一轮后退出语义时，设置 `print_background_mode = "exit"`；只等任务跑完但不让结果进入主 Agent 时用 `"drain"`。

### `[subagent]` — 子 Agent 超时

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `timeout_ms` | int | `7200000`（2h） | 单个 `Agent` / `AgentSwarm` 的 per-task 超时；`0`＝无超时；前后台均生效，`kimi -p` 未显式配置时默认 `0`；超过 `2147483647` 会钳到约 24.8 天 |

环境变量 `KIMI_SUBAGENT_TIMEOUT_MS` 的优先级高于配置文件。

### `[image]` — 图片压缩

适用于粘贴图片、`ReadMediaFile` 和 MCP 工具图片结果等所有入口。

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `max_edge_px` | int | `2000` | 图片最长边上限；超出时等比缩小 |
| `read_byte_budget` | int | `262144`（256KB） | `ReadMediaFile` 默认读图的单图字节预算；`region` / `full_resolution` 回读不受此预算限制 |

可分别用 `KIMI_IMAGE_MAX_EDGE_PX`、`KIMI_IMAGE_READ_BYTE_BUDGET` 覆盖。

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
base_url = "https://api.kimi.com/coding/v1/search"
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
