---
name: kimi-subagent
description: |
  指引宿主 agent（如 Claude Code / Kimi 主 agent）把 Kimi Code CLI 当作可委派的子 agent：
  通过 headless（`kimi -p`）外壳调用 kimi 在隔离上下文中独立完成一段任务，把全部上下文写进
  prompt，用 `--output-format stream-json` 解析输出，并发派活、多轮续接、按退出码判断成败。
whenToUse: |
  想把一个子任务交给 kimi 独立去跑；需要并行委派多个 kimi 实例；以非交互/脚本方式调用 kimi；
  让 kimi 在某个目录里探索/改代码/写测试并把结果回传；解析 kimi 的 headless 输出或退出码。
---

# 把 Kimi CLI 当子 Agent（headless 委派）

宿主 agent 通过 **shell 调用 `kimi`** 的 **headless / Print 模式**（`-p`），让 Kimi 在一个**完全隔离的上下文**里独立完成任务，再把结果回传给宿主。这是「创建 kimi-subagent」的现实可用路径。

> 前提：本机已安装并登录 kimi（见 `kimi-cli` 子 Skill 的安装/登录）。验证：`kimi --version`。

## 1. 命令骨架

```bash
kimi -p "<完整、自包含的任务描述>" \
  --output-format stream-json \   # 逐行 JSON，便于程序解析；text 是 transcript 样式（非纯文本）
  -m kimi-k2.6 \                  # 可选：指定模型
  --auto \                        # 自动权限：常规工具免确认（headless 默认即 auto 策略）
  -w /path/to/project             # 可选：工作目录
```

- `-p/--prompt`：非交互执行单条指令，**不开 TUI**，执行完即退出。
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

- `-C/--continue`：续接**当前目录最近一次**会话。
- `-S/--session <id>`：续接**指定 id** 的会话。
- 典型用法：第一次 `kimi -p "..."` 派活拿到 session id（从 stream-json 中读取），后续用 `-S <id> -p "追加要求"` 继续，让子 agent 保留之前的上下文。
- 注意互斥：`-C`/`-S` 不能与 `--yolo`/`--auto`/`--plan` 组合（详见 `kimi-cli` 的互斥规则）。

## 5. 并发委派与协作模式

把彼此独立的子任务拆给多个 kimi 实例并行跑，全部完成后由宿主汇总。任务拆分、并发上限、汇总、失败重试、「何时该委派 vs 自己做」 → `references/patterns.md`。

## 6. 成败判断

- 优先看**退出码**（0 成功，非 0 失败），再看 stdout 内容。退出码清单见 `references/headless-output.md`。
- 用 `stream-json` 时，逐行解析；最后一条 assistant 消息通常是最终结论。
- 失败常见原因：未登录（先 `kimi login`）、prompt 上下文不全、被静态 deny 策略拦截、模型/网络错误。
- **宿主程序化集成（subprocess / cron / CI）的系统排错** —— PATH 找不到 kimi、v0.11 语法变更、headless 下 `auth.login_required`（OAuth vs API key 鉴权，含 cron 可用的配置写法）、stream-json 逐行解析实战 → `references/integration-troubleshooting.md`。

## 7. 安全边界

- `--auto` / `-y(--yolo)` 会让子 agent 自动执行工具（含写文件、跑命令）。**只在可信任务、可信工作目录下使用**，优先配合 `-w` 限定目录。
- 对会改动外部状态（提交、推送、删除、联网发布）的委派，先与用户确认，或在 prompt 中明确禁止这类操作。
- 用 `--skills-dir` 收窄能力面，避免子 agent 误用无关技能。

## 8. 最小可用示例

```bash
# 委派 kimi 在某仓库里定位并修复一个 bug，结构化回传
kimi -p '在 /repo 下：用户反馈登录后 500。请定位根因并修复，最后只输出一段 JSON：
{"root_cause": "...", "files_changed": ["..."], "summary": "..."}' \
  --output-format stream-json --auto -w /repo
echo "exit=$?"
```

解析 stdout 的逐行 JSON、取末条 assistant、读退出码 → 见 `references/headless-output.md`。
