# 覆盖优先级 · 环境变量 · 数据目录

依据官方配置文档：
- overrides：https://www.kimi.com/code/docs/kimi-code-cli/configuration/overrides.html
- env-vars：https://www.kimi.com/code/docs/kimi-code-cli/configuration/env-vars.html
- data-locations：https://www.kimi.com/code/docs/kimi-code-cli/configuration/data-locations.html

## 一、配置覆盖与优先级

三类来源，**作用域不同，不是简单线性优先级**：

1. **配置文件**（`config.toml`）——长期偏好（模型、密钥、循环控制），每次启动生效。
2. **命令行选项**（`-m` `--plan` `--yolo` `--skills-dir` …）——临时、仅本次会话，退出即失效。
3. **环境变量**——三种独立职责（见下），**不是配置字段的通用回退**。

**普通运行参数**（模型别名、Plan/yolo、Skills 目录）优先级：
命令行选项（仅本次） ＞ 用户配置文件。普通参数**不会**从 shell 环境变量取回退值。

**供应商凭证**独立解析：
`[providers.<name>].api_key` ＞ `[providers.<name>.env]` 子表 ＞ 两者皆空则启动报错。
`base_url` 同序。`api_key`/`base_url` **只从 `config.toml` 读**，shell `export` 不生效。

环境变量的三种职责：
- **定位配置**：`KIMI_CODE_HOME` 决定数据根，先于其它解析。
- **运行时开关**：如 `KIMI_DISABLE_TELEMETRY`，作为「额外禁止」直接关子系统，非普通覆盖语义。
- **端点/诊断**：`KIMI_CODE_OAUTH_HOST` `KIMI_CODE_BASE_URL` `KIMI_LOG_LEVEL` 在 OAuth/日志初始化时读取。

> **配置分层**：主配置 `config.toml` 仍只读用户级一份；但 **v0.19 起新增项目级 `.kimi-code/local.toml`**（由 `/add-dir` 选「记住」或手动写，存额外工作目录等本地/工作区设置，建议加 `.gitignore`）。跨项目完全隔离仍用 `KIMI_CODE_HOME` 指向不同数据目录。Skills 与 MCP 也有项目级路径，见数据目录一节。

```sh
# 测试环境隔离
KIMI_CODE_HOME="$PWD/.kimi-sandbox" kimi
# 批量免确认
kimi --yolo -p "批量重命名以下文件..."
```

## 二、环境变量全表

### 定位 / 开关 / 诊断

| 变量 | 作用 | 默认 / 取值 |
|---|---|---|
| `KIMI_CODE_HOME` | 数据根目录（影响配置/会话/日志/凭证） | `~/.kimi-code` |
| `KIMI_DISABLE_TELEMETRY` | 关匿名遥测 | `1`/`true`/`yes`/`y`（不分大小写） |
| `KIMI_CODE_OAUTH_HOST` | OAuth 主机（最高优先） | 回退 `KIMI_OAUTH_HOST` |
| `KIMI_OAUTH_HOST` | OAuth 主机回退 | `https://auth.kimi.com` |
| `KIMI_CODE_BASE_URL` | 登录后托管 API base（≠ `KIMI_BASE_URL`） | `https://api.kimi.com/coding/v1` |
| `KIMI_CODE_BACKGROUND_KEEP_ALIVE_ON_EXIT` | 退出保留后台任务（覆盖 config） | `1/true/yes/on` ↔ `0/false/no/off` |
| `KIMI_CODE_PLUGIN_MARKETPLACE_URL` | 替换插件市场 JSON 源 | URL 或本地路径 |
| `KIMI_SHELL_PATH` | Windows 下 Git Bash 路径覆盖 | 绝对路径 |
| `KIMI_CODE_NO_AUTO_UPDATE` | 完全关闭更新预检（旧名 `KIMI_CLI_NO_AUTO_UPDATE`） | `1`/`true`/`yes`/`on` |
| `KIMI_DISABLE_CRON` | 关 cron 调度工具（拒绝新调度，不触发已有） | `1` |
| `KIMI_REGISTRY_API_KEY` | `provider add` / `catalog add` 的注册表 key | —（见 cli-reference） |
| `KIMI_CODE_AGENT_SWARM_MAX_CONCURRENCY` | 限制 `/swarm` 初始加速阶段并发子 agent 数（防触发限流，v0.18） | 正整数 |
| `HTTP_PROXY`/`http_proxy` · `HTTPS_PROXY`/`https_proxy` | `http://` / `https://` 请求代理（v0.12 官方支持，大小写均认） | 代理 URL |
| `ALL_PROXY`/`all_proxy` | 未设按 scheme 的代理时的回退；SOCKS 用 `socks5://`/`socks4://` 前缀 | 代理 URL |
| `NO_PROXY`/`no_proxy` | 绕过代理的主机列表（逗号分隔） | 如 `localhost,127.0.0.1` |

> ✅ **v0.12 起官方支持代理变量，大小写都认、含 SOCKS** —— 解决了旧版「Node fetch 只认大写、小写代理够不到 `auth.kimi.com` 续期」的坑。
> **≤v0.11** 仍有该坑：需把小写镜像成大写，详见 `../../kimi-subagent/references/integration-troubleshooting.md` 第 3c 节。

### 实验特性（覆盖 `[experimental]`）

> **v0.12 起 Goal 模式 / 后台提问（background_ask）/ Sub-Skill 已正式发布**，无需实验开关；
> **micro compaction 默认开启**。官方现仅列下面两个实验变量：

| 变量 | 作用 |
|---|---|
| `KIMI_CODE_EXPERIMENTAL_FLAG` | 在当前进程启用**全部**已注册实验功能（`1/true/yes/on`） |
| `KIMI_CODE_EXPERIMENTAL_MICRO_COMPACTION` | 覆盖 `[experimental].micro_compaction`（默认已开） |

> ≤v0.11 另有 `KIMI_CODE_EXPERIMENTAL_GOAL_COMMAND` / `_BACKGROUND_ASK` / `_SUB_SKILL`；对应特性 v0.12 转正后这些变量从官方列表移除。见 `changelog.md`。

### 临时模型（`KIMI_MODEL_*`，内存态、不落配置）

设了 `KIMI_MODEL_NAME` 才启用整组；不写入 config。

| 变量 | 作用 | 默认 |
|---|---|---|
| `KIMI_MODEL_NAME` | 启用临时模型 + 模型名 | —（必填以启用本组） |
| `KIMI_MODEL_API_KEY` | 临时模型 API key | —（`KIMI_MODEL_NAME` 设了则必填） |
| `KIMI_MODEL_PROVIDER_TYPE` | 供应商类型 | `kimi`（或 `anthropic`/`openai`） |
| `KIMI_MODEL_BASE_URL` | API base | 按类型默认 |
| `KIMI_MODEL_MAX_CONTEXT_SIZE` | 最大上下文 token | `262144`（256K） |
| `KIMI_MODEL_CAPABILITIES` | 能力标签（逗号分隔，与自动探测取并集） | `image_in,thinking` |
| `KIMI_MODEL_DISPLAY_NAME` | `/model` 显示名 | 回退 `KIMI_MODEL_NAME` |
| `KIMI_MODEL_MAX_OUTPUT_SIZE` | 单次输出上限（仅 Anthropic） | 模型默认 |
| `KIMI_MODEL_REASONING_KEY` | 推理字段名覆盖（仅 OpenAI） | 自动探测 |
| `KIMI_MODEL_DEFAULT_THINKING` | 默认 thinking 开关 | 全局默认 |
| `KIMI_MODEL_THINKING_MODE` | thinking 触发策略 | `auto`/`on`/`off` |
| `KIMI_MODEL_THINKING_EFFORT` | thinking 强度 | `low`/`medium`/`high`/`xhigh`/`max` |
| `KIMI_MODEL_ADAPTIVE_THINKING` | 强制自适应 thinking（Anthropic） | 模型推断 |
| `KIMI_MODEL_MAX_COMPLETION_TOKENS` | 每请求 `max_completion_tokens` 硬上限（仅 kimi 供应商） | `0`/负数＝不钳制 |
| `KIMI_MODEL_TEMPERATURE` | 采样温度（仅 kimi，全局生效） | 如 `0.3` |
| `KIMI_MODEL_TOP_P` | top_p（仅 kimi，全局生效） | 如 `0.95` |
| `KIMI_MODEL_THINKING_KEEP` | Moonshot thinking 透传（须开 thinking） | 如 `all` |

### 日志

| 变量 | 作用 | 默认 |
|---|---|---|
| `KIMI_LOG_LEVEL` | 日志级别 | `info`（`off`/`error`/`warn`/`info`/`debug`） |
| `KIMI_LOG_GLOBAL_MAX_BYTES` | 全局日志单文件上限 | `6291456`（6 MB） |
| `KIMI_LOG_GLOBAL_FILES` | 全局日志保留文件数 | `5` |
| `KIMI_LOG_SESSION_MAX_BYTES` | 会话日志单文件上限 | `5242880`（5 MB） |
| `KIMI_LOG_SESSION_FILES` | 会话日志保留文件数 | `3` |

### 供应商凭证键（写在 `[providers.<name>.env]`，**非**直接读 shell）

| 键 | 供应商 | 默认 |
|---|---|---|
| `KIMI_API_KEY` / `KIMI_BASE_URL` | Kimi/Moonshot | `https://api.moonshot.ai/v1` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` | Anthropic | SDK 默认 |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | OpenAI（`openai`/`openai_responses`） | `https://api.openai.com/v1` |
| `GOOGLE_API_KEY` | Google GenAI / Vertex AI | — |
| `VERTEXAI_API_KEY` / `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION` | Vertex AI | — |

> 例外：`GOOGLE_APPLICATION_CREDENTIALS` 由 Google SDK 经 ADC 读取，不走 CLI。

只读系统变量（读不改）：`HOME` `VISUAL` `EDITOR` `PATH` `NO_COLOR` `FORCE_COLOR` `CI` `TERM_PROGRAM` `TERM` `TMUX` `DISPLAY` `WAYLAND_DISPLAY` `XDG_SESSION_TYPE` `WSL_DISTRO_NAME` `WSLENV` `LOCALAPPDATA`。

## 三、数据目录结构

默认 `~/.kimi-code/`（macOS `/Users/<name>/.kimi-code`；Linux `/home/<name>/.kimi-code`；
Windows `C:\Users\<name>\.kimi-code`）。`KIMI_CODE_HOME` 覆盖全部。

```
$KIMI_CODE_HOME (默认 ~/.kimi-code)
├── config.toml             # 用户配置（供应商/模型/循环控制）
├── tui.toml                # 终端 UI 偏好
├── mcp.json                # 用户级 MCP 声明（与项目级 .kimi-code/mcp.json 合并）
├── plugins/
│   ├── installed.json      # 已装插件与启用状态
│   └── managed/            # zip/本地路径安装的副本
├── session_index.jsonl     # 会话索引（sessionId, sessionDir, workDir）
├── credentials/            # OAuth 凭证（目录 0700，文件 0600）
│   ├── <name>.json         # 供应商凭证
│   └── mcp/<key>-<suffix>.json   # MCP 凭证
├── sessions/
│   └── <workDirKey>/<sessionId>/
│       ├── state.json              # 会话元数据/标题/时间戳
│       ├── upcoming-goals.json     # TUI goal 队列
│       ├── agents/main/wire.jsonl  # 主 agent 通信记录
│       ├── agents/main/plans/      # Plan 文件（<id>.md）
│       ├── agents/agent-0/wire.jsonl   # 子 agent 实例
│       ├── logs/kimi-code.log      # 会话诊断日志
│       ├── tasks/<task_id>.json + <task_id>/output.log  # 后台任务
│       └── cron/                   # 定时任务持久化
├── bin/rg                  # ripgrep 二进制（Windows 为 rg.exe）
├── logs/kimi-code.log      # 全局诊断日志
├── updates/                # latest.json / install.json / install.lock
└── user-history/<md5(workDir)>.jsonl   # 按工作目录的终端输入历史
```

**不受 `KIMI_CODE_HOME` 影响**：
- 内置工具缓存（ripgrep）：`KIMI_CODE_CACHE_DIR` 或平台默认
  （macOS `~/Library/Caches/kimi-code`；Linux `~/.cache/kimi-code`；Windows `%LOCALAPPDATA%\kimi-code`）。
- Skills 搜索路径：用户级 `~/.kimi-code/skills`、`~/.agents/skills`；
  项目级 `.kimi-code/skills`、`.agents/skills`（工作目录下）。
