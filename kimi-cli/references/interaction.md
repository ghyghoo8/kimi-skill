# 会话与交互（subagent 底座相关部分）

> 本仓库定位「kimi 做 subagent 底座」。本文只保留与**多轮委派 / headless** 相关的部分；
> 纯交互式 TUI 用法（按键、贴图、外部编辑器、审批面板操作、Goal 队列管理、典型用例等）**超出范围、仅在文末标记**。
> 完整交互指南见官方 `guides/interaction`、`guides/sessions`、`guides/goals`。

## 一、会话管理（多轮委派核心）

CLI 把每次对话持久化为「会话」，可关终端后再续——这是宿主对同一子任务做**多轮 headless 委派**的基础。

### 存储（按工作目录分组）

```
~/.kimi-code/
├── session_index.jsonl          # 会话索引（sessionId, sessionDir, workDir）
└── sessions/
    └── <workDirKey>/<sessionId>/
        ├── state.json           # 标题、创建时间等元数据
        └── agents/*/wire.jsonl  # Agent 事件流、LLM 请求轨迹，用于恢复、回放与调试
```

> 每个项目目录独立会话历史。**勿手动编辑 `sessions/`**，否则可能无法恢复。需要解析子 agent 产物时读 `wire.jsonl`（结构见 `../../kimi-subagent/references/headless-output.md`）。

### 创建 / 续接（headless 多轮）

- `kimi`：每次直接启动都新建会话。
- `kimi -c`（`--continue`）：续接当前目录最近会话。（v0.19.2 起 #999 主短改为 `-c`，`-C` 降为隐藏别名；≤v0.19.1 仍是 `-C`）
- `kimi -S <id>`（`--session`）：续接指定 id。第一次 `kimi -p` 拿到 session id 后，用 `-S <id> -p "追加要求"` 多轮委派。
- 互斥：`-c` ↔ `-S`。v0.14.2 起 `--auto`/`--yolo`/`--plan` **可**与 `-c`/`-S` 同用（模式应用到续接会话）。
- `--add-dir <path>`（可重复）：给委派的 kimi 加工作目录外的目录；选「记住」写项目级 `.kimi-code/local.toml`。

### 压缩 / 分叉 / 导出

- `/compact [指令]`：上下文接近上限时压缩（长链路委派省 token）。v0.21 后 experimental micro-compaction 已移除，压缩交接摘要会保留后续计划、决策和待复查上下文。
- `/fork`：派生独立副本。v0.24 起保留媒体附件、plan 文件、后台任务输出与 cron；活跃和排队目标仍不带入，fork 失败也不会留下残缺副本。
- `kimi export <id> [-o <path>]` / `/export-debug-zip`：打包会话，便于排查一次委派全过程。⚠️ 导出可能含敏感信息。
- ⚠️ 超出范围：v0.24 Web UI 的 `/export` 下载诊断 ZIP（≤64 MiB），与 TUI `/export`＝`/export-md` 的 Markdown 导出不同。

## 二、Goal 模式（仅 headless 相关）

让 kimi 跨多轮朝**可验证终态**推进。v0.12 起正式发布（≤v0.11 需 `KIMI_CODE_EXPERIMENTAL_GOAL_COMMAND=1`）。

- **`-p` 下用 `/goal <目标>` 创建目标**；v0.24.2 起 `kimi -p "/goal ..."` 会保持运行直到目标进入终态，而不是首个 turn 后退出。退出码：`0` 完成 / `3` 受阻 / `6` 暂停（见 `../../kimi-subagent/references/headless-output.md`）。宿主可据退出码判断委派结果。
- 交互式管理（`/goal status|pause|resume|cancel|replace|next` 等）属 TUI 操作，超出本仓库范围。

## 三、交互式 TUI 功能（超出范围，仅标记）

以下面向人在终端交互，与 subagent 底座无关，**不展开**——需要时查官方 `guides/interaction`：

- 按键：输入/历史、`Ctrl-S` 插话、`Ctrl-O` 折叠、`Ctrl-B` 转后台、`@` 引文件、`Ctrl-V`/`Alt-V` 贴图、`Ctrl-G` 外部编辑器、审批面板操作。
- ⚠️ 超出范围：Shell 模式（v0.20 起，空输入框键入 `!` 或粘贴以 `!` 开头的命令进入，可不离开对话直接跑终端命令、输出写入上下文；`Backspace`/`Esc` 退出，`Ctrl+B` 转后台；v0.22.1 起空 `!` 提示符可用 `↑` 召回历史 shell 命令）——纯 TUI 便捷项。
- 模式切换的交互入口（`Shift-Tab`/`/plan`/`/yolo`/`/auto`）——headless 用对应 flag，见 `cli-reference.md`。
- 可视化 / Web 模式（`kimi vis` / `kimi web` / `kimi server`）。
- 典型用例（理解项目、改 bug、写测试等自然语言场景）。
