# Kimi API 接入指南

## 环境准备

```bash
pip install openai
```

Kimi API 完全兼容 OpenAI SDK，无需额外安装 Kimi 专属 SDK。

## 认证

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_KIMI_API_KEY",      # 从 platform.kimi.com 获取
    base_url="https://api.kimi.com/v1"  # Kimi API 端点
)
```

## 基础聊天 completion

```python
completion = client.chat.completions.create(
    model="kimi-k2.6",
    messages=[
        {"role": "system", "content": "你是 Kimi，一个有帮助的助手。"},
        {"role": "user", "content": "你好"}
    ],
    temperature=0.3,
    max_tokens=1024
)

print(completion.choices[0].message.content)
```

## 模型参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | 模型 ID：`kimi-k2.6`、`kimi-k2-thinking`、`kimi-k2-thinking-turbo`、`kimi-latest` |
| `messages` | array | 消息列表，含 system/user/assistant/tool |
| `temperature` | float | 0-2，越小越确定 |
| `max_tokens` | int | 最大生成 token 数 |
| `tools` | array | 工具定义列表 |
| `tool_choice` | string/object | `auto`、`none` 或指定工具 |
| `stream` | bool | 是否流式输出 |
| `response_format` | object | `{type: "json_object"}` 强制 JSON 输出 |

## 多轮对话

```python
messages = [
    {"role": "system", "content": "你是股票分析助手"},
    {"role": "user", "content": "分析 603019"}
]

completion = client.chat.completions.create(
    model="kimi-k2.6",
    messages=messages
)

# 追加模型回复
messages.append({
    "role": "assistant",
    "content": completion.choices[0].message.content
})

# 继续对话
messages.append({"role": "user", "content": "给出左侧交易建议"})
completion2 = client.chat.completions.create(
    model="kimi-k2.6",
    messages=messages
)
```

## 强制 JSON 输出

```python
completion = client.chat.completions.create(
    model="kimi-k2.6",
    messages=[{"role": "user", "content": "提取股票代码和名称：中科曙光（603019）"}],
    response_format={"type": "json_object"}
)
import json
result = json.loads(completion.choices[0].message.content)
```

## 流式输出

```python
stream = client.chat.completions.create(
    model="kimi-k2.6",
    messages=[{"role": "user", "content": "你好"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## 与 Claude Code 的关系

当前 Claude Code 配置通过以下方式使用 Kimi 模型：

```json
{
  "ANTHROPIC_BASE_URL": "https://api.kimi.com/coding/",
  "ANTHROPIC_MODEL": "kimi-2.6"
}
```

这是 Claude Code 的**内部模型转发配置**，将对话请求转发到 Kimi API。但它不暴露 Kimi 的原生工具调用能力给 Claude Code 的工具层。如需使用 Kimi 的 Tool Calls，需要在 Python 代码中独立初始化 OpenAI 客户端指向 `https://api.kimi.com/v1`。

**环境变量**：

| 变量 | 说明 |
|------|------|
| `KIMI_MODEL_THINKING_KEEP` | 设为 `all` 可启用 Preserved Thinking，让 `kimi-k2.6` / `kimi-k2-thinking` 在多轮间保留历史推理内容。注意会显著增加输入 token。 |
