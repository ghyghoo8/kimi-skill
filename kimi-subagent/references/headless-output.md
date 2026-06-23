# Headless 输出结构、解析与退出码

`kimi -p` 的输出依 `--output-format` 而定。本文档说明两种格式、解析方法与退出码。

## 两种输出格式

`--output-format` **仅在配合 `-p/--prompt` 时有效**。

| `--output-format` | 用途 | stdout 形态 |
|---|---|---|
| `text`（默认） | 人读 | **transcript 样式**：Assistant 正文以 `•` 开头、换行后两空格缩进——**不是干净纯文本** |
| `stream-json` | 程序解析 | **每行一个 JSON 对象**（JSONL） |

## 流向约定（两种格式通用）

| 内容 | text 模式 | stream-json 模式 |
|---|---|---|
| Assistant 正文 | **stdout**（`•` transcript 样式） | **stdout**（JSONL 的 Assistant 消息） |
| thinking | stderr（`•` 前缀） | **不写入 JSONL**，也不在 stdout |
| 工具进度、"恢复会话"提示 | stderr | stderr |

> 即两种格式都把 **stdout 留给结果、stderr 留给过程**。脚本通常只读 stdout、把 stderr 留作调试：
>
> ```bash
> kimi -p "..." --output-format stream-json 1>out.jsonl 2>progress.log
> ```

## stream-json 逐行结构

每行一个独立 JSON 对象，按时间顺序出现。官方说明的出现规律：

- 普通回复直接输出 **Assistant 消息**。
- 模型调用工具时：先输出**带 `tool_calls` 的 Assistant 消息** → 再输出对应的 **Tool 消息**（工具结果）→ 之后继续输出后续 Assistant 消息。
- 不带 `tool_calls` 的、最后一条 Assistant 消息通常即**最终结论**。
- thinking **不在** JSONL 里，所以逐行解析无需过滤思考内容。

> ⚠️ 官方文档**未公开精确字段名**（没有给 `type`/`role`/`content` 的具体 schema，也无样例行）。首次接入时先跑一条命令把 stdout 落盘观察实际字段，再按观察结果写解析。下面给出**不依赖精确字段名**的稳健解析法。

## 调用方要「格式化数据」时的首选做法

最可靠、跨版本稳定、且**与字段名无关**的方式是 **JSON 契约**——在 prompt 里要求 kimi 最后只输出一段约定结构的 JSON，再从输出中提取：

```bash
kimi -p '在 /repo 下定位并修复登录 500。
完成后，最后一行只输出一段 JSON，不要任何额外文字或代码围栏：
{"root_cause":"...","files_changed":["..."],"summary":"..."}' \
  --output-format text --auto -w /repo
```

- 用 **`text` 模式**时：stdout 末尾是带 `•` 的 transcript 行，取最后一段、剥掉行首 `• ` 与缩进后 `json.loads`。
- 用 **`stream-json` 模式**时：取最后一个非空 JSON 行（即末条 Assistant 消息），从中拿正文文本再 `json.loads` 那段约定 JSON。
- 想更稳可让 kimi 用 **围栏** 包裹（``` ```json … ``` ```），再正则抽取围栏内容——避免被 transcript 前缀干扰。

这样无论 stream-json 内部字段如何变化，调用方都只依赖**自己在 prompt 里约定的结构**。

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
# 末条非空行＝末条 Assistant 消息；若用了 JSON 契约，从中抽出约定 JSON：
import re
last = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
m = re.search(r"\{.*\}", last, re.S)          # 抓最后一行里的 JSON 片段
result = json.loads(m.group()) if m else None  # result 即 prompt 里约定的结构
```

> 始终配 **JSON 契约**（见上一节），解析只依赖你在 prompt 里约定的结构，与 stream-json 内部字段名解耦。

## 退出码

| 退出码 | 含义 |
|---|---|
| `0` | 成功（Goal 模式：目标完成） |
| `3` | Goal 模式：目标被阻断（需用户输入 / 无法达成 / 超预算 / 运行时失败） |
| `6` | Goal 模式：目标被暂停 |
| 其它非 `0` | 失败（被 deny 策略拦截、未登录、模型/网络错误、参数错误等） |

> `-p` 下的 Goal 模式只支持「创建目标」，故有 `3`/`6` 这两个特殊码（详见 `kimi-cli/references/interaction.md`）。

判断成败优先用退出码，其次看 stdout 内容是否符合 prompt 要求。

## 取 session id 以便多轮续接

`stream-json` 事件中通常含本次会话的 id；拿到后用 `kimi -S <id> -p "追加要求"` 续接同一子会话。
若版本不直接暴露 id，可改用 `-c`（续接当前目录最近会话）实现多轮。
