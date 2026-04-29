# kimi-skill
根据[kimi开发平台文档](https://platform.kimi.com/docs/overview)生成的cc-skill
## Skill 安装指南
Skill 的安装方式主要取决于你所使用的 AI 平台或工具（如 Claude Code, OpenClaw 等）。以下是几种主流的安装方法：
------------------------------
## 1. Claude Code 官方/第三方 Skill 安装
对于使用 Claude Code 的开发者，推荐使用命令行工具进行快速安装。
## A. 命令行自动安装（最推荐）
使用 npx 或 bunx 直接从 GitHub 仓库获取：

# 格式：npx skills add <用户名/仓库名>
npx skills add <owner/repo> -g -y

## B. 手动安装

   1. 下载 Skill 的源码（通常是 .js 或 .ts 文件）。
   2. 将文件存放在以下路径之一：
   * 当前项目路径：./.claude/skills/
      * 全局路径：~/.claude/skills/
   3. 重启 Claude Code 即可自动加载。

------------------------------
## 2. 使用 OpenSkills 工具管理
OpenSkills 是一个通用的技能管理利器。

* 安装管理工具：

npm i -g openskills

* 安装特定技能：

openskills install <用户名/仓库名>


------------------------------
## 3. OpenClaw (原 Clawdbot) 安装方式
针对集成在即时通讯软件（如微信、Telegram）中的机器人：

* 对话指令安装：
在对话框中直接输入：安装技能 <技能名称>。
* 后台面板上传：
通过 OpenClaw 的管理后台，在“技能管理”模块直接上传 Skill 文件夹。

------------------------------
## 4. 常见问题与目录规范
为了确保 Skill 能够正常运行，请检查以下内容：

| 检查项 | 说明 |
|---|---|
| 目录结构 | 技能通常以文件夹形式存在，内含 index.js 或 skill.json。 |
| 依赖环境 | 部分 Skill 需要 Node.js 环境或特定的 API Key。 |
| 权限设置 | 确保 AI 具有读取 .claude/skills/ 目录的权限。 |

------------------------------
💡 提示：如果你需要寻找高质量的现成技能，可以访问 [Awesome Agent Skills](https://github.com/libukai/awesome-agent-skills) 仓库。
你目前是打算为 Claude Code 还是 其他 AI 平台 安装特定功能的 Skill 呢？

