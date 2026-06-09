# 交互 · 会话 · Goal 模式

依据官方指南：
- interaction：https://www.kimi.com/code/docs/kimi-code-cli/guides/interaction.html
- sessions：https://www.kimi.com/code/docs/kimi-code-cli/guides/sessions.html
- goals：https://www.kimi.com/code/docs/kimi-code-cli/guides/goals.html
- use-cases：https://www.kimi.com/code/docs/kimi-code-cli/guides/use-cases.html

## 一、TUI 交互与按键

TUI 三区：输入框、对话视图、状态栏。

### 输入与历史

| 键 | 作用 |
|---|---|
| `Enter` | 发送消息 |
| `Shift-Enter` / `Ctrl-J` | 换行（多行输入） |
| `↑` / `↓` | 浏览输入历史（输入框为空时） |
| `Ctrl-D` | 退出（输入框为空时） |
| `Ctrl-C` ×2 | 空闲时连按两次退出 |
| `/exit` | 退出 |

### 媒体与文件引用

- **粘贴图片/视频**：`Ctrl-V`（macOS/Linux）/ `Alt-V`（Windows）。输入框出现占位符，提交时自动替换为内容。依赖模型多模态能力（`image_in`/`video_in`）。
- **文件引用**：输入 `@` 触发路径补全，插入相对路径并自动加载文件内容。隐藏目录（`.` 开头）要显式输入，如 `@.github/`。

### 斜杠命令与 Skills

- `/` 开头触发自动补全菜单。外部 skill 显示为 `/skill:<name>`（无命名冲突时可 `/<name>`）；内置 skill 直接 `/<name>`。
- 流式输出中多数命令不可用，先 `Esc` 打断；但 `/yolo` `/plan` `/help` `/btw` 等模式/常用命令**始终可用**。

### 流式输出中

| 键 | 作用 |
|---|---|
| `Ctrl-S` | 把输入框内容**立即插入**当前轮次 |
| `Esc` / `Ctrl-C` | 打断当前轮次（不退出） |
| `Ctrl-O` | 全局折叠/展开工具输出 |

### 审批面板

有副作用的工具调用（写文件、执行命令）弹审批面板：方向键导航，`Enter` 或数字键 `1`/`2`/`3` 确认，`Esc`/`Ctrl-C`/`Ctrl-D` 拒绝。「本会话内允许」自动放行同类调用；永久规则写配置文件（见 `config-files.md` 的 `[[permission.rules]]`）。

### 外部编辑器

`Ctrl-G` 打开外部编辑器编辑输入；保存则回填输入框，未保存则丢弃。优先级：`tui.toml` 的 `[editor].command` ＞ `$VISUAL` ＞ `$EDITOR`。

## 二、模式切换

| 模式 | 开启 | 行为 |
|---|---|---|
| **Plan** | `Shift-Tab` / `/plan` / `--plan` | 先产出行动计划，须批准才执行；`/plan clear` 清计划（仅空闲时） |
| **YOLO** | `/yolo` / `-y` | 跳过工具审批（**仅 Plan 退出例外**）。⚠️ 仅可信目录 |
| **Auto** | `/auto` / `--auto` | 自动处理审批但**禁止 agent 向用户提问**，适合无人值守 |

## 三、会话管理

CLI 把每次对话持久化为一个「会话」，保留消息历史与元数据，可关终端后再续。

### 存储（按工作目录分组）

```
~/.kimi-code/
├── session_index.jsonl          # 会话索引
└── sessions/
    └── <workDirKey>/<sessionId>/
        ├── state.json           # 标题、创建时间等元数据
        └── agents/*/wire.jsonl  # Agent 事件流，用于恢复与回放
```

> 每个项目目录维护独立会话历史。**勿手动编辑 `sessions/` 下文件**，否则可能无法恢复。

### 创建 / 续接

- `kimi`：每次直接启动都新建会话。
- `kimi --continue`（`-C`）：续接当前目录最近会话。
- `kimi --session <id>`（`-S`）：续接指定 id。
- `kimi --session`：交互式会话浏览器。
- 互斥：`-C` ↔ `-S`；`--yolo`/`--plan` 不能与它们同用。

### 会话内斜杠命令（空闲时）

| 命令（别名） | 作用 |
|---|---|
| `/new`（`/clear`） | 切到新会话，丢弃当前上下文 |
| `/sessions`（`/resume`） | 浏览并恢复历史会话 |
| `/fork` | 派生当前会话；两份彼此独立。**已存目标不带入派生会话** |
| `/title <text>`（`/rename`） | 设标题；无参则显示当前标题 |
| `/compact [指令]` | 上下文接近上限时自动压缩；手动可带指令，如 `/compact 保留与数据库迁移相关的讨论` |

### 导出

- `kimi export <sessionId>`；`-o <path>` 指定输出。
- `/export-debug-zip`：等同 `kimi export` 的调试 ZIP。
- `/export-md`（`/export`）：导出 Markdown，默认 `kimi-export-<short-id>-<timestamp>.md`。
- ⚠️ 导出文件可能含代码、命令输出、路径等敏感信息。

## 四、Goal 模式

让 kimi 跨多轮朝**明确终态**推进（如「修完所有失败测试」「定位并解决构建失败根因」）。目标应给出可验证的完成判据。

### 开启

- **v0.12.0+：已正式发布**，直接 `kimi` 后用 `/goal` 即可，无需实验开关。
- **≤v0.11：实验特性**，需 `KIMI_CODE_EXPERIMENTAL_GOAL_COMMAND=1 kimi`（或 config.toml `[experimental].goal_command = true`）。

### 命令

```
/goal 修复项目 GitHub issues 中列出的 bug
```

| 命令 | 作用 |
|---|---|
| `/goal` 或 `/goal status` | 显示当前目标与进度 |
| `/goal pause` | 暂停（不删除） |
| `/goal resume` | 继续暂停/受阻的目标 |
| `/goal cancel` | 删除当前目标 |
| `/goal replace <目标>` | 替换当前目标 |
| `/goal next <目标>` | 排队后续目标（不打断当前），如 `/goal next 测试通过后更新发布说明` |
| `/goal next manage` | 交互管理队列：方向键导航，Space 选，E 改，D 删，Esc 取消；Shift-Enter/Ctrl-J 换行，Enter 保存 |

### 终态

- **完成**：kimi 自动清除目标。
- **暂停**：用户暂停、打断轮次、或恢复了旧会话。
- **受阻**：需用户输入 / 无法达成 / 超预算 / 运行时失败。当前目标受阻且有排队目标时，TUI 会提示。

### 适用与回避

- 适合：有可验证终点（测试输出、文件改动、命令结果）的任务。
- 回避：宽泛话题、开放讨论、不可能任务、含糊或过于复杂的目标。

### Prompt（`-p`）模式限制

仅支持「创建目标」。退出码：`0` 完成、`3` 受阻、`6` 暂停（见 `kimi-subagent/references/headless-output.md`）。

## 五、典型用例（use-cases）

七类常见场景，均为自然语言提问驱动：

1. **理解陌生项目**：梳理架构、入口、模块依赖、配置/数据加载流程；定位某机制实现。
2. **实现新功能**：新增工具/函数并迭代改进。
3. **修 Bug**：先排查列可疑位置，再定位修复（尤其偶发/并发问题）。
4. **测试与重构**：补单测覆盖多场景；抽取重复逻辑成中间件。
5. **一次性脚本/自动化**：批量改写代码（如 `var`→`const`）、分析日志统计。
6. **定时任务与提醒**：如「下午 2:30 提醒我查部署」「每工作日 9 点汇总 CI 失败」（cron 能力，可用 `KIMI_DISABLE_CRON` 关闭）。
7. **文档生成与维护**：改了接口签名后同步 JSDoc / README 示例。
