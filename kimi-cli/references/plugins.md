# 插件（Plugins）完整参考

依据 https://www.kimi.com/code/docs/kimi-code-cli/customization/plugins.html

## 是什么

Plugin 把可复用的 Kimi Code CLI 能力打包成**可安装单元**。可包含：

- **Skills**：插件内指定目录的 `SKILL.md`，与普通 Agent Skill 同格式。
- **MCP 服务器**：stdio（本地命令）与 HTTP（远程服务）声明。
- **会话启动注入**：会话开始时自动加载指定 Skill（仅注入文本，不执行代码）。
- **元数据**：展示信息、描述、作者等。

> **保守加载**：安装插件**不会**执行其中的 Python / Node / Shell / hook / 命令脚本。
> 不支持的运行时字段（`tools`、`commands`、`hooks`、`apps`、`inject`、`configFile` 等）会以 diagnostics 显示并忽略。

## 安装

### 交互式管理器 `/plugins`

| 键 | 操作 |
|---|---|
| Enter / → | 打开选项 / 从市场安装 |
| Space | 启用/禁用插件；市场内安装/更新 |
| M | 管理 MCP 服务器 |
| ← / Esc | 返回上一级 |

### 斜杠命令

```
/plugins                              打开交互式管理器
/plugins list                         列出已装插件
/plugins install <path-or-url>        从本地/zip URL/GitHub 安装
/plugins marketplace [source]         浏览官方市场
/plugins info <id>                    查看插件详情（含 diagnostics）
/plugins enable <id>                  启用
/plugins disable <id>                 禁用
/plugins remove <id>                  移除（需确认）
/plugins reload                       重载 installed.json 与 manifest
/plugins mcp enable <id> <server>     启用某 MCP 服务器
/plugins mcp disable <id> <server>    禁用某 MCP 服务器
```

### GitHub URL 四种形式

- `https://github.com/<owner>/<repo>` — 最新 release（或默认分支）
- `https://github.com/<owner>/<repo>/tree/<ref>` — 指定分支/标签/commit SHA
- `https://github.com/<owner>/<repo>/releases/tag/<tag>` — 指定标签
- `https://github.com/<owner>/<repo>/commit/<sha>` — 指定 commit

网络请求只走 `github.com` 重定向与 `codeload.github.com` 下载。市场源可用 `KIMI_CODE_PLUGIN_MARKETPLACE_URL` 替换。

## 存储与管理

- **安装位置**：本地安装会被拷贝到 `$KIMI_CODE_HOME/plugins/managed/<id>/`，CLI **始终从这份托管副本运行**。装后改原始源需重装。
- **记录**：`$KIMI_CODE_HOME/plugins/installed.json`（已装插件与启用状态）。
- **移除**：只删安装记录，托管副本与原始源文件仍在磁盘。
- **范围**：按用户安装，对所有项目生效，暂不支持项目级安装范围。
- **生效**：插件变更只对**新会话**生效——改完用 `/new`。

## 信任等级

`/plugins` 显示信任徽章：`kimi-official`（官方地址）/ `curated`（精选地址）/ `third-party`（其余来源）。

## Manifest（清单）

位置（二者都在则 `kimi.plugin.json` 优先）：

```
<plugin_root>/kimi.plugin.json
<plugin_root>/.kimi-plugin/plugin.json
```

示例：

```json
{
  "name": "kimi-finance",
  "version": "1.0.0",
  "description": "Finance data and analysis workflows for Kimi Code CLI",
  "skills": "./skills/",
  "sessionStart": {
    "skill": "using-finance"
  },
  "interface": {
    "displayName": "Kimi Finance",
    "shortDescription": "Market data and financial analysis workflows"
  }
}
```

字段：

| 字段 | 说明 |
|---|---|
| `name` | **必填**。插件 ID，须匹配 `[a-z0-9][a-z0-9_-]{0,63}` |
| `version` `description` `keywords` `author` `homepage` `license` | 可选元数据 |
| `skills` | 插件内一个或多个 `./` 路径；省略则用根 `SKILL.md` |
| `sessionStart.skill` | 会话/恢复开始时加载指定 Skill |
| `skillInstructions` | 加载该插件 Skill 时附加的额外指令（无论经 `sessionStart`、`/skill:<name>` 还是模型自动调用都会随之出现） |
| `mcpServers` | MCP 服务器声明（默认启用，可经 `/plugins` 禁用） |

`interface` 对象：`displayName` / `shortDescription` / `longDescription` / `developerName` / `websiteURL`。

## 目录结构示例

```
my-plugin/
  kimi.plugin.json
  skills/
    using-my-plugin/
      SKILL.md
    another-workflow/
      SKILL.md
```

## 插件内的 MCP 服务器

stdio（本地命令）：

```json
{
  "mcpServers": {
    "finance": { "command": "uvx", "args": ["kimi-finance-mcp"] }
  }
}
```

HTTP（远程服务）：

```json
{
  "mcpServers": {
    "docs": { "url": "https://example.com/mcp" }
  }
}
```

- stdio 的 `command` 可为 `PATH` 命令或以 `./` 开头的插件根相对路径；`cwd` 也须以 `./` 开头且不出插件根，否则该服务器被忽略。
- 插件 MCP 服务器**只在新会话启动**，可随时禁用。

## 安全模型

- 不执行命令型插件工具、hook 或旧式工具运行时。
- 所有路径在符号链接解析后须留在插件根内。
- 已启用 MCP 服务器仅在新会话启动，可随时禁用。
- 损坏的 manifest 或不安全路径在 `/plugins info <id>` 的 diagnostics 显示，不影响其它会话。

## 官方插件

**Kimi Datasource** — 自然语言查金融行情、宏观经济、企业工商、学术文献。
装法：`/plugins` → Marketplace → 找到 Kimi Datasource → Space 安装 → `/new`。详见 `kimi-datasource` 子 Skill。
