# Kimi Code 错误速查

依据 https://www.kimi.com/code/docs/kimi-code/error-reference.html

Kimi For Coding 后端（`https://api.kimi.com/coding/v1`）返回的错误。按 HTTP 状态/类别分组；命中关键词即可对号入座。程序化集成时的鉴权/PATH/解析坑另见 `integration-troubleshooting.md`。

## 鉴权 401 / 会员 402

| 关键词 | 状态 | 原因 | 处理 |
|---|---|---|---|
| `The API Key appears to be invalid or may have expired` | 401 | API key 无效/过期/被吊销 | 在控制台核对 key、查多余空格、更新环境变量 |
| `Invalid Authentication` | 401 | 鉴权格式缺失/不支持 | 别用开放平台凭证；用 Kimi Code 控制台的 key |
| `unable to verify your membership benefits` | 402 | 无法确认订阅状态 | 确认订阅有效、重试，必要时联系支持 |

## 权限 403

| 关键词 | 状态 | 原因 | 处理 |
|---|---|---|---|
| `Kimi For Coding is currently only available for Coding Agents` | 403 | 客户端未进白名单 | 带 User-Agent 详情邮件 code@moonshot.ai 申请接入 |
| `You've reached your usage limit for this billing cycle` | 403 | 本计费周期（周）额度用尽 | 等下周期或升级订阅 |
| `Access terminated` | 403 | 账号因违规被停 | 看社区规范；经 support@moonshot.cn 申诉 |

## 限流 / 配额 429

| 关键词 | 状态 | 原因 | 处理 |
|---|---|---|---|
| `The engine is currently overloaded` | 429 | 服务器容量超载 | 稍候重试 |
| `We're receiving too many requests` | 429 | 账号并发超限 | 等待重试，别高频连发 |
| `You've reached your usage limit for this period` | 429 | 5 小时滚动窗口配额用尽 | 等窗口重置或升级 |
| `You've reached kimi monthly usage limit` | 429 | 账号月度配额用尽 | 等下周期自动重置或升级 |

## 请求格式 400

| 关键词 | 状态 | 原因 | 处理 |
|---|---|---|---|
| `total message size N exceeds limit 2097152` | 400 | 上下文负载 > 2MB | 裁剪对话历史、拆分长文 |
| `Your request exceeded model token limit: 262144` | 400 | token 超模型上限 | 缩短 prompt 或截断历史 |
| `thinking is enabled but reasoning_content is missing` | 400 | thinking 模式缺必填字段 | 给 assistant 工具消息加 `reasoning_content` |
| `unsupported image url` | 400 | 图片 URL 格式不支持 | 用公网 URL；base64 须 `data:image/jpeg;base64,...` |
| `function name ... is duplicated` | 400 | 工具名重复 | 保证每个 tool `name` 唯一 |
| `The request was rejected because it was considered high risk` | 400 | 触发内容安全过滤 | 去敏感内容；误判经 code@moonshot.ai 申诉 |

## 资源 404

| 关键词 | 状态 | 原因 | 处理 |
|---|---|---|---|
| `Not found the model kimi-for-coding or Permission denied` | 404 | 模型名错或无权限 | 核对拼写 `kimi-for-coding`；确认已开通 Kimi Code 访问 |
| `method not found` | 404 | 端点路径不对 | 核对 Base URL：OpenAI 风格 `https://api.kimi.com/coding/v1`，Anthropic 风格 `https://api.kimi.com/coding/` |

## 服务端 500

| 关键词 | 状态 | 原因 | 处理 |
|---|---|---|---|
| `bot_id ... value does not match id_kinds` | 500 | bot_id 非合法 UUID v4 | 升级客户端到最新；仍现则上报 |
| `failed to connect to ... database=membership_` | 500 | 数据库连接失败 | 等 1–2 分钟重试 |
| `FATAL: terminating connection due to administrator command` | 500 | 数据库维护/重启 | 等 1–2 分钟重试 |
| `failed to evaluate rate limit script` | 500 | 限流服务（Redis）内部错 | 等 1 秒，最多重试 3 次 |
| `i/o timeout` / `conn closed` / `bad connection` | 500 | 网络连通性问题 | 等 1 秒，最多重试 3 次 |
| `503 Service Unavailable` / `504 Gateway Timeout` / `502 Bad Gateway` | 500 | 下游服务不可用 | 等待重试 |
| `未找到该账号` / `该账号已被禁用` / `已被禁言` | 500 | 账号缺失/被停/被禁言 | 核对注册；经 support@kimi-code.com 申诉 |

## 工具错误（web 抓取 / 图片）499 · 500 · 403 · 400

| 关键词 | 状态 | 原因 | 处理 |
|---|---|---|---|
| `context canceled` | 499 | 客户端取消请求 | 用户主动取消则无需处理；频繁则查超时配置 |
| `url2text` / `spider checkUrl failed` / `invalid html` | 500 | 网页抓取失败（超时/结构/需登录/黑名单/服务端错） | 延后重试；需登录则手动复制内容；黑名单 URL 无法访问 |
| `image_url:moderation request error` | 500 | 图片内容审核失败/超时 | 确认图片合规；超时则重试 |
| `We consider the current URL poses a security risk` | 403 | URL 被判安全风险 | 无法抓取内网/高危 IP 或需登录页 |
| `invalid_url: The provided URL is invalid` | 400 | URL 畸形或缺协议 | 给完整有效 URL，含 `http://` / `https://` |

## 类别速记

401 鉴权 · 402 会员 · 403 权限/封禁 · 429 限流/配额 · 400 请求格式 · 404 模型/端点 · 500 服务端基础设施 · 499/500/403/400 工具执行（抓网页/图片）。

> 程序化集成最常踩：401（key 失效）、429（配额/并发）、`auth.login_required`（OAuth 态在 subprocess 不可见——改用 API key，见 `integration-troubleshooting.md` 第 3 节）。
