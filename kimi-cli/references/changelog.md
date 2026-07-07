# 版本跟踪（What's New）

官方更新日志：https://www.kimi.com/code/docs/kimi-code/whats-new.html

**本仓库校准锚点：`@moonshot-ai/kimi-code` v0.23.0（tag 2026-07-06，核对 2026-07-07）。**
更新前先 `kimi --version` / `npm view @moonshot-ai/kimi-code version`，与下表对照判断漂移；有差异则按 `AGENTS.md` / `CLAUDE.md`「Version drift」复核相关页面并 bump 锚点。

> ⚠️ 官方 what's-new 只列 minor 版本、且会滞后。**patch 版本与权威细节看源码仓库** `apps/kimi-code/CHANGELOG.md`（`MoonshotAI/kimi-code`）。源码核对（2026-06-17）发现站点漏掉的：
> - **Node 要求 24.15.0 → 22.19.0**（#622）。
> - **v0.14.2（#683）：`--auto`/`--yolo`/`--plan` 现可与 `--session`/`--continue` 同用**（模式应用到续接会话；旧版互斥）。
> - **v0.14.3（#713）**：打开模型选择器前刷新供应商模型元数据。
> - datasource 插件 **v3.2.0**，装后不自动更新、需重装升级（#646）。

## 各版本要点（新→旧）

### v0.23.0 — 2026-07-06
- **Preserved Thinking 默认开启**（#1417）：Kimi 模型在 Thinking 开启时默认保留历史 `reasoning_content`，跨轮推理更连续但会增加输入 token。用 `[thinking] keep = "off"` 或 `KIMI_MODEL_THINKING_KEEP=off` 禁用。
- **实验性 progressive tool disclosure**（#1369）：新增 `select_tools` 能力，`tool-select` 实验 flag 打开且模型支持时，MCP 工具 schema 不再全部放入顶层 `tools[]`，模型按需通过内置 `select_tools` 精确加载。默认关闭，对当前不支持模型无行为变化。
- **AskUserQuestion 回灌格式优化**（#1414）：答案回灌给模型时使用问题文本和选项 label，而不是 `q_0`/`opt_0_1` 这类合成 id；问题文本和同题选项 label 需唯一。
- 修复 `@` 文件补全在大型项目额外工作目录下漏掉深层文件；修复 Gemini 工具调用和 Gemini 3 thinking-signature 跨轮回传。
- ⚠️ 超出范围：归档会话 API / web 归档页、swarm web 卡片、web UI 视觉与布局修复，仅标记不展开。

### v0.22.3 — 2026-07-04
- **`kimi -p` 等后台子 agent 结果后再退出**（#1371）：避免 print 模式主轮提前结束、后台子 agent 结果未被消费。
- `kimi server run` 新增 `--keep-alive` 与 `--dangerous-bypass-auth`（#1373）。后者会关闭 REST/WebSocket bearer token 鉴权，仅可信网络或自有鉴权代理后使用。
- ⚠️ 超出范围：上传图片点击放大、视频播放修复、TUI transcript 渲染回退等交互项。

### v0.22.2 — 2026-07-03
- **print 模式后台等待配置**（#1347）：`background.keep_alive_on_exit = true` 时，`kimi -p` 退出前等待后台任务完成；`print_wait_ceiling_s` 控制最长等待。
- **compaction 交接摘要增强**（#1342）：记录后续步骤、已定决策和可预见障碍，自动压缩后更容易继续。
- 启动时从用户登录 shell 补充 PATH（#1339），减少 shell 命令找不到用户安装工具的问题。
- **`tui.disable_paste_burst`**（#1305）：当 bracketed paste 不可用时，避免快速多行粘贴被逐行提交。
- 修复工具调用 id 重复、被中断后后续消息丢失、Windows `kimi upgrade` spawn 错误、压缩图片泄露内部 `<system>` 说明等。

### v0.22.1 — 2026-07-02
- Shell 模式新增命令历史召回：空 `!` 提示符按 `↑` 浏览此前运行过的 Shell 命令。
- 改进 compaction 交接摘要，保留最新意图、关键工具结果、决策、待解答问题和需复查上下文。
- **移除实验性 micro-compaction** 及实验面板开关。
- 修复窄终端/CJK/emoji 渲染崩溃、屏幕空白、会话切换清屏等 TUI 稳定性问题。

### v0.22.0 — 2026-07-02
- **模型覆盖配置**：新增 `[models."<alias>".overrides]`，用于在 provider-model 刷新后保留用户覆盖的模型元数据。
- 自动压缩超大图片：送达模型前降采样/重编码，降低视觉 token 成本并避免供应商图片大小错误。
- 对支持多档思考强度的 always-on 模型，在 `/model` thinking 切换器中隐藏不支持的 Off 选项。
- ⚠️ 超出范围：web UI 新设计系统、会话搜索命令面板、工具卡片视觉归组等 web/TUI 交互项。

### v0.21.1 — 2026-07-01
- 修复加密推理流式输出期间，首个响应文本出现前等待 spinner 消失后留下空白的问题。

### v0.21.0 — 2026-07-01
- **插件斜杠命令**：plugin manifest 新增 `commands` 字段，可把 Markdown 提示词注册为 `/plugin:command`，支持 `$ARGUMENTS`。
- **Thinking 配置重构**：`default_thinking` 与 `thinking.mode` 废弃，改用 `[thinking].enabled`；Thinking effort 系统重构。
- 新增空闲时双击 `Esc` 打开撤销选择器；Shell 模式下输入 `/` 显示文件路径补全。
- 压缩机制重构：修复严格供应商对 `tool_use`/`tool_result` 相邻关系、Gemini/Vertex 轮次交替的要求；micro-compaction 默认关闭并在后续移除。
- 修复 `kimi -p` 完成后因残留句柄不退出的问题，并为 prompt 清理增加时限。

### v0.20.3 — 2026-06-30
- Glob 改用 ripgrep：默认遵循 ignore 文件，支持花括号模式，结果上限调整并在部分目录不可读时保留已有结果和 warning。
- 后台自动刷新供应商模型列表，新上架模型无需重启即可显示。
- 修复供应商返回 HTML 错误页时 TUI 错误消息为空白。

### v0.20.2 — 2026-06-29
- 插件 manifest 支持 `hooks`，启用插件后可在生命周期事件上运行脚本。
- `/feedback` 支持附加诊断日志与代码库上下文。
- `kimi web` 新增 `--allowed-host`，403 DNS rebinding 错误会提示放行方式。
- 优化默认系统提示词与内置工具描述，避免 agent 阻塞应后台运行的任务，并补充工具结果详情。

### v0.20.1 — 2026-06-27
- 新增 `kimi update`，等价于 `kimi upgrade`。
- chat-completions 供应商的 `max_tokens` 不超过剩余上下文窗口，避免上下文溢出与无效参数错误。
- 折叠待办面板时显示隐藏待办的完成/进行中/待处理明细。

### v0.20.0 — 2026-06-26
- **Shell 模式**（#1079）：输入框首字符 `!` 进入，直接跑 shell 命令、**输出对 AI 可见**；长跑命令 `Ctrl+B` 转后台。典型用途如 `!gh auth login` 在不另开终端的前提下登录 GitHub CLI，让 kimi 随后能用 `gh`。（注：主要面向 TUI 交互，对 headless 委派意义有限。）
- **写文件自动建父目录**（#1065）：Write 工具写文件时自动创建缺失的父目录——影响委派 kimi 落盘的行为预期。
- 修复 **explore 子 agent 在 git 命令超时或目录非仓库时静默丢失 git 上下文**（#1067）——涉及内置 `explore` 子 agent 可靠性。
- **第三方插件安装前新增确认提示**（#1088）；`/reload` 现会刷新 assistant 视角的插件 skills，插件改动当场生效、不必新开会话（#1086）。
- 每轮步数上限报错新增指引，指向 `loop_control.max_steps_per_turn` 配置项（#1097）；保留被截断的完整工具输出日志，后台任务完成通知链接到已保存的输出（#1062）。
- AGENTS.md 静默截断改为在 TUI 状态栏/web UI **显式告警**（#1040）。
- ⚠️ 超出范围（仅标记不展开）：`/plugins` 重做为单面板分页 UI（#1025/#1066）、`kimi server`/web 的鉴权与 `--host`/`KIMI_CODE_PASSWORD`/`--insecure-no-tls` 公网暴露加固（#1006）、以及大量 web 聊天/任务查看器交互项（KaTeX 渲染、行级 diff、`Ctrl+U`/`Ctrl+D` 翻页等）均为 web/TUI 交互，不展开。

### v0.19.2 — 2026-06-24
- **`-c` 转正**：`-c` 作为 `--continue` 的简写正式发版（#999；`-C` 此前为主短，已降为隐藏别名）。
- ⚠️ 超出范围：其余为 web/TUI 交互与重构项（模型选择器 `Alt+S` 仅切当前会话、待办列表 `Ctrl+T` 展开、运行中 Bash 卡片 `Ctrl+O` 展开、大文件受控内存读取、web 侧栏拖放排序/折叠持久化等），仅标记不展开。

### v0.19.1 — 2026-06-23
- 修复：ACP 编辑器（如 Zed）无法新建 thread；归档/删除会话时清空其全部状态；web 侧栏未读点跨标签同步。

### v0.19.0 — 2026-06-22
- **额外工作目录**：`/add-dir <path>`（会话内）或 `kimi --add-dir <path>`（启动时）添加工作目录外的目录；选「记住」写入**项目级 `.kimi-code/local.toml`**（建议加 .gitignore）。
- **后台任务**：`Ctrl+B` 把长跑的前台命令/子 agent 转后台，在 `/tasks` 面板查看。
- 供应商安全策略拦截改为**显式展示**（不再静默当完成）；文件 mention 体验优化；按内容探测图片真实格式。

### v0.18.0 — 2026-06-18
- **AgentSwarm 并发上限**：环境变量 `KIMI_CODE_AGENT_SWARM_MAX_CONCURRENCY` 限制初始加速阶段的并发子 agent 数。
- Web 会话搜索（按标题/最近提问过滤）、聊天视图上滚懒加载；插件变更提示同时建议 `/reload`。

### v0.17.0 — 2026-06-17
- **Kimi Code Web 模式**：`kimi web` 或 `/web` 把当前会话挪到浏览器继续；`kimi web` ＝ `kimi server run --open` 的简写（背后是 `kimi server` 本地服务）。
- 改进 OAuth token 刷新错误处理；v0.17.1 修复 `kimi web` 后台启动问题。

### v0.16.0 — 2026-06-16
- **`kimi vis`**：内置会话可视化工具，浏览器里直观查看一次会话全过程；支持 `--port`/`--host`、`--no-open`、`kimi vis <sessionId>` 深链。
- 防止 Anthropic 兼容供应商读取 Anthropic 的 shell 凭证。
- 修复：上下文超过阻断阈值时的重复压缩。

### v0.15.0 — 2026-06-15
- 全会话选择器：跨工作目录、按名称搜索、分页浏览；可为其它目录的会话生成可恢复命令。
- 推理过程跟随用户语言（代码/术语保留）。
- **MCP 新增对旧式 SSE 服务器的支持**（与 stdio、streamable HTTP 并存）。
- 窄终端下 TUI 组件自动折行/压缩/截断超宽内容。

### v0.14.0 — 2026-06-10
- **`Interrupt` hook 事件**：用户中断本轮（如按 `Esc`）时触发；此时 `Stop` 不再触发、由它替代；payload 含 `reason`（观察用）。
- `/undo` 不带参数 → 打开交互式选择器，按条挑要撤销的提示词。
- 修复：OpenAI 兼容 Chat Completions 下工具输出的图片丢失。

### v0.13.0 — 2026-06-10
- 自定义配色主题（JSON，只写想改的颜色，其余沿用基准）；`/custom-theme` 交互生成。
- `/import-from-cc-codex` 一键从 Claude Code / Codex 导入设置。
- Marketplace 显示已装 plugin 的可用更新。
- 修复：浏览器打不开时，设备登录仍保留可见的 URL 与验证码。

### v0.12.0 — 2026-06-09
- **`/swarm`**：多 agent 并行执行任务，实时进度。
- **代理支持**：`HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` / `NO_PROXY` 及 SOCKS。
- **Goal 模式 / 后台提问 / Sub-Skill 正式发布**（不再是实验特性）。
- **Micro compaction 默认开启**（上下文优化）。
- Homebrew 自动更新；`KIMI_CODE_HOME` 目录支持。

### v0.11.0 — 2026-06-05
- 内置 Skills 直接作为斜杠命令出现，**无需 `skill:` 前缀**。
- 新增实验性 **Sub-Skill 发现系统**（`sub-skill.review`、`sub-skill.consolidate`），用 `KIMI_CODE_EXPERIMENTAL_SUB_SKILL=1` 启用。
- Goal 模式在 YOLO 下启动前会确认并建议切到 Auto。
- 多个 Goal 队列 bug 修复。

### v0.10.1 — 2026-06-04
- 修复 TUI 启动 Goal 时的崩溃。

### v0.10.0 — 2026-06-04
- Goal 排队：`/goal next <目标>` 安排后续任务。
- `/experiments` 实验面板（可视化开关）。
- 新增内置 `update-config` Skill（直接改配置）。
- `/reload`：改配置后原地重载会话。
- `kimi doctor`：配置校验。

### v0.9.0 — 2026-06-03
- `kimi acp` 子命令（Agent Client Protocol，IDE 集成）。
- `/btw` 侧聊（非阻塞提问）。
- Windows Git Bash 探测改进。

### v0.8.0 — 2026-06-02
- 自主 **Goal 模式**（实验）：`/goal <目标>`。
- 后台结构化提问，避免流程阻塞。
- `kimi provider` 子命令（终端管理供应商）。
- 默认开启后台自动更新。

### v0.7.0 — 2026-06-02
- `/provider` 交互式供应商管理界面。
- `KIMI_MODEL_ADAPTIVE_THINKING` 环境变量（自定义端点）。
- 定时任务时间按本地时区显示。

## 功能首次出现版本（便于版本门控）

| 功能 | 起始版本 |
|---|---|
| `/provider` 交互界面 | v0.7.0 |
| `kimi provider` 子命令、Goal 模式 `/goal` | v0.8.0 |
| `kimi acp`、`/btw` | v0.9.0 |
| `kimi doctor`、`/reload`、`/experiments`、`/goal next`、内置 `update-config` | v0.10.0 |
| 内置 Skills 免 `skill:` 前缀、Sub-Skill 发现（实验，`KIMI_CODE_EXPERIMENTAL_SUB_SKILL`） | v0.11.0 |
| `/swarm` 多 agent 并行（自动重试限流）、代理支持（`*_PROXY`/SOCKS）、Goal/后台提问/Sub-Skill **转正**、micro compaction 默认开、`KIMI_CODE_HOME` 加载 Skills/全局指令 | v0.12.0 |
| 自定义配色主题、`/custom-theme`、`/import-from-cc-codex`、Marketplace 显示插件更新 | v0.13.0 |
| `Interrupt` hook 事件、`/undo` 交互式选择 | v0.14.0 |
| 全会话选择器（跨目录/搜索/分页）、MCP 旧式 SSE 支持、推理跟随用户语言 | v0.15.0 |
| `kimi vis` 会话可视化、阻止 Anthropic 兼容供应商读 shell 凭证 | v0.16.0 |
| `kimi web`/`/web` Web 模式、`kimi server` 本地服务 | v0.17.0 |
| `KIMI_CODE_AGENT_SWARM_MAX_CONCURRENCY`、Web 会话搜索 | v0.18.0 |
| `/add-dir`+`kimi --add-dir`、项目级 `.kimi-code/local.toml`、`Ctrl+B` 后台任务 | v0.19.0 |
| `-c` 作为 `--continue` 简写正式发版（`-C` 降为隐藏别名） | v0.19.2 |
| Shell 模式（`!` 前缀，输出对 AI 可见）、Write 自动建父目录、`/reload` 刷新插件 skills、第三方插件安装确认、`loop_control.max_steps_per_turn` 报错指引 | v0.20.0 |
| `kimi update` 别名、插件 hooks、`/feedback` 附加诊断、Glob 使用 ripgrep 并支持花括号模式 | v0.20.1–v0.20.3 |
| 插件斜杠命令、双击 `Esc` 撤销选择器、Thinking 配置改为 `[thinking].enabled`、`default_thinking`/`thinking.mode` 废弃 | v0.21.0 |
| 模型覆盖 `[models."<alias>".overrides]`、超大图片压缩、移除 micro-compaction、Shell 命令历史召回、`background.print_wait_ceiling_s`、`tui.disable_paste_burst` | v0.22.0–v0.22.2 |
| `kimi -p` 等后台子 agent 结果后再退出、`kimi server run --keep-alive`/`--dangerous-bypass-auth` | v0.22.3 |
| Preserved Thinking 默认开启（`[thinking] keep = "off"` 可关）、实验性 progressive tool disclosure (`select_tools`) | v0.23.0 |
