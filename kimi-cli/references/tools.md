# 内置工具

依据 https://www.kimi.com/code/docs/kimi-code-cli/reference/tools.html

随核心引擎分发、无需 MCP 即可用。统一审批机制：**只读类**（`Read`/`Grep`/`Glob` 等）默认自动放行，**写入/执行类**（`Write`/`Edit`/`Bash`）默认需审批。YOLO 跳过常规审批（Plan 退出审批不受影响）。MCP 工具命名 `mcp__<server>__<tool>`，见 `mcp.md`。

## 文件类

| 工具 | 默认审批 | 说明 |
|---|---|---|
| `Read` | 自动 | 读文本；`path` + 可选 `line_offset`（支持负数）/`n_lines`；单次≤1000 行或 100KB，超出截断；图片/视频改用 `ReadMediaFile` |
| `Write` | 审批 | `path`/`content`/`mode`(`overwrite`默认/`append`)；父目录须存在 |
| `Edit` | 审批 | 精确替换 `old_string`→`new_string`；默认唯一匹配，多处需 `replace_all:true`；两串不能相同 |
| `Grep` | 自动 | ripgrep；`pattern`/`path`/`type`/`glob`/`output_mode`(`files_with_matches`默认/`content`/`count_matches`)；`content` 支持 `-A/-B/-C/-i/-n/multiline`；`offset`+`head_limit`(默认250,0=不限)；自动滤 `.env`/私钥，`include_ignored=true` 搜被忽略文件但仍滤敏感 |
| `Glob` | 自动 | 按 glob `pattern` 在 `path`(默认 cwd) 匹配，按改时间倒序，≤1000；纯通配/花括号扩展会被拒 |
| `ReadMediaFile` | 自动 | 图片/视频多模态发给模型；仅 `path`，≤100MB；依赖模型 `image_in`/`video_in` |

## Shell

| 工具 | 默认审批 | 说明 |
|---|---|---|
| `Bash` | 审批 | 执行 shell 命令 |

`Bash` 参数：`command`(必填)、`cwd`、`timeout`(ms,前台默认 60s、最长 5min)、`run_in_background`(后台默认 10min 超时)、`description`(后台必填)、`disable_timeout`。前台阻塞并流式显示 stdout/stderr；后台立即返回任务 ID、结束自动通知。stdin 始终关闭（交互命令立即 EOF）。两阶段终止 SIGTERM→5s→SIGKILL。Windows 默认 Git Bash。

## 网络类

| 工具 | 默认审批 | 说明 |
|---|---|---|
| `WebSearch` | 自动 | `query` + 可选 `limit`(1–20,默认5)/`include_content`(默认false)；**需宿主注入实现**，否则不出现在工具列表 |
| `FetchURL` | 自动 | 单 `url`；HTML 抽正文、纯文本/MD 透传；**需宿主注入实现** |

## Plan 模式

| 工具 | 默认审批 | 说明 |
|---|---|---|
| `EnterPlanMode` | 自动 | 进入 Plan；无参 |
| `ExitPlanMode` | 自动（计划需用户确认） | 读计划文件呈给用户审批后退出；可选 `options`(1–3 备选,每项 `label`≤80/`description`,`label` 不重复且不可用保留词 Approve/Reject/...) |

Plan 模式下 `Write`/`Edit` 只能写计划文件，`TaskStop` 被拦截，其余工具（含 `Bash`）按当前权限。

## 状态管理

| 工具 | 默认审批 | 说明 |
|---|---|---|
| `TodoList` | 自动 | 维护子任务列表；`todos`(每项 `title`+`status`：`pending`/`in_progress`/`done`)；省略=查询，空数组=清空 |

## 协作类

| 工具 | 默认审批 | 说明 |
|---|---|---|
| `Agent` | 自动 | 派子 agent；`prompt`+`description`(3–5词)；可选 `subagent_type`(默认 `coder`)/`resume`(与 type 互斥)/`run_in_background`；固定 30min 超时 |
| `AgentSwarm` | swarm 模式自动，否则审批 | 从 `prompt_template`(含 `{{item}}`)+`items` 批量启子 agent，或 `resume_agent_ids` 恢复；≤128 个；等全部完成返聚合报告；并发受 `KIMI_CODE_AGENT_SWARM_MAX_CONCURRENCY` 限（默认起 5、每 700ms +1、不设上限）；权限仅按工具名匹配（不支持 `AgentSwarm(swarm)`） |
| `AskUserQuestion` | 自动 | 结构化提问；`questions`(1–4 题,每题 `question`+`options`(2–4)+可选 `header`≤12/`multi_select`)；自动加「其他」；`background`=true 起后台任务；宿主无交互能力则失败、改文本提问 |
| `Skill` | 自动 | 调已注册 **inline** Skill；`skill`+可选 `args`；仅 `type=inline`、非 `disableModelInvocation`；嵌套≤3 层 |

## 后台任务

| 工具 | 默认审批 | 说明 |
|---|---|---|
| `TaskList` | 自动 | 列后台任务；`active_only`(默认true)/`limit`(默认20,1–100) |
| `TaskOutput` | 自动 | 按 `task_id` 返状态+输出；内联≤32KB、全量在磁盘(`output_path` 用 `Read` 分页)；`block`+`timeout`(默认30,0–3600) 可等完成 |
| `TaskStop` | 审批 | `task_id`+可选 `reason`；对已终止任务安全 |

## 定时任务

绑定会话、`kimi resume` 后仍有效（不带入全新会话），单会话≤50 个；`KIMI_DISABLE_CRON=1` 整体禁用。

| 工具 | 默认审批 | 说明 |
|---|---|---|
| `CronCreate` | 审批 | `cron`(本地时区 5 段)+`prompt`(≤8KB)+可选 `recurring`(默认true,false=一次性触发后删)；返回 8 位 hex `id`/`humanSchedule`/`nextFireAt`；调度有确定性抖动；周期任务存活>7 天后末次触发并删 |
| `CronList` | 自动 | 只读，无参；返 `id`/`cron`/`humanSchedule`/`nextFireAt`/`recurring`/`ageDays`/`stale` |
| `CronDelete` | 审批 | 仅 `id`；不可撤销；Plan 模式下被拦截 |

> 子 agent 体系见 `kimi-subagent/references/patterns.md`；hooks 见 `hooks.md`；斜杠命令见 `slash-commands.md`。
