# kimi-datasource 网关 API 完整目录（源码逆向）

> 逆向自 `~/.kimi-code/plugins/managed/kimi-datasource/bin/kimi-datasource.mjs`（managed 插件）
> + 老插件 `~/.kimi/plugins/kimi-datasource/scripts/query_stock.py` + 实测网关。
> 校验日 2026-06-18，对应 datasource 插件 v3.2.0 / v2.0.1。**末节有重新逆向校验法。**

## 1. 网关传输层

- **端点**：`POST https://api.kimi.com/coding/v1/tools`
- **body**：`{"method": "<method>", "params": {...}}`
- **必带 headers**：
  ```
  Authorization: Bearer <token>          # 静态 API key sk-kimi-... 或 OAuth JWT
  Content-Type: application/json
  X-Msh-Tool-Call-Id: <uuid4>
  X-Msh-Platform: kimi_cli
  X-Msh-Version: kimi-datasource
  X-Msh-Device-Id: kimi-datasource       # 可任意稳定值
  User-Agent: kimi-datasource/2.0
  ```
  （`X-Msh-Device-Name/Model/Os-Version` 可选，缺省不影响。）
- **超时**：官方实现 30s。

### 鉴权（关键）
- 网关认 **静态 API key（`sk-kimi-...`，永不过期）** 与 **OAuth JWT（15min）** 两种 Bearer。
- managed 插件 `loadAccessToken()` 读 `~/.kimi-code/credentials/kimi-code.json` 的 `access_token` 并校验 `expires_at`，过期抛 `Kimi Code access_token has expired. Run /login again.`——**这是 15min 魔咒来源**。
- 老插件 `query_stock.py` 硬编码读 `~/.kimi/credentials/kimi-code.json`，其 `access_token` 字段存的就是静态 API key。
- **程序化直连一律用静态 API key**（从 `config.toml` `api_key` 或 `KIMI_API_KEY` 取），不碰 OAuth。
- 注：raw curl 打 `/coding/v1/chat/completions` 会被网关挡（`Kimi For Coding only available for Coding Agents`），但 `/coding/v1/tools` 带上述 `X-Msh-*` 头不受此限。

## 2. 响应结构

成功：
```json
{"is_success": true,
 "result": {"user": [{"type": "text", "text": "{ \"data_preview\": \"<CSV>\" }"}],
            "assistant": [{"type": "text", "text": "..."}]}}
```
- 结构化数据在 `result.user[].text`，是一段 JSON，内含 `data_preview`（CSV 文本）。
- 同时把完整 CSV 写到 `params.file_path`（混合 A+港会拆 `_a.csv`/`_hk.csv`）。

失败：
```json
{"is_success": false, "error": {"user": [{"type": "text", "text": "PARAMETER_ERROR - Missing required parameters: ..."}]}}
```
- `PARAMETER_ERROR` = 鉴权已过、只是参数不全（说明 key 有效）。鉴权失败则是 HTTP 401/403。

## 3. 三个网关 method

| method | params | 说明 |
|---|---|---|
| `get_stock_realtime_price` | `{ticker, type, file_path, time?}` | legacy 直达；`type`∈ `realtime_price`/`realtime_tech`/`open_summary`/`close_summary`；≤3 标的 |
| `get_data_source_desc` | `{name}` | `name`∈ 见 §4；返回该源 Markdown API 目录 |
| `call_data_source_tool` | `{data_source_name, api_name, params}` | 通用调度，调任意源任意 API |

## 4. 七个数据源（`get_data_source_desc` 的 enum）

`stock_finance_data` · `tianyancha` · `yahoo_finance` · `world_bank_open_data` · `arxiv` · `scholar` · `yuandian_law`

## 5. stock_finance_data —— 金融（10 个 API）

ticker 格式：A股 `XXXXXX.SH/SZ/BJ`、港股 `XXXX.HK`、美股 `XXXX.O/N/A`；多标的逗号分隔（多数 ≤10）。

| api_name | 关键 params | 用途 |
|---|---|---|
| `stock_finance_data_get_financial_statements` | `ticker, statement, financial_parameter, file_path, format=json` | **财报三表**。`statement`∈ `all`/`balance_sheet`/`income_statement`/`cash_flow`（别名 bs/is/cf，可逗号）；`financial_parameter`=报告期 `YYYYMMDD`（`0331`Q1/`0630`半年/`0930`Q3/`1231`年报）|
| `stock_finance_data_get_stock_info` | `ticker, file_path` | **工商/股权**：简称/注册资本/控股股东+持股比/**实控人**+持股比+类型/企业类型/经营范围（系统盲区，**用 ticker 即可，比 tianyancha 省事**）|
| `stock_finance_data_get_holder_info` | `ticker, file_path` | 股东明细：名称/持股量/比例/类型/户数变化/机构持仓 |
| `stock_finance_data_get_stock_business_segmentation` | `ticker, financial_parameter, file_path` | 主营分部（行业/产品/地区的营收/成本/毛利）|
| `stock_finance_data_get_stock_financial_index` | `ticker, ...` | 财务指标（预算成比率）|
| `stock_finance_data_get_price` | `ticker, ...` | 历史价 |
| `stock_finance_data_get_stock_realtime_price` | `ticker, ...` | 实时价 |
| `stock_finance_data_get_forecast` | `ticker, ...` | 业绩预告（仅 A 股）|
| `stock_finance_data_get_stock_announcement` | `ticker, ...` | 公告（仅 A 股）|
| `stock_finance_data_get_related_stock` | `ticker, ...` | 关联股 |

### 财报原始字段口径（同花顺 iFinD `ths_*_stock`）
利润表常用：`ths_operating_total_revenue_stock` 营收、`ths_np_atsopc_stock` 归母净利、`ths_net_sales_rate_stock` 净利率、`ths_gross_selling_rate_stock` 毛利率、`ths_roe_stock` ROE。
> 字段极多且按报表类型不同；以实际返回 CSV 表头为准，按需 grep。

## 6. tianyancha —— 工商（3 个工具 API，背后 226 个天眼查接口）

| api_name | 关键 params | 用途 |
|---|---|---|
| `tianyancha_api_search` | `query, limit?` | 按关键词（如 `企业基本信息,股东信息`）搜天眼查接口及其参数。**不许用公司名当关键词** |
| `tianyancha_company_search` | `search_keyword, file_path, page_size?, page_num?` | **不知道公司全称时**才用，拿准确公司名/信用代码/法人等 |
| `tianyancha_api_call` | `api_call_name, api_call_params{keyword,...}, file_path` | 真正调接口；`api_call_name` 从 `api_search` 得；`keyword` 必须公司**全称/信用代码**（可逗号 ≤5 家）|

> 工具名固定 `tianyancha_api_call`，**别**把 `api_search` 返回的接口名当工具名。
> 流程：不知全称 → `company_search` 拿全称 → `api_search` 找接口 → `api_call` 调。已知全称可跳过搜索。

## 7. 其它源（按需 `get_data_source_desc` 查）

- `world_bank_open_data`：189 国 50+ 年宏观（GDP/CPI/贸易/失业…），跨国对比。
- `yahoo_finance`：海外行情兜底。
- `arxiv` / `scholar`：论文检索/引用/预印本。
- `yuandian_law`：法律。

## 8. 如何重新逆向校验（版本漂移时）

**本 Skill 以源码为准，不以官方使用说明为准。** datasource 插件升级（无自动更新，需 `/plugins` 重装）后按此重核：

1. **找 managed 插件源码**：`~/.kimi-code/plugins/managed/kimi-datasource/bin/kimi-datasource.mjs`（519 行可读）。grep `TOOLS`（工具/数据源 enum）、`API_URL`/`/coding/v1`（端点）、`buildHeaders`（头）、`loadAccessToken`（鉴权+`expires_at` 校验）、`callKimiTool`（请求体 `{method, params}`）。
2. **拉数据源目录**：用 §1 的直连写法调 `get_data_source_desc({"name": "<源>"})`，对每个源拿最新 API 列表 + 参数，存档比对。
3. **端到端验证**：`call_data_source_tool` 真调一次（如财报），`is_success:true` 即通；`PARAMETER_ERROR` 看缺哪个参数补上。
4. **鉴权回归**：确认静态 API key 仍被网关接受（`get_stock_realtime_price` 茅台 → `is_success:true`）。若网关收紧只认 OAuth，再回退 OAuth 路径并重新评估 15min 续期。
5. 校验后更新本文件的「校验日 + 插件版本」与 §5/§6 的 API 表。

> 交叉参考（非主依据）：官方文档 https://www.kimi.com/code/docs/kimi-code-cli/customization/datasource.html
