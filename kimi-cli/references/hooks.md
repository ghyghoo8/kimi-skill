# 钩子（Hooks）完整参考

依据 https://www.kimi.com/code/docs/kimi-code-cli/customization/hooks.html

## 是什么

「当 X 事件发生时，执行这个脚本」。脚本本地运行、可含任意逻辑。常见用途：安全拦截（执行前挡危险 shell 命令）、桌面通知（后台任务完成提醒）、上下文增强（给消息追加 Git 分支信息）。

> hooks 适合提醒与轻量拦截，**不应作为高危操作的唯一安全防线**。

## 机制

CLI 把事件详情（触发原因、工具名、命令内容）打包成 JSON 经 **stdin** 传给脚本；脚本用两路信号决定 CLI 行为：

- **退出码**：`0` 放行；`2` 阻断；其它值默认放行。
- **stdout**：可附带说明文本。

**失败开放（fail-open）**：脚本出错/超时/崩溃不会中断流程。

## 配置：`[[hooks]]`（在 `~/.kimi-code/config.toml`）

```toml
[[hooks]]
event = "PreToolUse"
matcher = "Bash"
command = "node ~/.kimi-code/hooks/block-dangerous-bash.mjs"
timeout = 5
```

仅四个字段，多余字段会导致配置加载失败：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `event` | string | ✅ | 事件名（见下表） |
| `matcher` | string | | 正则过滤；省略则匹配全部 |
| `command` | string | ✅ | 要执行的 shell 命令 |
| `timeout` | int | | 秒（1–600），默认 30 |

## 输入契约（stdin JSON）

每次触发都带基础信息，具体事件追加字段；字段名用 snake_case：

```json
{
  "hook_event_name": "PreToolUse",
  "session_id": "session_abc",
  "cwd": "/path/to/project"
}
```

## 输出契约（退出码 / 返回值）

| 退出码 | 含义 | 行为 |
|---|---|---|
| `0` | 正常 | 放行；stdout 可追加上下文 |
| `2` | 主动阻断 | 停止操作；stderr 作为阻断原因 |
| 其它非 0 | 脚本错误 | 默认放行（fail-open） |
| 超时/崩溃 | 异常终止 | 默认放行（fail-open） |

也可用 JSON 方式阻断：

```json
{
  "hookSpecificOutput": {
    "permissionDecision": "deny",
    "permissionDecisionReason": "请用 rg 代替 grep"
  }
}
```

只有**可阻断事件**（`PreToolUse`、`Stop`、`UserPromptSubmit`）能影响主流程；其余为**观测型**事件，执行但不影响流程推进。

## 事件全表

| 事件 | matcher 目标 | 可阻断 | 说明 |
|---|---|:---:|---|
| `UserPromptSubmit` | 用户文本内容 | ✅ | 发消息时触发；返回文本追加进上下文；阻断则不调模型 |
| `PreToolUse` | 工具名 | ✅ | 执行前（权限检查之前）触发；阻断则不执行工具 |
| `Stop` | 空串 | ✅ | 模型结束一轮时触发；阻断可追加消息以继续 |
| `PostToolUse` | 工具名 | — | 执行后观测 |
| `PostToolUseFailure` | 工具名 | — | 失败/被阻断后观测 |
| `PermissionRequest` | 工具名 | — | 等待审批前观测 |
| `PermissionResult` | 工具名 | — | 审批后观测 |
| `SessionStart` | `startup` / `resume` | — | 新会话或恢复历史时触发 |
| `SessionEnd` | `exit` | — | 关闭后触发 |
| `SubagentStart` | 子 agent 名 | — | 子 agent 执行前触发 |
| `SubagentStop` | 子 agent 名 | — | 子 agent 完成后观测 |
| `StopFailure` | 错误类型 | — | 出错后观测 |
| `Interrupt` | 空串 | — | **用户中断本轮（如按 `Esc`）时触发**（v0.14 新增）；超时/其它程序性中断不触发；中断时 `Stop` **不**触发、由它替代；payload 含 `reason`（观察用） |
| `PreCompact` | `manual` / `auto` | — | 压缩前触发；返回值忽略 |
| `PostCompact` | `manual` / `auto` | — | 压缩后观测 |
| `Notification` | 通知类型（如 `task.completed`） | — | 后台任务状态变化观测 |

## 示例：阻断危险 Bash

```toml
[[hooks]]
event = "PreToolUse"
matcher = "Bash"
command = "node ~/.kimi-code/hooks/block-dangerous-bash.mjs"
timeout = 5
```

```javascript
// block-dangerous-bash.mjs
let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const payload = JSON.parse(input);
  const command = payload.tool_input?.command ?? '';
  if (command.includes('rm -rf')) {
    console.error('检测到危险命令，已阻断');
    process.exit(2);
  }
});
```

## 执行行为

- hook 命令工作目录＝当前会话的项目目录。
- 多条匹配规则**并行**执行；相同命令只跑一次。
- 非 Windows 平台：hook 进程隔离在独立进程组，强杀前先尝试优雅关闭。
