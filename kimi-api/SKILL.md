---
name: kimi-api
description: |
  Kimi 开放平台 API 接入：用 OpenAI 兼容 SDK 调用 kimi-k2.6 / kimi-latest 等模型，做聊天补全、
  多轮对话、强制 JSON 输出、流式响应，以及工具调用（Tool Calls）的完整执行循环。
  用户要用代码调 Kimi、实现 function calling、接 Kimi 模型时进此 Skill。
whenToUse: |
  用代码（Python/Node）调用 Kimi 开放平台 API；选择 Kimi 模型；实现 Tool Calls / function calling；
  流式输出；强制 JSON；多轮对话；处理 reasoning/thinking 保留。
---

# Kimi 开放平台 API

Kimi API **完全兼容 OpenAI SDK**，无需 Kimi 专属 SDK。端点 `https://api.kimi.com/v1`，密钥从 https://platform.kimi.com 获取。

## 1. 基础调用

```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_KIMI_API_KEY", base_url="https://api.kimi.com/v1")

completion = client.chat.completions.create(
    model="kimi-k2.6",
    messages=[
        {"role": "system", "content": "你是 Kimi，一个有帮助的助手。"},
        {"role": "user", "content": "你好"},
    ],
    temperature=0.3,
)
print(completion.choices[0].message.content)
```

## 2. 模型列表

| 模型 | 说明 |
|---|---|
| `kimi-k2.6` | 最新 K2.6，Agent 能力强，支持 Thinking |
| `kimi-k2-thinking` | 始终 Thinking 模式（不可关） |
| `kimi-k2-thinking-turbo` | Thinking 轻量版，更快 |
| `kimi-latest` | 始终指向最新版本 |
| `kimi-for-coding` | 编码兼容版本 |

## 3. 常用能力

- **多轮对话**：把 assistant 回复 append 回 `messages` 再继续。
- **强制 JSON**：`response_format={"type": "json_object"}`。
- **流式**：`stream=True`，遍历 `chunk.choices[0].delta.content`。
- 参数与示例详见 → `references/api_guide.md`。

## 4. 工具调用（Tool Calls）

模型只生成调用参数，**实际函数由你的代码执行**，再把结果以 `role="tool"` 回灌，循环直到模型给出最终回复。完整的工具定义格式、非流式/流式执行循环、消息结构铁律、常见错误与一个完整 Agent 示例 → `references/tool_reference.md`。

```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_stock_price",
        "description": "获取股票价格",
        "parameters": {
            "type": "object",
            "properties": {"code": {"type": "string", "description": "股票代码"}},
            "required": ["code"],
        },
    },
}]
completion = client.chat.completions.create(model="kimi-k2.6", messages=messages, tools=tools)
```

## 5. 环境变量

| 变量 | 说明 |
|---|---|
| `KIMI_MODEL_THINKING_KEEP` | 设为 `all` 启用 Preserved Thinking，让 `kimi-k2.6`/`kimi-k2-thinking` 多轮间保留历史 `reasoning_content`（显著增加输入 token 与费用）。 |

## 6. 与 Claude Code 的关系

Claude Code 可通过 `ANTHROPIC_BASE_URL=https://api.kimi.com/coding/` 把对话请求转发到 Kimi 模型——这是**模型转发**，不暴露 Kimi 原生 Tool Calls 给 Claude Code 工具层。要用原生工具调用，需在代码里单独初始化指向 `https://api.kimi.com/v1` 的 OpenAI 客户端。

> 想把整个 `kimi` CLI 当子 agent 委派（而非直接调 API）→ 见 `kimi-subagent` 子 Skill。
