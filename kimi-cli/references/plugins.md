# 插件（Plugins）完整参考

依据 https://www.kimi.com/code/docs/kimi-code-cli/customization/plugins.html

## 是什么

Plugin 把可复用的 Kimi Code CLI 能力打包成**可安装单元**。可包含：

- **Skills**：插件内指定目录的 `SKILL.md`，与普通 Agent Skill 同格式。
- **MCP 服务器**：stdio（本地命令）与 HTTP（远程服务）声明。
- **会话启动注入**：会话开始时自动加载指定 Skill（仅注入文本，不执行代码）。
- **插件斜杠命令**：把 Markdown 提示词注册成 `/plugin:command`。
- **插件 Hooks**：插件启用期间运行生命周期 hook。
- **元数据**：展示信息、描述、作者等。

> **保守加载**：安装插件本身不会执行其中的 Python / Node / Shell / 命令型旧工具。插件 hooks 只在插件启用后、匹配生命周期事件时运行。
> 不支持的运行时字段（`tools`、`apps`、`inject`、`configFile` 等）会以 diagnostics 显示并忽略。

## 安装

### 交互式管理器 `/plugins`

> **v0.20 起改为四 tab 面板**：`/plugins` 是单一面板，含 **Installed**（管理已装）/ **Official**（官方 marketplace）/ **Third-party**（第三方 marketplace）/ **Custom**（从 URL 安装）四个 tab，用 `Tab` / `Shift-Tab` 切换。下表多数操作作用于 **Installed** tab。

| 键 | 操作 |
|---|---|
| Tab / Shift-Tab | 在 Installed / Official / Third-party / Custom 四 tab 间切换 |
| Space | 启用/禁用选中的已装插件（Installed） |
| D | 移除选中的已装插件（Installed） |
| M | 管理选中插件的 MCP 服务器（Installed） |
| R | 重载 `installed.json` 与所有 manifest（Installed） |
| Enter | Installed：有更新则安装更新，否则查看详情 · Official/Third-party：安装或更新 · Custom：安装 |
| I | 查看插件详情（Installed） |
| Esc | 返回或取消 |

### 斜杠命令

```
/plugins                              打开交互式管理器
/plugins list                         列出已装插件
/plugins install <path-or-url>        从本地/zip URL/GitHub 安装
/plugins marketplace [source]         浏览官方市场，或传入自定义 marketplace JSON 路径/URL
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
- **生效**：插件变更通过 `/reload` 或新会话生效——改完运行 `/reload` 或 `/new`，当前会话不会更新。（v0.20 前文案为「只对新会话生效」；现在 `/reload` 也可在当前会话生效。）

## 自定义 marketplace JSON

> **v0.20 起**：除官方市场外，可把自定义 marketplace JSON 的路径或 URL 传给 `/plugins marketplace <source>`，或用 `KIMI_CODE_PLUGIN_MARKETPLACE_URL` 覆盖默认市场。`plugins` 数组每个条目需 `id` 和 `source`（本地路径、zip URL 或 GitHub URL）：

```json
{
  "version": "2",
  "plugins": [
    {
      "id": "my-plugin",
      "displayName": "My Plugin",
      "source": "./my-plugin"
    }
  ]
}
```

## 信任等级

`/plugins` 显示信任徽章：`kimi-official`（官方地址）/ `curated`（精选地址）/ `third-party`（其余来源）。

> **v0.20 起**：Installed tab 在市场有新版本时显示更新徽章；Official / Third-party tab 按 tier 列出市场插件，Custom tab 从 URL 安装，市场目录按需自动加载。安装第三方插件（任何非官方地址，含 Custom 安装）会先弹出**默认「取消」**的确认提示，只有选择信任来源后才会安装。

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
| `commands` | 一个或多个插件根内的 `./` 目录或 `.md` 文件，注册为插件斜杠命令 |
| `hooks` | 生命周期 hook 规则；字段同 `config.toml` 的 `[[hooks]]` |

`interface` 对象：`displayName` / `shortDescription` / `longDescription` / `developerName` / `websiteURL`。

## 插件斜杠命令（v0.21）

`commands` 把 Markdown 提示词注册成命令，命令名自动带插件 id 前缀，形如 `/kimi-finance:report`。

```json
{
  "name": "kimi-finance",
  "version": "1.0.0",
  "commands": "./commands/"
}
```

`commands/report.md`：

```markdown
---
description: 拉取指定股票的财报并总结
---

拉取 $ARGUMENTS 的最新财报数据，总结营收、利润和关键风险。
```

- `commands` 可指向目录（递归收集 `.md`）或单个 `.md` 文件；无效路径以 diagnostics 显示并忽略。
- frontmatter 可写 `name` / `description`。省略 `name` 时用相对路径命名，省略 `description` 时取正文首行。
- 调用时，命令后文本替换正文里的 `$ARGUMENTS`；若正文没写 `$ARGUMENTS`，参数会以 `ARGUMENTS: ...` 追加到末尾。

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
- 插件 MCP 服务器在 `/reload` 后或新会话启动（v0.20 前为「只在新会话启动」），可随时禁用。启用/禁用某 server 后运行 `/reload` 即可生效。

## 插件中的 Hooks（v0.21）

plugin 可在 manifest 中声明 hook 规则，字段与 `config.toml` 的 `[[hooks]]` 相同：

```json
{
  "hooks": [
    {
      "event": "PreToolUse",
      "matcher": "Bash",
      "command": "node ./hooks/check-bash.mjs",
      "timeout": 5
    }
  ]
}
```

- 仅在 plugin 启用期间生效；禁用 plugin 后停止运行。
- 每条 hook 的工作目录为 plugin 根目录，所以 `command` 可使用 plugin 内的 `./` 路径。
- hook 进程会额外收到 `KIMI_CODE_HOME` 与 `KIMI_PLUGIN_ROOT`。
- 事件列表、stdin JSON、退出码/返回值影响主流程的规则见 `hooks.md`。

## 安全模型

- 安装时不执行命令型插件工具或旧式工具运行时；hooks 仅在插件启用且事件匹配时运行。
- 所有路径在符号链接解析后须留在插件根内。
- 已启用 MCP 服务器在 `/reload` 后或新会话启动，可随时禁用。
- 损坏的 manifest 或不安全路径在 `/plugins info <id>` 的 diagnostics 显示，不影响其它会话。

## 官方插件

**Kimi Datasource** — 自然语言查金融行情、宏观经济、企业工商、学术文献。
装法（v0.20 起）：`/plugins` → **Official** tab → 找到 Kimi Datasource → `Enter` 安装 → `/reload` 或 `/new`。详见 `kimi-datasource` 子 Skill。
