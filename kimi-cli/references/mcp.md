# MCP 接入与配置

依据 https://www.kimi.com/code/docs/kimi-code-cli/customization/mcp.html

MCP（Model Context Protocol）是开放协议，让模型安全调用外部进程/服务暴露的工具。Kimi Code CLI 作为 **MCP 客户端**，把外部工具与内置 `Read`/`Bash`/`Grep` 等并列使用。

## 接入方式（三种 transport）

| 类型 | 说明 |
|---|---|
| **stdio** | CLI 把本地 MCP server 作为子进程拉起，走标准输入输出。适合本地命令行工具。 |
| **HTTP** | CLI 连一个已运行的 HTTP 端点。适合远程服务或需常驻的进程。 |
| **SSE** | 连旧式 HTTP+Server-Sent Events 端点（v0.15 起支持）。新 server 优先用 HTTP，**仅当服务只暴露这种旧机制时**才设 `transport: "sse"`。 |

## 配置文件 `mcp.json`

**不在 config.toml**，单独放：

- 用户级：`~/.kimi-code/mcp.json`（或 `$KIMI_CODE_HOME/mcp.json`）
- 项目级：工作目录下 `.kimi-code/mcp.json`

项目级覆盖用户级。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "linear": {
      "url": "https://mcp.linear.app/mcp"
    },
    "legacy-events": {
      "transport": "sse",
      "url": "https://mcp.example.com/sse"
    }
  }
}
```

### 字段

| 字段 | 类型 | 适用 | 作用 |
|---|---|---|---|
| `command` | string | stdio | 可执行名 |
| `args` | string[] | stdio | 命令参数 |
| `env` | Record | stdio | 注入子进程的环境变量 |
| `cwd` | string | stdio | 子进程工作目录 |
| `url` | string | HTTP/SSE | 服务端点 URL |
| `transport` | string | HTTP/SSE | 仅旧式服务器设 `"sse"` |
| `headers` | Record | HTTP/SSE | 每请求附加的静态请求头 |
| `bearerTokenEnvVar` | string | HTTP/SSE | 存 bearer token 的环境变量名 |
| `enabled` | boolean | 全部 | 设 `false` 禁用该 server |
| `startupTimeoutMs` | number | 全部 | 连接超时（默认 `30000` ms） |
| `toolTimeoutMs` | number | 全部 | 单次工具调用超时 |
| `enabledTools` | string[] | 全部 | 工具白名单 |
| `disabledTools` | string[] | 全部 | 工具黑名单 |

## 交互式管理

- `/mcp`：查看当前 server 连接状态。
- `/mcp-config`：对话式增/改/删 server，无需手改 JSON。
- OAuth 鉴权：`/mcp-config login <server-name>` 走浏览器授权。
- HTTP/SSE 的凭证也可经 `headers` 或 `bearerTokenEnvVar` 提供。

## 工具命名与权限

工具名格式 `mcp__<server>__<tool>`。权限规则支持通配符 `*` / `**`，写在 `config.toml`：

```toml
[[permission.rules]]
decision = "allow"
pattern = "mcp__github__*"
```

未批准的调用触发审批弹窗；选「本会话内允许」后同类调用自动放行。
