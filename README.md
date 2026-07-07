# kimi-skill

一组面向 **Kimi (Moonshot AI)** 平台的 Agent Skills，采用 **skill-router** 架构：一个总入口路由
Skill（`kimi`）按用户意图分发到 4 个专门子 Skill。核心目标是**指引宿主 agent（如 Claude Code /
Kimi 主 agent）把 Kimi Code CLI 当作可委派的子 agent**（headless 外壳调用），并灵活使用 kimi 的其它能力。

> 内容依据 Node.js 版 Kimi Code CLI（`@moonshot-ai/kimi-code`）官方文档：https://www.kimi.com/code/docs/
> 源码仓库（权威、含 patch；官方站点会滞后）：https://github.com/MoonshotAI/kimi-code
> 当前校准版本：**kimi-code v0.23.0**（tag 2026-07-06，核对 2026-07-07）。更新前先 `kimi --version` 比对；
> 版本历史与各功能起始版本见 `kimi-cli/references/changelog.md`。

## 组成

| 目录 | Skill 名 | 作用 |
|---|---|---|
| `kimi-router/` | `kimi` | 入口路由：意图 → 子 Skill 分发表 |
| `kimi-subagent/` | `kimi-subagent` | ★ 宿主把 `kimi` 当子 agent：`kimi -p`、stream-json、传上下文、并发委派、多轮、解析 |
| `kimi-cli/` | `kimi-cli` | Node 版 CLI：完整 flag/子命令、会话、斜杠命令、插件/MCP/钩子、配置（config.toml/tui.toml/环境变量/数据目录）、交互与 Goal 模式、安装升级 |
| `kimi-api/` | `kimi-api` | Kimi 开放平台 API、模型列表、Tool Calls、流式 |
| `kimi-datasource/` | `kimi-datasource` | 数据网关（源码逆向）：直连 `api.kimi.com/coding/v1/tools` 用静态 API key 取金融（股票/财报/宏观）、企业工商、学术结构化数据，绕开 OAuth 15min 过期 |

每个子目录是一个**独立、可单独触发**的 Skill（目录式 `SKILL.md` + 可选 `references/`）。
路由 Skill 与子 Skill 通过各平台均支持的 `/skill:<name>` 调用串联。

## 前置要求

这些 Skill 是**指引宿主调用本机 `kimi`**，本身不含运行时——使用前本地环境必须：

1. **安装最新版 Kimi Code CLI**（`@moonshot-ai/kimi-code`，需 Node ≥ 22.19.0）：
   ```bash
   curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash   # macOS / Linux
   # 或 npm i -g @moonshot-ai/kimi-code
   kimi --version        # 建议与本仓库校准版本（见上）对齐；落后则 kimi upgrade
   ```
2. **完成登录**：`kimi login`（或进入后 `/login`，OAuth 设备码或 API key）。
   - 交互/一次性委派：OAuth 即可。
   - **自动化 / cron / subprocess 反复调用**：用 **API key** provider（OAuth 登录态时效短、非交互不可见），见 `kimi-subagent/references/integration-troubleshooting.md`。

未安装或未登录时，`kimi -p` 委派会报 `kimi not found` 或 `auth.login_required`。

## 安装

本仓库是「一仓多 Skill」，需把**每个子目录**分别放入技能根目录（不要把整个仓库当成单个 Skill）。

### Claude Code

```bash
# 全局（所有项目可用）：把 5 个子目录拷入 ~/.claude/skills/
cp -R kimi-router kimi-subagent kimi-cli kimi-api kimi-datasource ~/.claude/skills/
# 或项目级：拷入 <project>/.claude/skills/
```

### Kimi Code CLI

```bash
# 用户级：~/.kimi-code/skills/ 或 ~/.agents/skills/
cp -R kimi-router kimi-subagent kimi-cli kimi-api kimi-datasource ~/.kimi-code/skills/
# 项目级：<project>/.kimi-code/skills/ 或 <project>/.agents/skills/
# 或在 config.toml 配置 extra_skill_dirs 指向本仓库
```

装好后，与 kimi 相关的请求会触发 `kimi` 路由 Skill，再分发到对应子 Skill；也可直接
`/skill:kimi-subagent` 等调用某个子 Skill。

## 维护

CLI / API 变化较快。更新以**源码仓库** https://github.com/MoonshotAI/kimi-code 为准（官方站点滞后、漏 patch）：
跑 `scripts/sync-from-upstream.sh`（diff 本地 clone 的 `docs/` 锚点→最新 tag，按映射列出待改文件），
或用 workflow `sync-kimi-skill` 全自动同步。维护约定详见 `CLAUDE.md`。
