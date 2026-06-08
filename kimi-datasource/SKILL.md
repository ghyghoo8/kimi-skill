---
name: kimi-datasource
description: |
  kimi-datasource 官方股票数据源插件用法：通过 query_stock 工具查询 A 股 / 港股实时行情、技术指标、
  开/收盘摘要与自选股。用户问个股最新价、涨跌幅、MACD/KDJ/RSI 等技术指标、港股收盘、自选股盈亏时进此 Skill。
whenToUse: |
  查 A 股或港股个股行情、最新价、涨跌幅、技术指标、开盘/收盘摘要；管理自选股 watchlist；
  使用 query_stock 工具；判断某代码/品种是否被数据源支持。
---

# kimi-datasource 插件

`kimi-datasource` 是官方股票数据源插件，提供 A 股/港股行情查询工具 `query_stock`。

## 安装与确认

```bash
kimi plugin install https://cdn.kimi.com/kimi-code-plugins/kimi-datasource.zip
kimi plugin info kimi-datasource
# 或用交互式插件管理器：/plugins
```

## query_stock 工具

**参数**：

| 参数 | 必填 | 说明 |
|------|:---:|------|
| `ticker` | ✅ | 股票代码，逗号分隔，一次最多 **3 个**。例：`600519.SH` 或 `600519.SH,0700.HK` |
| `type` | | 查询类型，默认 `realtime_price` |
| `file_path` | | CSV 输出路径，不传自动生成到 `/tmp/` |
| `time` | | 查询时刻 `YYYY-MM-DD HH:MM:SS`（秒必须是 `00`），**大多数情况不传** |

**四种查询类型**：

| `type` | A股 | 港股 | 返回内容 |
|--------|:---:|:---:|---------|
| `realtime_price` | ✅ | ⚠️ 仅限交易时段 | 最新价 + 分钟 K 线（`ts_code, time, open, close, high, low, vol, amount, pct_change, pct_change_1m`） |
| `realtime_tech` | ✅ | ❌ | 技术指标（`KDJ, OBV, BOLL, MA, EXPMA, MACD, LB, ROC, BBI, CCI, RSI, ATR`） |
| `open_summary` | ✅ | ✅ | 开盘摘要（`close, thscode, time`） |
| `close_summary` | ✅ | ✅ | 收盘摘要（`pre_close, open, high, low, close, vwap, chg, pct_chg, volume, amt, turn`） |

> **港股盘后查当天数据必须用 `close_summary`**；`realtime_price` 收盘后拿不到数据。
> **港股不支持 `realtime_tech`**，调用会报错。

## 支持范围

| 市场 | 后缀 | 支持 |
|------|------|:---:|
| A 股 上交所 | `.SH` | ✅ |
| A 股 深交所 | `.SZ` | ✅ |
| A 股 北交所 | `.BJ` | ✅ |
| 港股 | `.HK` | ✅（技术指标除外） |
| 美股 | — | ❌ |
| ETF / 指数 / 基金 | — | ❌（返回 `No realtime data available`） |

## 使用规范

1. **调用前必须核对股票代码**：不要凭记忆猜代码和后缀。用户给中文名时，先联网搜索确认正确代码与后缀。
2. **一次最多 3 个 ticker**，超过分批调用。
3. **混合 A 股 + 港股**时 CSV 自动拆两个文件：传 `file_path="/tmp/mix.csv"` → 实际生成 `/tmp/mix_a.csv`（A 股）和 `/tmp/mix_hk.csv`（港股），原路径文件不存在。
4. **返回处理**：stdout 打印摘要（含 `data_preview` 前两行）；完整数据写入 CSV。简单问题用 `data_preview` 答，复杂分析用 `ReadFile` 读 CSV。

## 常见场景

```text
# 查当前价：核对 → 600519.SH → query_stock(ticker="600519.SH", type="realtime_price")
#   从 data_preview 取 close 和 pct_change → 中文回答价与涨跌幅

# 查技术指标（A 股）：query_stock(ticker="600519.SH", type="realtime_tech")
#   判读：MACD DIFF>DEA 金叉；KDJ J>80 超买/J<20 超卖；RSI>70 超买/<30 超卖 → 带免责声明

# 查港股收盘：query_stock(ticker="0700.HK", type="close_summary")

# 多股对比：3 只一次 query_stock(ticker="600519.SH,000858.SZ,000568.SZ", ...)；4 只以上拆批

# 自选股管理：读 ~/.kimi-code/plugins/kimi-datasource/watchlist.json，每 3 只一组查，汇总
#   有 hold_cost/hold_quantity 则算盈亏 = (当前价 - hold_cost) × hold_quantity

# 不支持品种：指数/ETF/基金 → 告知"只能查个股（A股/港股）"；美股 → 告知"不支持美股"
```

**watchlist.json 格式**：

```json
[
  {"code": "600519.SH", "name": "贵州茅台"},
  {"code": "0700.HK", "name": "腾讯控股", "hold_cost": 350.5, "hold_quantity": 100}
]
```

## 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| "找不到 Kimi 凭证文件" | 未登录 | `kimi login` |
| `No realtime data available` | 非交易时段查 `realtime_price` | 改用 `close_summary` 或等开盘 |
| `PARAMETER_ERROR - realtime_tech is not supported for HK stocks` | 港股用了 `realtime_tech` | 换 `realtime_price` 或 `close_summary` |
