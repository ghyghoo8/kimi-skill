---
name: kimi-datasource
description: |
  kimi-datasource 是 Kimi Code 的数据网关（金融行情/财报、企业工商股权、宏观、学术）。本 Skill 基于
  插件源码逆向，教你**直连网关 HTTP**（`POST api.kimi.com/coding/v1/tools`）用静态 API key 取结构化数据，
  绕开 OAuth 15 分钟过期 + `kimi -p` LLM 中转。也涵盖在 CLI 里用自然语言问数。
whenToUse: |
  程序化/批量取金融数据（A股/港股/美股行情、技术指标、财报三表、股东、主营分部、选股、宏观 World Bank）；
  取企业工商/股权/实控人/司法风险（系统盲区）；取学术文献（arxiv/scholar）；
  想绕开 OAuth 登录态/15min token 过期、想要结构化原始字段而非 LLM 整理后的文本时。
---

# kimi-datasource 数据网关（源码逆向版）

> **本 Skill 基于插件源码逆向，不再依据官方使用说明。** 官方文档把它讲成"自然语言问数的黑盒插件"，
> 但源码显示它只是 **Kimi Code 网关 HTTP 端点的薄封装**——可直接 HTTP 调用，拿结构化数据。
> 重新逆向方法 + 完整 API 目录见 [references/gateway-api.md](references/gateway-api.md)。

## 一句话本质

`kimi-datasource` managed 插件（v3.2.0，`bin/kimi-datasource.mjs`）= 读 Kimi Code OAuth 凭证 → `POST <KIMI_CODE_BASE_URL>/tools`，body `{"method": ..., "params": ...}`，带 `Authorization: Bearer <token>` + 一组 `X-Msh-*` 头。**没有任何本地数据逻辑，全在网关后端。** 所以宿主程序可以**完全甩开插件/CLI，自己直连网关**。

> 当前 managed MCP 只暴露两个工具：`get_data_source_desc` 与 `call_data_source_tool`。旧的 `query_stock` / `get_stock_realtime_price` 快捷路径已不再是插件入口；直连封装也应优先走“先 desc、再 call”的通用流程。

## 鉴权真相（源码实测，纠正官方"必须 OAuth"的说法）🔴

网关 **同时接受两种 Bearer 凭证**：

| 凭证 | 形态 | 寿命 | 来源 |
|---|---|---|---|
| **静态 API key**（推荐程序化用）| `sk-kimi-...` | **永不过期** | `config.toml` 的 `api_key` / 环境变量 `KIMI_API_KEY` |
| OAuth access_token | JWT | **15 分钟**（陷阱）| `~/.kimi-code/credentials/kimi-code.json` 或环境隔离凭证，`kimi login` 写入 |

- **官方/managed 插件用 OAuth JWT，且源码里显式校验 `expires_at` 过期就抛 `access_token expired`**——这就是 headless/subprocess 下"登录后只有 15 分钟可用、之后全失败"的根因（refresh_token 虽有效，但非交互态不触发静默续期）。若设置 `KIMI_CODE_OAUTH_HOST` / `KIMI_CODE_BASE_URL`，凭证文件名会变成 `kimi-code-env-<hash>.json`，与当前 Kimi Code 环境隔离。
- **直连网关时改用静态 API key（`Bearer sk-kimi-...`）即可彻底规避**：永不过期、不依赖 `kimi login`、不需要 `KIMI_CODE_HOME`、不需要代理可达 `auth.kimi.com`。

## 当前推荐的两个网关 method

| method | 用途 |
|---|---|
| `get_data_source_desc` | 取某数据源的 API 目录（参数 `{"name": "<源名>"}`）|
| `call_data_source_tool` | 通用调度：`{"data_source_name", "api_name", "params"}` 调任意源的任意 API |

旧版曾有 `get_stock_realtime_price` / `query_stock` 快捷入口；managed 插件 3.1.0 起已移除快捷工具，统一要求先 `get_data_source_desc` 再 `call_data_source_tool`。不要把 legacy method 当成当前封装主路径。

## 七个数据源（`get_data_source_desc` 的 enum）

`stock_finance_data`（金融：行情/财报/股东/主营/选股）· `tianyancha`（天眼查：工商/股权/司法，226 API）· `yahoo_finance` · `world_bank_open_data`（宏观）· `arxiv` · `scholar` · `yuandian_law`

> **取个股工商/实控人**：`stock_finance_data_get_stock_info(ticker)` 最省事（用 ticker，直接给实控人/控股股东/股权比例/经营范围）；只有不知道公司全称时才用 `tianyancha`。

## 最小直连示例（Python，零依赖）

```python
import json, urllib.request, uuid, os
KEY = os.environ["KIMI_API_KEY"]                    # sk-kimi-...，永不过期
def gw(method, params):
    body = json.dumps({"method": method, "params": params}).encode()
    hdr = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json",
           "X-Msh-Tool-Call-Id": str(uuid.uuid4()), "X-Msh-Platform": "kimi-code-cli",
           "X-Msh-Version": "3.2.0", "X-Msh-Device-Id": "kimi-datasource",
           "User-Agent": "kimi-datasource/3.2.0"}
    req = urllib.request.Request("https://api.kimi.com/coding/v1/tools",
                                 data=body, headers=hdr, method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

# 财报（显式报告期，避免"选错最近一期"）
gw("call_data_source_tool", {"data_source_name": "stock_finance_data",
   "api_name": "stock_finance_data_get_financial_statements",
   "params": {"ticker": "601225.SH", "statement": "all",
              "financial_parameter": "20241231", "file_path": "/tmp/fs.csv",
              "format": "json"}})
```

返回通常是 `{"is_success": true, "result": {"user": [{"type":"text","text": "<JSON/CSV 预览>"}], ...}, "files": [...]}`。
managed 插件会把 `files[]` 写回 `params.file_path` 或同目录同后缀的分片文件，并在工具输出末尾附加 `[kimi-datasource] request-id ... tool-call-id ...` 便于后端排查。直连封装应保留这两个能力：解析 `result.user/assistant[].text`，并按 `files[]` 写盘。
原始字段是同花顺 iFinD 口径（`ths_*_stock`，如 `ths_roe_stock` ROE、`ths_net_sales_rate_stock` 净利率）。
完整字段表 + 各 API 参数见 [references/gateway-api.md](references/gateway-api.md)。

## 何时直连 vs 何时走 CLI 自然语言

- **直连网关 HTTP（首选程序化/批量/系统集成）**：要结构化原始数据、要稳定、要免 token 过期、要显式传报告期。**就是上面的写法。**
- **CLI 自然语言（`kimi -p "查..."`）**：人在终端临时问、或需要 LLM 跨源编排+总结。代价：按次计费 + LLM 中转可能选错报告期 + OAuth 15min 过期。见下方"坑"。

## 程序化调用的两个老坑（直连可同时规避）

1. **自然语言查"最近一期"会选错报告期** 🔴：经 LLM 中转时 agent 常把报告期设成去年同期还自称"最新"。→ **直连时显式传 `financial_parameter=20260331`**，根治。
2. **`text` 输出是 LLM 整理后文字**，带认知偏差。→ 直连拿 `result.user/assistant[].text` 与 `files[]` 里的原始 CSV/JSON，不经 LLM 润色。

## 使用规范

1. **只读**：仅查询，无写入/交易。
2. **静态 key 计费**：仍消耗账号额度（按次），但免登录态烦恼。
3. **核对标的**：A股 `.SH/.SZ/.BJ`、港股 `.HK`、美股 `.O/.N/.A`；先确认代码不要凭记忆猜。
4. **实时数据受交易时段限制**：盘后改查收盘/历史。
5. **免责**：AI/数据输出仅供参考，不构成投资建议。

## 维护：这是源码逆向的 Skill

**本 Skill 内容来自逆向插件源码与实测网关，不再跟随官方使用说明。** 升级/校验方法（端点、method、数据源 enum、API 参数变了怎么办）见 [references/gateway-api.md](references/gateway-api.md) 末节「如何重新逆向校验」。

> 权威来源（仅供交叉验证，不作为 Skill 主依据）：插件源码 `~/.kimi-code/plugins/managed/kimi-datasource/bin/kimi-datasource.mjs`；官方文档 https://www.kimi.com/code/docs/kimi-code-cli/customization/datasource.html
