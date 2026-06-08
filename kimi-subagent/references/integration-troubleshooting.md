# 宿主程序化集成 Kimi 的踩坑与排错

把 Kimi Code CLI 当子 agent，从**宿主程序**（Python `subprocess` / cron / CI / 另一个 agent）以 headless（`kimi -p`）方式调用时，比在交互终端里多几类坑。本文汇总实战排错——尤其是**自动化场景的鉴权**，这是最容易卡住、且文档分散的一块。

> 适用：宿主用代码反复 `subprocess.run(["kimi", "-p", ...])`，要稳定、可在 cron/CI 跑、可解析输出。

---

## 1. PATH：非交互/cron 下 `kimi not found`

**现象**：交互终端能跑，但从 subprocess / cron 调用报 `kimi not found`。

**根因**：CLI 装在 `~/.kimi-code/bin`，该目录只在**登录 shell** 的 PATH 里；非登录 shell（cron、`subprocess` 默认环境）的 PATH 不含它。

**解法**（健壮做法，按优先级回退）：

```python
import shutil
from pathlib import Path

def resolve_kimi_bin() -> str:
    found = shutil.which("kimi")
    if found:
        return found
    for cand in (Path.home() / ".kimi-code/bin/kimi",
                 Path.home() / ".local/bin/kimi"):
        if cand.exists():
            return str(cand)
    return "kimi"  # 兜底，触发 FileNotFoundError → 友好提示安装
```

或在 cron/脚本里 `export PATH="$HOME/.kimi-code/bin:$PATH"`。

---

## 2. 语法：`unknown option '--print'`（v0.11+）

旧版的 `--print --quiet` 已**移除**。v0.11+ headless 一律用 `-p/--prompt`：

| 旧（失效） | 新（v0.11+） |
|---|---|
| `kimi --print --quiet -p "..."` | `kimi -p "..."` |

附带约束：
- `--output-format` **只能与 `-p` 一起用**。
- `--yolo` / `--auto` **与 `-p` 互斥**——`-p` 非交互模式**固定使用 auto 权限**，无需也不能再加这两个。

---

## 3. 鉴权：headless 下 `auth.login_required`（最大的坑）

**现象**：subprocess 调用报
```
error: failed to run prompt: auth.login_required:
OAuth provider "managed:kimi-code" requires login before it can be used.
```
但你在交互终端**明明登录过**、甚至几分钟前还能跑。

**根因（两层）**：
1. `config.toml` 的 `default_model` 指向一个 **OAuth provider**（典型是 `managed:kimi-code`，其 `api_key = ""`，靠 `[providers."managed:kimi-code".oauth]` 走设备码登录）。
2. **OAuth 登录态在非交互 subprocess 中不可见/易失效**，且**时效很短**（实测几分钟就要重登）——不适合自动化。

**❌ 常见误区**：`export KIMI_API_KEY=...` 想让它用 API key —— **无效**。官方明确：
> `api_key` / `base_url` **只从 `config.toml` 读，shell `export` 不生效**。

所以光 export 环境变量，CLI 不会拿去当 provider 的 api_key。

**✅ 正解：自动化场景改用 API key 鉴权（而非 OAuth）**

在 `config.toml` 里配一个**用 API key** 的 provider + model，让宿主调用时 `--model` 指向它。要让 key 来自环境变量（不硬编码进 config），用 `[providers.<name>.env]` 子表引用：

```toml
# 自动化专用 provider：用环境变量 KIMI_API_KEY 鉴权，免 OAuth
[providers.kimi-apikey]
type = "kimi"
base_url = "https://api.kimi.com/coding/v1"

[providers.kimi-apikey.env]
api_key = "KIMI_API_KEY"          # 引用环境变量名（非明文 key）

[models.kimi-apikey]
provider = "kimi-apikey"
model = "kimi-k2.6"
max_context_size = 256000
```

> 注意优先级：`[providers.<name>].api_key`（直接明文）＞ `[providers.<name>.env]` 子表 ＞ 两者皆空则报错。要走 env 子表，别在同 provider 再填明文 `api_key`。

宿主调用时**把 key 注入子进程环境** + **显式选这个 model**：

```python
import os, subprocess
env = dict(os.environ)
env["KIMI_API_KEY"] = read_key_from_dotenv()   # 从 .env / secret 读
subprocess.run(
    [resolve_kimi_bin(), "-p", prompt,
     "--output-format", "stream-json",
     "--model", "kimi-apikey"],
    env=env, capture_output=True, text=True, timeout=120,
)
```

**完整鉴权链路**：宿主读 key → 注入 subprocess `env` → config `[providers.kimi-apikey.env]` 按名取环境变量 → API key 鉴权 → **完全免 OAuth、可 cron**。

> 这样**不动全局 `default_model`**——交互终端仍用原来的（OAuth）model，只有项目代码显式 `--model kimi-apikey` 时走 API key。互不干扰。

**排错对照**：

| 报错 / 现象 | 真因 | 处理 |
|---|---|---|
| `auth.login_required: managed:kimi-code` | 默认 model 走 OAuth provider | 改用 API key model（上方）|
| export KIMI_API_KEY 了还报 login_required | api_key 不从 shell 读 | 必须在 config.toml 配 |
| 交互能跑、subprocess 不能 | OAuth 态非交互不可见 | 用 API key |
| 跑一会儿又 login_required | OAuth 时效短 | 用 API key（无时效问题）|
| `401`（直测 API） | key 失效/过期 | 换有效 key |

---

## 4. stream-json 输出解析（实战字段）

`-p --output-format stream-json` 每行一个 JSON 对象。**官方未公开精确 schema**，以下是实测到的稳定字段，配合 prompt 里的 **JSON 契约**使用：

| 消息 | 实测形态 | 处理 |
|---|---|---|
| 最终结论 | `{"role":"assistant","content":"..."}` | **取末条这类消息** |
| 中间（调工具）| `{"role":"assistant","tool_calls":[...]}` | 跳过 |
| 工具结果 | `{"role":...,"tool_call_id":"...","content":"..."}` | 要原始数据时**从这里取**（绕过 LLM 整理）|
| 会话提示 | `{"role":"meta","type":"session.resume_hint",...}` | **跳过**（常是最后一行，别误当结论）|

稳健提取末条结论（Python）：

```python
import json
def extract_final(stdout: str) -> str:
    final = ""
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        if d.get("type") == "session.resume_hint":      # 跳过恢复提示
            continue
        if d.get("tool_call_id") or d.get("tool_calls"): # 跳过工具/中间消息
            continue
        c = d.get("content")
        if isinstance(c, str):
            final = c
        elif isinstance(c, list):
            final = "".join(b.get("text", "") for b in c if isinstance(b, dict))
    return final
```

> ⚠️ 不要简单"取最后一行"——末行往往是 `session.resume_hint`，不是结论。
>
> 配合 **JSON 契约**：在 prompt 里要求"最后只输出一段约定结构 JSON（可用 ```json``` 围栏）"，再从 `content` 里 `json.loads`。这样无论内部字段怎么变，只依赖你自己约定的结构。

---

## 5. 退出码与超时

- `subprocess` 设 `timeout`（headless + 工具调用可能数十秒），超时捕获 `TimeoutExpired`，保留已有 stdout 便于调试。
- `returncode != 0`：读 **stderr**（过程/错误在 stderr，结果在 stdout）。
- 约定上"过程写 stderr、结果写 stdout"——脚本只读 stdout，stderr 留作排错。

---

## 速查：一条能在 cron 里稳定跑的调用

```bash
KIMI_API_KEY="$(grep '^KIMI_API_KEY=' .env | cut -d= -f2- | tr -d '"'"'"' ')" \
PATH="$HOME/.kimi-code/bin:$PATH" \
kimi --model kimi-apikey -p '查询并最后只输出 JSON：{"x":1}' \
     --output-format stream-json 1>out.jsonl 2>progress.log
```

要点齐了：PATH 兜底、API key 免 OAuth、`-p` + stream-json、stdout/stderr 分流。
