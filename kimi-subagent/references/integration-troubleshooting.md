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

> 后端返回的完整错误目录（401/402/403/429/400/404/500 + 工具错误）→ `../../kimi-cli/references/error-reference.md`。

---

## 3b. kimi-datasource 等 MCP 插件：数据服务的**第二套**鉴权（`KIMI_CODE_HOME`）

⚠️ 把第 3 节的 API key 鉴权配好后，**纯 LLM 调用通了，但一调 `kimi-datasource` 数据工具仍报 `provider.connection_error`** —— 因为**插件的数据服务鉴权与 LLM provider 是两套**：

| 环节 | 鉴权 | 凭证来源 |
|---|---|---|
| LLM 推理 | API key（`kimi-apikey` model）| 进程环境 `KIMI_API_KEY` |
| **datasource 数据服务** | **OAuth 凭证（Bearer token）** | `KIMI_CODE_HOME` 下的 `oauth/...` 凭证文件 |

datasource 的 MCP server（`kimi-datasource.mjs`）用 **`KIMI_CODE_HOME`** 定位 OAuth 凭证文件（默认 `~/.kimi-code`）。**非交互 subprocess 默认没有这个环境变量 → 定位不到凭证 → `connection_error`**。

**解法：把 `KIMI_CODE_HOME` 一并注入子进程**：

```python
env.setdefault("KIMI_CODE_HOME", os.path.join(os.path.expanduser("~"), ".kimi-code"))
```

补上后，`kimi-apikey`(LLM) + datasource(OAuth 凭证文件) 两套鉴权各司其职，subprocess 即可调通数据插件（实测能拿到真实行情/财报，如 `close_summary` close=1262.98 / 财报净利率精确匹配）。

> 关键认知：API key **只解决 LLM 那一半**；datasource 数据服务**仍需 OAuth 凭证**（先在交互端 `/login` 写入凭证文件），API key 替代不了。
>
> 若 `KIMI_CODE_HOME` 已注入、凭证也在，仍报 `provider.connection_error` 或 `Kimi Code access_token has expired. Run /login again`（且**不在** 401/403/429 错误表里）：**先查第 3c 节的代理大小写**——实测里这类"过期/连不上"绝大多数是 Node 没吃到代理、够不到 `auth.kimi.com` 续期，而非真的凭证失效或服务端波动。排除代理后仍间歇失败，才考虑是数据服务后端 RPC 波动（重试 / 等恢复）。

---

## 3c. 代理：Node 的 fetch 只认**大写** `HTTPS_PROXY`（最隐蔽的坑）

> ✅ **v0.12 起官方支持代理变量、大小写都认（含 SOCKS）**，本节这个坑已修复——v0.12 直接用小写 `https_proxy` 也能续期。**以下仅适用于 ≤v0.11**（或仍想显式控制时）。

⚠️ 需翻墙/代理出网的环境里，**最容易被误判成"OAuth 过期"的其实是代理没传到位**。

**现象**：subprocess 调 datasource 报 `Kimi Code access_token has expired. Run /login again`，或 `kimi login` 报 `OAuth request to https://auth.kimi.com/api/oauth/token failed: fetch failed`。一看凭证——`access_token` 确实过期了，但 **`refresh_token` 还有效**（可解 JWT 看 `exp`，通常一个月）。照理 CLI 该用 refresh_token 静默续期，却续不了。

**根因**：kimi 是 Node 应用，其 fetch（undici）**只读大写 `HTTPS_PROXY` / `HTTP_PROXY`**；而很多 shell（clash/v2ray 默认）**只导出小写 `https_proxy` / `http_proxy`**（外加一个 socks 的 `ALL_PROXY`）。于是 Node **拿不到代理 → 直连 `auth.kimi.com` 失败 → refresh_token 用不上 → 表现为"access_token 过期、要重登"**。`access_token` 短命（实测 `expires_in: 900`，15 分钟），一过这窗口就触发，极具迷惑性。

**验证**（一眼区分代理问题 vs 真失效）：

```bash
# 经代理可达 → 405（GET 打了 POST 端点，405 说明"通了"）；直连 → 000（不通）
curl -s -o /dev/null -w "proxy:%{http_code}\n"            --max-time 12 https://auth.kimi.com/api/oauth/token
curl -s -o /dev/null -w "direct:%{http_code}\n" --noproxy '*' --max-time 12 https://auth.kimi.com/api/oauth/token
```

若 `proxy:405 / direct:000`，就是代理没传给 Node。

**解法**：给子进程把小写代理**镜像成大写**（宿主代码里做，免改用户 shell）：

```python
for up, lo in (("HTTPS_PROXY", "https_proxy"), ("HTTP_PROXY", "http_proxy")):
    if not env.get(up) and env.get(lo):
        env[up] = env[lo]
```

或临时命令行直接显式给大写：`HTTPS_PROXY=http://127.0.0.1:7890 kimi login`。补上后 `kimi login` **静默用 refresh_token 换出新凭证（无需设备码）**，datasource 立即可用（实测茅台 close=1262.98 / 五粮液 79.96，报告期正确）。

> 排查顺序记牢：**报 access_token expired / connection_error，先验代理大小写，再怀疑凭证或服务端**。多数情况下 refresh_token 没失效，只是 Node 够不到续期端点。

---

## 3d. `provider.connection_error` 间歇：先排查**宿主执行环境的网络**（沙箱/受限网络放大）

⚠️ 反复撞 `provider.connection_error: Connection error.`（日志里 `at listOnTimeout`，即**超时**）时，**别急着归因"kimi 服务宕"或"自己代码错"——先确认宿主调用 kimi 的网络路径本身是否受限**。

**关键认知：错误分两层，curl 测不到真正翻车的那层**

| 探测 | 现象 | 含义 |
|---|---|---|
| `curl` 打 `api.kimi.com/coding/v1/...` | **HTTP 403 / 401，秒回** | 只到了**网关层**（403=非 coding-agent 白名单，401=没带 key）。网关健康 ≠ 后端健康 |
| kimi CLI（白名单内 agent） | `connection_error` 超时 | 穿过网关、**到模型推理后端那一跳**超时——curl 够不到这层，所以 **curl 永远"正常"、kimi 却 flap** |

**沙箱/受限网络是放大器（实测，最隐蔽）**：宿主若在**受限网络环境**里 spawn kimi —— 如某些 AI agent 的 Bash **沙箱**、容器/CI 的受限出网、网络命名空间隔离 —— 这层会给"到模型后端"那一跳**叠加开销/不稳**。后端本身有边际延迟波动时，**沙箱内先崩、非沙箱/直连还扛得住**：
- 实测同一时刻、同一条命令：**沙箱内单发 4/4 `connection_error`，沙箱外 + 真实交互终端都成功**；服务良好窗口里两者都通。
- 即**失败概率被执行环境放大了**，不代表服务整体不可用，更不代表 kimi 配置/代码有错。

**定位法（一分钟分清"环境放大" vs "服务真宕"）**：
1. **换非沙箱/直连环境**跑同一条裸命令（`kimi --model <m> -p 'hi' --output-format stream-json`）。
2. 若**非沙箱通、沙箱挂** → 是宿主执行环境的网络，不是 kimi。把 kimi 调用放到**非受限网络**里跑（如关闭该 agent 的网络沙箱、放宽容器出网）。
3. 若**非沙箱也挂** → 才是服务端/网络真波动，重试或等恢复。

**工程兜底**：v0.24.2 起 Kimi 内部对每步瞬时 LLM 失败默认最多重试 10 次（`loop_control.max_retries_per_step`）；但这不覆盖进程启动、宿主网络或整体 `exit=75`。宿主 `subprocess` 仍应对 `connection_error`/超时/`exit=75`/网关 5xx 做外层**自动重试 + 指数退避**；受限网络下重试帮助有限，根治要换执行环境。

> 一句话：`connection_error` 先怀疑**自己这侧的网络路径（沙箱/受限出网）**，再怀疑服务端——多数"间歇宕"是执行环境放大的假象。

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
