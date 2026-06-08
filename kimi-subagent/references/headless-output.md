# Headless 输出结构、解析与退出码

`kimi -p` 的输出依 `--output-format` 而定。本文档说明两种格式、解析方法与退出码。

## 两种输出格式

| `--output-format` | 用途 | 形态 |
|---|---|---|
| `text`（默认） | 人读 | stdout 直接是 assistant 最终回复纯文本 |
| `stream-json` | 程序解析 | stdout **每行一个 JSON 对象**（JSONL） |

> `--output-format` 仅在配合 `-p/--prompt` 时有效。

## 流向约定

- **stdout**：assistant 的回复内容（`text` 模式为纯文本；`stream-json` 模式为逐行 JSON）。
- **stderr**：thinking / 中间过程，以 `•` 前缀输出。脚本里通常只读 stdout，把 stderr 留作调试。

```bash
kimi -p "..." --output-format stream-json 1>out.jsonl 2>progress.log
```

## stream-json 逐行结构

每行是一个独立 JSON 对象，按时间顺序出现。主要类型：

- **Tool 消息**：记录一次工具调用（工具名、参数、结果等）。
- **Assistant 消息**：模型回复，可能带 `tool_calls`（表示请求调用工具）；不带 `tool_calls` 的、最后一条通常即**最终结论**。

> 具体字段名以本机 `kimi` 版本实际输出为准——首次接入时先跑一条命令把 stdout 落盘观察，再按观察到的结构写解析。下面给出稳健的"无需假设精确字段名"的解析法。

## 解析示例（逐行、取最终回复）

```bash
#!/usr/bin/env bash
set -o pipefail
out="$(kimi -p "$1" --output-format stream-json --auto 2>/dev/null)"
code=$?
# 取最后一个非空 JSON 行作为最终结果载体
final="$(printf '%s\n' "$out" | grep -v '^[[:space:]]*$' | tail -n1)"
echo "exit=$code"
echo "final=$final"
```

Python 解析（宿主用代码委派时）：

```python
import json, subprocess

proc = subprocess.run(
    ["kimi", "-p", task, "--output-format", "stream-json", "--auto", "-w", workdir],
    capture_output=True, text=True,
)
events = []
for line in proc.stdout.splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        events.append(json.loads(line))
    except json.JSONDecodeError:
        pass  # 跳过非 JSON 噪声行

ok = proc.returncode == 0
# 最终结论：最后一条 assistant 类事件的文本（按本机实际字段名取，常见为 content/text）
final_text = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
```

要稳定拿到结构化结果时，最可靠的做法是**在 prompt 里要求 kimi「最后只输出一段 JSON」**，再从末行直接 `json.loads`，而不依赖事件流内部字段。

## 退出码

| 退出码 | 含义 |
|---|---|
| `0` | 成功 |
| 非 `0` | 失败（被 deny 策略拦截、未登录、模型/网络错误、参数错误等） |

判断成败优先用退出码，其次看 stdout 内容是否符合 prompt 要求。

## 取 session id 以便多轮续接

`stream-json` 事件中通常含本次会话的 id；拿到后用 `kimi -S <id> -p "追加要求"` 续接同一子会话。
若版本不直接暴露 id，可改用 `-C`（续接当前目录最近会话）实现多轮。
