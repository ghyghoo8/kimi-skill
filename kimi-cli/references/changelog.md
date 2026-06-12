# 版本跟踪（What's New）

官方更新日志：https://www.kimi.com/code/docs/kimi-code/whats-new.html

**本仓库校准锚点：`@moonshot-ai/kimi-code` v0.14.0（发布 2026-06-10，核对 2026-06-10）。**
更新前先 `kimi --version` / `npm view @moonshot-ai/kimi-code version`，与下表对照判断漂移；有差异则按 `CLAUDE.md`「Version drift」复核相关页面并 bump 锚点。

## 各版本要点（新→旧）

### v0.14.0 — 2026-06-10
- **`Interrupt` hook 事件**：用户中断本轮（如按 `Esc`）时触发；此时 `Stop` 不再触发、由它替代；payload 含 `reason`（观察用）。
- `/undo` 不带参数 → 打开交互式选择器，按条挑要撤销的提示词。
- 修复：OpenAI 兼容 Chat Completions 下工具输出的图片丢失。

### v0.13.0 — 2026-06-10
- 自定义配色主题（JSON，只写想改的颜色，其余沿用基准）；`/custom-theme` 交互生成。
- `/import-from-cc-codex` 一键从 Claude Code / Codex 导入设置。
- Marketplace 显示已装 plugin 的可用更新。
- 修复：浏览器打不开时，设备登录仍保留可见的 URL 与验证码。

### v0.12.0 — 2026-06-09
- **`/swarm`**：多 agent 并行执行任务，实时进度。
- **代理支持**：`HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` / `NO_PROXY` 及 SOCKS。
- **Goal 模式 / 后台提问 / Sub-Skill 正式发布**（不再是实验特性）。
- **Micro compaction 默认开启**（上下文优化）。
- Homebrew 自动更新；`KIMI_CODE_HOME` 目录支持。

### v0.11.0 — 2026-06-05
- 内置 Skills 直接作为斜杠命令出现，**无需 `skill:` 前缀**。
- 新增实验性 **Sub-Skill 发现系统**（`sub-skill.review`、`sub-skill.consolidate`），用 `KIMI_CODE_EXPERIMENTAL_SUB_SKILL=1` 启用。
- Goal 模式在 YOLO 下启动前会确认并建议切到 Auto。
- 多个 Goal 队列 bug 修复。

### v0.10.1 — 2026-06-04
- 修复 TUI 启动 Goal 时的崩溃。

### v0.10.0 — 2026-06-04
- Goal 排队：`/goal next <目标>` 安排后续任务。
- `/experiments` 实验面板（可视化开关）。
- 新增内置 `update-config` Skill（直接改配置）。
- `/reload`：改配置后原地重载会话。
- `kimi doctor`：配置校验。

### v0.9.0 — 2026-06-03
- `kimi acp` 子命令（Agent Client Protocol，IDE 集成）。
- `/btw` 侧聊（非阻塞提问）。
- Windows Git Bash 探测改进。

### v0.8.0 — 2026-06-02
- 自主 **Goal 模式**（实验）：`/goal <目标>`。
- 后台结构化提问，避免流程阻塞。
- `kimi provider` 子命令（终端管理供应商）。
- 默认开启后台自动更新。

### v0.7.0 — 2026-06-02
- `/provider` 交互式供应商管理界面。
- `KIMI_MODEL_ADAPTIVE_THINKING` 环境变量（自定义端点）。
- 定时任务时间按本地时区显示。

## 功能首次出现版本（便于版本门控）

| 功能 | 起始版本 |
|---|---|
| `/provider` 交互界面 | v0.7.0 |
| `kimi provider` 子命令、Goal 模式 `/goal` | v0.8.0 |
| `kimi acp`、`/btw` | v0.9.0 |
| `kimi doctor`、`/reload`、`/experiments`、`/goal next`、内置 `update-config` | v0.10.0 |
| 内置 Skills 免 `skill:` 前缀、Sub-Skill 发现（实验，`KIMI_CODE_EXPERIMENTAL_SUB_SKILL`） | v0.11.0 |
| `/swarm` 多 agent 并行（自动重试限流）、代理支持（`*_PROXY`/SOCKS）、Goal/后台提问/Sub-Skill **转正**、micro compaction 默认开、`KIMI_CODE_HOME` 加载 Skills/全局指令 | v0.12.0 |
| 自定义配色主题、`/custom-theme`、`/import-from-cc-codex`、Marketplace 显示插件更新 | v0.13.0 |
| `Interrupt` hook 事件、`/undo` 交互式选择 | v0.14.0 |
