---
name: kimi-platform
description: Kimi (Moonshot AI) 开放平台 API 开发 Skill。当使用 Kimi API、Kimi K2.6 模型、工具调用（Tool Calls）或构建 Kimi Agent 时使用此 skill。涵盖 API 接入、自定义工具定义、流式调用、官方工具使用等。
---

# Kimi Platform Skill

Kimi (Moonshot AI) 开放平台 API 开发指南。适用于使用 Kimi API 构建应用、开发 Agent、实现工具调用（Tool Use）等场景。

## When to Use This Skill

- 使用 Kimi API（kimi-k2.6 / kimi-latest）开发应用
- 实现 Tool Calls（工具调用）功能
- 构建自定义 Agent（封装外部数据源如 iFinD、AKShare 等）
- 处理流式响应（Streaming）
- 调试工具调用相关的错误

## Quick Reference

### 安装 SDK

```bash
pip install openai  # Kimi API 兼容 OpenAI SDK
```

### 基础调用

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_KIMI_API_KEY",
    base_url="https://api.kimi.com/v1"
)

completion = client.chat.completions.create(
    model="kimi-k2.6",
    messages=[
        {"role": "system", "content": "你是 Kimi"},
        {"role": "user", "content": "你好"}
    ]
)
print(completion.choices[0].message.content)
```

### 工具调用（Tool Calls）

```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_stock_price",
        "description": "获取股票价格",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "股票代码"}
            },
            "required": ["code"]
        }
    }
}]

completion = client.chat.completions.create(
    model="kimi-k2.6",
    messages=messages,
    tools=tools
)
```

### 工具调用执行循环（非流式）

```python
import json

def get_stock_price(code):
    # 实际执行函数
    return {"code": code, "price": 100.0}

tool_map = {"get_stock_price": get_stock_price}
messages = [{"role": "user", "content": "查询 603019 的股价"}]

while True:
    completion = client.chat.completions.create(
        model="kimi-k2.6",
        messages=messages,
        tools=tools
    )
    choice = completion.choices[0]

    if choice.finish_reason == "tool_calls":
        messages.append(choice.message)  # 添加 assistant 的 tool_calls 消息
        for tc in choice.message.tool_calls:
            result = tool_map[tc.function.name](json.loads(tc.function.arguments))
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": tc.function.name,
                "content": json.dumps(result)
            })
    else:
        print(choice.message.content)
        break
```

## 模型列表

| 模型名 | 说明 |
|--------|------|
| `kimi-k2.6` | Kimi K2.6，最新版本，Agent 能力强 |
| `kimi-latest` | 始终指向最新版本 |
| `kimi-for-coding` | Claude Code 兼容版本 |

## 官方工具

Kimi API 层面**无预置官方工具**，开发者需自行定义自定义工具。常见封装：

| 工具 | 实现方式 |
|------|----------|
| 联网搜索 | 封装 `requests` + 搜索引擎 API |
| 代码执行 | 封装 `subprocess` / `exec` |
| 文件读取 | 封装 `open()` / `pandas.read_*` |
| 金融数据 | 封装 `akshare` / `iFinDPy` |
| 记忆存储 | 封装 `json` / `sqlite` 持久化 |

## Reference Files

- **api_guide.md** — API 接入、认证、模型参数详解
- **tool_reference.md** — 工具调用完整规范、流式处理、常见错误

## Working with This Skill

### 封装 iFinD 为 Kimi 自定义工具

如果你有 iFinD Python 账号，可以封装为 Kimi 工具：

```python
from iFinDPy import THS_BD, THS_iFinDLogin

THS_iFinDLogin("账号", "密码")

def query_ifind_stock_data(code, fields, date):
    data = THS_BD(f"{code}.SH", fields, f"{date},100")
    if data.errorcode == 0:
        return data.data.to_dict()
    return {"error": data.errmsg}

tools = [{
    "type": "function",
    "function": {
        "name": "query_ifind_stock_data",
        "description": "查询同花顺 iFinD 股票数据",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "股票代码，如 603019"},
                "fields": {"type": "string", "description": "指标代码，如 ths_close_price_stock"},
                "date": {"type": "string", "description": "日期，如 2026-04-29"}
            },
            "required": ["code", "fields", "date"]
        }
    }
}]
```

### 在 Claude Code 中使用 Kimi API

当前环境已通过 `ANTHROPIC_BASE_URL=https://api.kimi.com/coding/` 配置使用 Kimi 模型。如需独立调用 Kimi API（如使用原生工具调用），需单独初始化 OpenAI 客户端指向 `https://api.kimi.com/v1`。

## Resources

- Kimi 开放平台：https://platform.kimi.com
- 工具调用文档：https://platform.kimi.com/docs/guide/use-kimi-api-to-complete-tool-calls
- Agent 搭建文档：https://platform.kimi.com/docs/guide/use-kimi-k2-to-setup-agent

## Notes

- Kimi API 兼容 OpenAI SDK，可直接使用 `openai` Python 包
- 工具调用时，模型只返回参数，**实际执行必须由开发者代码完成**
- 流式调用时通过 `delta.tool_calls` 检测工具调用
- 每个 `tool_call` 必须有对应的 `role="tool"` 消息，且 `tool_call_id` 必须匹配
- 工具定义会占用上下文窗口 token
