---
name: kimi-subagent
description: |
  指引宿主 agent（如 Claude Code / Kimi 主 agent）把 Kimi Code CLI 当作可委派的子 agent：
  通过 headless（`kimi -p`）外壳调用 kimi 在隔离上下文中独立完成一段任务，把全部上下文写进
  prompt，用 `--output-format stream-json` 解析输出，并发派活、多轮续接、控制后台任务生命周期，
  利用内置 coder 的后台任务、Plan、Skill 与嵌套 Agent 能力，并按退出码判断成败。
whenToUse: |
  想把一个子任务交给 kimi 独立去跑；需要并行委派多个 kimi 实例；以非交互/脚本方式调用 kimi；
  让 kimi 在某个目录里探索/改代码/写测试并把结果回传；解析 kimi 的 headless 输出或退出码；
  让内置 coder 继续拆分任务、后台执行、进入 Plan、调用 Skill 或嵌套 Agent；
  配置 print_background_mode、后台 Bash 或子 Agent 超时。
---

# 把 Kimi CLI 当子 Agent（headless 委派）

宿主 agent 通过 **shell 调用 `kimi`** 的 **headless / Print 模式**（`-p`），让 Kimi 在一个**完全隔离的上下文**里独立完成任务，再把结果回传给宿主。这是「创建 kimi-subagent」的现实可用路径。

> 前提：本机已安装并登录 kimi（见 `kimi-cli` 子 Skill 的安装/登录）。验证：`kimi --version`。

## 1. 命令骨架

```bash
kimi -p "<完整、自包含的任务描述>" \
  --output-format stream-json \   # 逐行 JSON，便于程序解析；text 是 transcript 样式（非纯文本）
  -m kimi-k2.6 \                  # 可选：指定模型
  -w /path/to/project             # 可选：工作目录
```

- `-p/--prompt`：非交互执行指令，**不开 TUI**。无未决后台任务时在主 turn 后退出；v0.24.2 起有后台任务时默认继续等待并把完成结果回灌给主 Agent，Goal 则运行到终态。
- `--output-format <text|stream-json>`：**仅在 `-p` 下有效**。`text`（默认）transcript 样式（`•` 前缀，非干净纯文本）；`stream-json` 逐行 JSON（thinking 不入 JSONL）。
- headless 模式采用 **`auto` 权限策略**：常规工具按 auto 规则自动放行，但**静态 deny 策略仍然生效**。
- 流向：Assistant 正文 → stdout；thinking / 工具进度 / 恢复提示 → stderr。
- **要格式化数据**：用 **JSON 契约**——在 prompt 里要求「最后只输出一段约定 JSON」，再从输出提取，**与内部字段名解耦**。完整解析法、示例、退出码 → `references/headless-output.md`。

## 2. 铁律：上下文必须自包含

子 agent **看不到宿主的任何上下文**——它只收到 `-p` 里的那段 prompt。所以：

- 把**背景、目标、约束、相关文件路径、期望输出格式**全部写进 prompt。
- 不要写「继续刚才的工作」「用上面提到的函数」——子 agent 无「上面」。
- 需要它读文件时给**绝对路径**或配 `-w` 工作目录。
- 想要结构化结果时，在 prompt 里**明确要求输出格式**（如「最后只输出一段 JSON：{...}」）。

## 3. 限定被派 kimi 的能力

- `--skills-dir <dir>`（可重复）：只加载指定目录的 Skills，**替代自动发现**——给子 agent 注入特定技能、屏蔽无关技能。
- `--plan` 让 kimi 先只读探索再规划，但 **`-p` 与 `--plan` 互斥**。需要"只探索不改"时，改用内置 `explore` 取向：在 prompt 里明确「只读分析、不要修改任何文件、产出结论」，并避免授予写权限。
- 模型按任务选：复杂工程/Agent 任务用 `kimi-k2.6`；详见 `kimi-api` 的模型列表。

## 4. 多轮委派（续接同一子会话）

- `-c/--continue`：续接**当前目录最近一次**会话。（v0.19.2 起主短为 `-c`；`-C` 是隐藏别名）
- `-S/--session <id>`：续接**指定 id** 的会话。
- 典型用法：第一次 `kimi -p "..."` 派活拿到 session id（从 stream-json 中读取），后续用 `-S <id> -p "追加要求"` 继续，让子 agent 保留之前的上下文。
- v0.14.2 起 `-c`/`-S` **可**与 `--auto`/`--yolo`/`--plan` 组合（模式应用到续接会话）；但 `-p` 仍与 `--yolo`/`--auto`/`--plan` 互斥（详见 `kimi-cli` 的互斥规则）。

## 5. 并发委派与协作模式

把彼此独立的子任务拆给多个 kimi 实例并行跑，全部完成后由宿主汇总。任务拆分、并发上限、汇总、失败重试、「何时该委派 vs 自己做」 → `references/patterns.md`。

> **v0.26.0 起的内部递归委派**：外层 `kimi -p` 里的内置 `coder` 子 Agent 已能运行后台 Shell、维护待办、进入 Plan、调用 Skills，并继续派发自己的嵌套 Agent；它会等自己的后台任务全部落定后才向上层报告完成。这是 **Kimi 进程内部**的拆分能力，与宿主并行启动多个 `kimi -p` 是不同层次；详细边界见 `references/patterns.md`。

> **v0.24.2 起的当前 print 语义**：`kimi -p` 默认 `print_background_mode = "steer"`。只要还有未决后台任务，进程就保持运行；每次完成结果以合成 user 消息回灌给主 Agent，触发后续 turn，直到没有未决任务。print 模式下后台 Bash 与子 Agent 默认也不设超时。需要旧的一轮后退出可设 `[background] print_background_mode = "exit"`；只等待但不回灌结果用 `"drain"`。完整字段与版本门控见 `kimi-cli/references/config-files.md`。

## 6. 成败判断

- 优先看**退出码**（0 成功，非 0 失败），再看 stdout 内容。退出码清单见 `references/headless-output.md`。
- 用 `stream-json` 时，逐行解析；最后一条 assistant 消息通常是最终结论。
- 失败常见原因：未登录（先 `kimi login`）、prompt 上下文不全、被静态 deny 策略拦截、模型/网络错误。
- **反复 `provider.connection_error`（超时）别先怪服务**：curl 打端点秒回只到网关层，kimi 是到模型后端那跳超时；**宿主沙箱/受限出网会放大这个失败**（同一时刻沙箱挂、非沙箱通）。先换非沙箱/直连验证 → `references/integration-troubleshooting.md` 第 3d 节。
- **宿主程序化集成（subprocess / cron / CI）的系统排错** —— PATH 找不到 kimi、v0.11 语法变更、headless 下 `auth.login_required`（OAuth vs API key 鉴权，含 cron 可用的配置写法）、代理大小写、connection_error 与沙箱、stream-json 逐行解析实战 → `references/integration-troubleshooting.md`。

## 7. 安全边界

- `--auto` / `-y(--yolo)` 会让子 agent 自动执行工具（含写文件、跑命令）。**只在可信任务、可信工作目录下使用**，优先配合 `-w` 限定目录。
- 对会改动外部状态（提交、推送、删除、联网发布）的委派，先与用户确认，或在 prompt 中明确禁止这类操作。
- 用 `--skills-dir` 收窄能力面，避免子 agent 误用无关技能。

## 8. 最小可用示例

```bash
# 委派 kimi 在某仓库里定位并修复一个 bug，结构化回传
kimi -p '在 /repo 下：用户反馈登录后 500。请定位根因并修复，最后只输出一段 JSON：
{"root_cause": "...", "files_changed": ["..."], "summary": "..."}' \
  --output-format stream-json -w /repo
echo "exit=$?"
```

解析 stdout 的逐行 JSON、取末条 assistant、读退出码 → 见 `references/headless-output.md`。

## 9. 程序化封装的三条实测教训（宿主把委派封装成函数时）

宿主常把 §1 的 headless 调用封装成一个 Python/JS 函数复用。三条踩过的坑：

- **raw 原文 vs 强制 JSON 解析**：封装若默认把输出走 JSON 解析（图省事直接拿 dict），则 kimi 返回 **Markdown 表/自由文本时会解析失败抛错**——**数据其实已经拿到,只是解析层挂了**。要 Markdown/自由结论时走「**原文/raw**」模式;只在确需结构化时才用 JSON 模式(配合 §1 的 JSON 契约要求 kimi「最后只输出一段 JSON」)。
- **委派"取数"而非"合成"**：把**取数据/查财报/批量对比**派给 kimi 省宿主(贵模型)token;但**"写结论/合成/点评"别外包**——kimi 为合成会再去调数据源/工具,易**超时**。**取数给子 agent、合成留宿主**。
- **数据目标的可达性边界**：某些数据源/标的封装网关**取不到**(如特定交易所代码格式不被识别),需在宿主侧**降级到专用数据源**,别假设 kimi 全能;先小样本验证可达性再批量委派。

> 多 provider 异源对抗(同一封装接多家模型互换跑、降低单模型偏差)是进阶用法——把上面「raw 拿原文 + 容错解析」做成统一接口即可横向扩展到多家。

> 深入:输出格式与解析(raw/stream-json/JSON 契约)→ `references/headless-output.md`;鉴权/PATH/超时等封装坑 → `references/integration-troubleshooting.md`;何时该委派 → `references/patterns.md`。
