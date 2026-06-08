---
name: kimi-datasource
description: |
  kimi-datasource 是 Kimi Code 官方数据插件：用自然语言直接查金融行情（A股/港股/美股、宏观经济）、
  企业工商信息、学术文献，无需手写 API。用户问个股最新价/涨跌幅/技术指标、宏观 GDP/CPI、
  公司股权/风险、论文检索等数据类问题时进此 Skill。
whenToUse: |
  查金融数据（股票实时/历史行情、MACD/KDJ/RSI 技术指标、财报、选股、指数；World Bank 宏观经济）；
  查企业工商信息（注册/股权/法律风险/关联公司）；查学术文献（多库论文检索、引用、预印本）；
  安装/启用 kimi-datasource 插件、用 /plugins Marketplace、登录凭据问题。
---

# kimi-datasource 插件

`kimi-datasource` 是 **Kimi Code 官方数据插件**：让你用**自然语言**直接查询金融行情、宏观经济、
企业工商与学术文献等数据，**无需手动调用 API**。插件依赖本地凭据访问数据服务，按次计费。

> 官方文档：https://www.kimi.com/code/docs/kimi-code-cli/customization/datasource.html

## 前置：登录

插件依赖本地 Kimi 凭据访问数据服务，**使用前必须先 OAuth 登录**：

```text
/login        # 用 Kimi Code 账号完成 OAuth 登录
```

## 安装

通过内置插件市场安装（不再用 zip URL）：

```text
/plugins              # 打开插件管理器
  → Marketplace       # 选择市场
  → 找到并安装 Kimi Datasource
/new                  # 新建会话后即可使用
```

## 能力总览（四大类数据）

### 1. 金融数据

- **股票 & 全球市场**：A 股 / 港股 / 美股的实时行情、历史价格、技术指标
  （MACD、KDJ、RSI、BOLL、MA 等）、财务报表、公司基本面、选股、指数数据、自选股管理。
- **宏观经济**：World Bank 开放数据，覆盖 **189 个成员国、50+ 年历史**——
  GDP、CPI、贸易、失业、贫困、教育、气候等指标，支持跨国对比。

### 2. 企业数据

覆盖中国大陆企业：工商注册信息、股权结构、法律风险、关联公司图谱。

### 3. 学术数据

多数据库整合，涵盖物理、数学、计算机、金融、经济等领域的数百万篇论文，
支持文献检索、引用查询、预印本获取。

## 使用方式：自然语言提问

装好后直接用自然语言问，插件自动查数、整理结果。示例：

```text
# 金融
"贵州茅台过去一年的最高价和最低价分别是多少？"
"对比腾讯和阿里最近三年的营收。"
"帮我筛选市盈率低于 15、ROE 大于 20% 的白酒股。"
"中国和美国近十年的 GDP 增速对比。"

# 企业
"查一下某公司的股权结构和实际控制人。"
"这家公司有哪些法律风险和关联企业？"

# 学术
"找几篇近两年关于大模型推理优化的论文，并给出引用情况。"
```

## 使用规范与限制

1. **先登录**：未 `/login` 会因缺少本地凭据而无法访问数据。
2. **按次计费**：每次数据查询消耗 Kimi Code 账号额度。
3. **只读**：仅查询，无写入 / 交易能力。
4. **实时数据受交易时段限制**：技术指标与实时行情仅在交易时段可取；盘后查实时数据可能拿不到，
   改查收盘/历史数据。
5. **核对标的**：用中文名提问时先确认正确的股票代码与市场后缀，不要凭记忆猜。
6. **免责声明**：AI 输出仅供参考，**不构成任何投资或商业决策建议**。

## 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| 提示找不到凭据 / 未授权 | 未登录 | `/login` 完成 OAuth |
| 插件命令不可用 | 未安装或未新建会话 | `/plugins` → Marketplace 安装，再 `/new` |
| 实时行情取不到数据 | 非交易时段查实时 | 改查收盘 / 历史数据，或等开盘 |
| 提示额度不足 | 账号额度耗尽 | 充值 / 检查 Kimi Code 账号额度 |
| `access_token expired` / `login failed: fetch failed`，但 refresh_token 没过期（代理环境）| Node 只认大写 `HTTPS_PROXY`，shell 只导出小写 → 够不到 `auth.kimi.com` 续期 | 显式给大写 `HTTPS_PROXY=...`；详见 troubleshooting 第 3c 节 |

## 程序化 / 批量调用的关键坑

> 适用于宿主程序（subprocess / 另一个 agent）调本插件取**结构化数据**，而非人在终端问答。

**1. 自然语言查"最近一期"会选错报告期** 🔴
本插件经 LLM agent 调用底层数据工具。问"最近一期财报"时，agent 常因**时间认知错位**把报告期设成**去年同期**（如实际最新是 2026Q1，却查了 `20250331`），还会在文本里说"这是目前可获取的最近一期"——**数据源其实有最新数据，是 agent 选错了查询参数**。
- ✅ **显式给报告期**：prompt 里写明"用 `financial_parameter=20260331` 查 2026 一季报"，agent 就会传对。
- 不要依赖 agent 自己判断"最新"。

**2. 用 stream-json 拿工具原始返回，绕过 LLM 整理**
默认 `text` 输出是 agent **整理润色后**的文字，可能带它的认知偏差。要可靠结构化数据，用 `-p --output-format stream-json`，从**工具结果消息**（含 `tool_call_id` 的那条）里取数据源原始 CSV/JSON（字段如 `ths_net_sales_rate_stock` 净利率、`ths_gross_selling_rate_stock` 毛利率、`ths_roe_stock` 等），数据精确、不被文本层污染。解析见 [../kimi-subagent/references/integration-troubleshooting.md](../kimi-subagent/references/integration-troubleshooting.md)（第 4 节 stream-json 解析）。

**3. 鉴权是「两套」：LLM 用 API key，数据服务必须 OAuth + `KIMI_CODE_HOME`** 🔴
- **LLM 推理**：可用 API key（`kimi-apikey` model），免 OAuth 登录态在 subprocess 下失效。
- **本插件的数据服务**：**必须 OAuth 凭证**（先在交互端 `/login` 写入凭证文件），API key **替代不了**。subprocess 调用还要注入 **`KIMI_CODE_HOME=~/.kimi-code`** 让插件定位凭证文件，否则即使 LLM 通了、数据工具仍报 `provider.connection_error`。
- 配好后两套鉴权各司其职即可调通。详见 [../kimi-subagent/references/integration-troubleshooting.md](../kimi-subagent/references/integration-troubleshooting.md)（第 3 节 API key + 第 3b 节 `KIMI_CODE_HOME`）。

**4. 批量**
一次可查多只（实测 5 只 OK，不止旧版 3 只上限），但：① 每只仍受"选错报告期"影响——批量更要显式传参；② **按次计费 × N**；③ 速度约每只数秒，几百只会很慢。**大批量历史/财报建议用专用结构化数据源（如 BaoStock）；本插件更适合按需 / 小批量 + 系统盲区（企业工商 / 股权 / 跨国宏观 / 学术）。**
