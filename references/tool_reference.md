# Kimi Tool Calls（工具调用）完整参考

## 核心概念

Kimi 模型支持 Tool Calls（函数调用），但**模型本身不执行函数**——模型只生成调用参数，实际执行由开发者代码完成。

## 工具定义格式

```json
{
    "type": "function",
    "function": {
        "name": "工具名称",
        "description": "工具用途描述（模型据此决定是否调用）",
        "parameters": {
            "type": "object",
            "properties": {
                "参数名": {
                    "type": "string|number|boolean|array|object",
                    "description": "参数描述"
                }
            },
            "required": ["必填参数名"]
        }
    }
}
```

## 完整非流式示例

```python
import json
from openai import OpenAI

client = OpenAI(api_key="YOUR_KEY", base_url="https://api.kimi.com/v1")

# 定义工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "query_stock",
            "description": "查询股票数据",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "股票代码"},
                    "field": {"type": "string", "description": "查询字段"}
                },
                "required": ["code", "field"]
            }
        }
    }
]

# 工具实现
def query_stock(code, field):
    return {"code": code, "field": field, "value": 100.0}

tool_map = {"query_stock": query_stock}

# 消息历史
messages = [{"role": "user", "content": "查询 603019 的收盘价"}]

# 执行循环
while True:
    completion = client.chat.completions.create(
        model="kimi-k2.6",
        messages=messages,
        tools=tools
    )
    choice = completion.choices[0]

    if choice.finish_reason == "tool_calls":
        # 添加 assistant 的 tool_calls 消息（必须！）
        messages.append(choice.message)

        # 执行每个工具调用
        for tc in choice.message.tool_calls:
            args = json.loads(tc.function.arguments)
            result = tool_map[tc.function.name](**args)

            # 返回工具结果（tool_call_id 必须匹配）
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

## 流式工具调用

```python
stream = client.chat.completions.create(
    model="kimi-k2.6",
    messages=messages,
    tools=tools,
    stream=True
)

tool_calls = []
for chunk in stream:
    delta = chunk.choices[0].delta

    # 检测工具调用
    if delta.tool_calls:
        for tc in delta.tool_calls:
            index = tc.index
            if index >= len(tool_calls):
                tool_calls.append({"id": "", "function": {"name": "", "arguments": ""}})
            if tc.id:
                tool_calls[index]["id"] = tc.id
            if tc.function.name:
                tool_calls[index]["function"]["name"] = tc.function.name
            if tc.function.arguments:
                tool_calls[index]["function"]["arguments"] += tc.function.arguments

    # 普通文本输出
    if delta.content:
        print(delta.content, end="")
```

## 消息结构要求

正确的消息顺序：

```
system → user → assistant (含 tool_calls) → tool(s) → assistant (最终回复)
```

**关键规则**：
1. `tool_calls` 消息必须原样追加到 messages
2. 每个 `tool_call` 必须有对应的 `role="tool"` 消息
3. `tool_call_id` 必须严格匹配
4. 工具结果必须用 JSON 字符串

## 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `tool_call_id not found` | 未将 assistant 的 tool_calls 消息加入历史 | 在追加 tool 结果前，先 `messages.append(choice.message)` |
| 模型重复调用工具 | 工具结果未正确返回 | 检查 `role="tool"` 消息的 `tool_call_id` 是否匹配 |
| 参数解析失败 | arguments 不是有效 JSON | 使用 `json.loads()` 解析 |

## 封装 iFinD 的完整 Agent 示例

```python
import json
from openai import OpenAI
from iFinDPy import THS_BD, THS_iFinDLogin

client = OpenAI(api_key="YOUR_KEY", base_url="https://api.kimi.com/v1")
THS_iFinDLogin("账号", "密码")

def ifind_query(code, fields, date):
    data = THS_BD(f"{code}.SH", fields, f"{date},100")
    if data.errorcode == 0:
        return {"data": data.data.to_dict(), "error": None}
    return {"data": None, "error": data.errmsg}

tools = [{
    "type": "function",
    "function": {
        "name": "ifind_query",
        "description": "查询同花顺 iFinD 股票数据",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string"},
                "fields": {"type": "string"},
                "date": {"type": "string"}
            },
            "required": ["code", "fields", "date"]
        }
    }
}]

tool_map = {"ifind_query": ifind_query}

messages = [{"role": "user", "content": "查询 603019 在 2026-04-29 的收盘价和 PE"}]

while True:
    completion = client.chat.completions.create(
        model="kimi-k2.6",
        messages=messages,
        tools=tools
    )
    choice = completion.choices[0]

    if choice.finish_reason == "tool_calls":
        messages.append(choice.message)
        for tc in choice.message.tool_calls:
            args = json.loads(tc.function.arguments)
            result = tool_map[tc.function.name](**args)
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
