#!/usr/bin/env bash
# sync-from-upstream.sh — 基于官方源码仓库的 tag 间 docs diff，驱动本仓库 skill 更新。
#
# 用法:
#   scripts/sync-from-upstream.sh [--full] [--to <tag-or-version>] [--from <tag-or-version>]
#
# 机制:
#   1. 在官方 clone 里 git fetch --tags
#   2. from = 本仓库当前锚点(从 changelog.md 解析)，to = 最新 released tag
#   3. 按「docs 路径 → 本仓库 skill 文件」映射，逐条打印 diffstat（--full 打印完整 diff）
#   4. 打印「待更新清单」：哪些 skill 文件需要据 diff 改
#   kimi-datasource 单独实现，**不在同步范围**。
#
# 官方 clone 位置(可用环境变量 KIMI_CODE_REPO 覆盖):
REPO="${KIMI_CODE_REPO:-/Users/ghy/work/github-ghy/kimi-code}"
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # 本 skill 仓库根
TAG_PREFIX="@moonshot-ai/kimi-code@"

FULL=0; FROM=""; TO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --full) FULL=1; shift;;
    --from) FROM="$2"; shift 2;;
    --to)   TO="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

if [ ! -d "$REPO/.git" ]; then
  echo "✗ 找不到官方 clone: $REPO" >&2
  echo "  请 git clone https://github.com/MoonshotAI/kimi-code 或设 KIMI_CODE_REPO" >&2
  echo "  （无 clone 时回退方案：gh api repos/MoonshotAI/kimi-code/... 或 WebFetch 文档站）" >&2
  exit 1
fi

git -C "$REPO" fetch --tags --prune --quiet

norm_tag() {  # 把 v0.19.1 / 0.19.1 / 完整 tag 统一成完整 tag
  case "$1" in
    "$TAG_PREFIX"*) echo "$1";;
    v*) echo "${TAG_PREFIX}${1#v}";;
    *)  echo "${TAG_PREFIX}${1}";;
  esac
}

# from: 优先 --from，否则解析本仓库 changelog 锚点 "v0.X.Y"
if [ -z "$FROM" ]; then
  FROM="$(grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' "$SELF_DIR/kimi-cli/references/changelog.md" | head -1)"
fi
# to: 优先 --to，否则最新 released tag
if [ -z "$TO" ]; then
  TO="$(git -C "$REPO" tag --sort=-creatordate | grep -F "$TAG_PREFIX" | head -1)"
fi
FROM_TAG="$(norm_tag "$FROM")"; TO_TAG="$(norm_tag "$TO")"

echo "════════════════════════════════════════════════════════════"
echo " 官方 clone : $REPO"
echo " 本仓库锚点 : $FROM   →  最新 tag: ${TO_TAG#$TAG_PREFIX}"
echo " diff 范围  : $FROM_TAG .. $TO_TAG"
echo "════════════════════════════════════════════════════════════"
git -C "$REPO" rev-parse -q --verify "$FROM_TAG^{}" >/dev/null || { echo "✗ 无此 tag: $FROM_TAG" >&2; exit 1; }
git -C "$REPO" rev-parse -q --verify "$TO_TAG^{}"  >/dev/null || { echo "✗ 无此 tag: $TO_TAG"  >&2; exit 1; }

# docs 路径 → 本仓库 skill 文件。
# 定位＝「kimi 做 subagent 底座」：与此无关的交互/外观功能标 [IGNORE] 跳过。
# kimi-datasource 单独实现，也排除。
MAP="
reference/kimi-command.md|kimi-cli/references/cli-reference.md
reference/slash-commands.md|kimi-cli/references/slash-commands.md
reference/keyboard.md|kimi-cli/references/cli-reference.md + interaction.md
reference/tools.md|kimi-cli/references/tools.md
reference/kimi-acp.md|[IGNORE] IDE/ACP 集成，与 subagent 底座无关
configuration/config-files.md|kimi-cli/references/config-files.md
configuration/overrides.md|kimi-cli/references/env-and-data.md
configuration/env-vars.md|kimi-cli/references/env-and-data.md
configuration/data-locations.md|kimi-cli/references/env-and-data.md
configuration/providers.md|kimi-cli/references/config-files.md（[providers] 段）
customization/mcp.md|kimi-cli/references/mcp.md
customization/hooks.md|kimi-cli/references/hooks.md
customization/plugins.md|kimi-cli/references/plugins.md
customization/agents.md|kimi-subagent/references/patterns.md
customization/skills.md|kimi-cli/references/skills.md
customization/themes.md|[IGNORE] 自定义主题/外观，与 subagent 底座无关
guides/interaction.md|kimi-cli/references/interaction.md（仅取 headless 相关：模式/会话续接/退出码）
guides/sessions.md|kimi-cli/references/interaction.md
guides/goals.md|kimi-cli/references/interaction.md（仅 -p 退出码 3/6）
guides/use-cases.md|kimi-cli/references/interaction.md
guides/ides.md|[IGNORE] IDE 集成，与 subagent 底座无关
guides/migration.md|kimi-cli/SKILL.md（安装段，简述）
kimi-code/error-reference.md|kimi-cli/references/error-reference.md
release-notes/changelog.md|kimi-cli/references/changelog.md
"

echo
echo "## CHANGELOG 差异（apps/kimi-code/CHANGELOG.md）"
git -C "$REPO" diff --stat "$FROM_TAG..$TO_TAG" -- apps/kimi-code/CHANGELOG.md || true

echo
echo "## 变更的 docs（按映射，→ 需更新的 skill 文件）"
printf '%s\n' "$MAP" | while IFS='|' read -r doc target; do
  [ -z "$doc" ] && continue
  stat="$(git -C "$REPO" diff --stat "$FROM_TAG..$TO_TAG" -- "docs/zh/$doc" "docs/en/$doc" 2>/dev/null)"
  [ -z "$stat" ] && continue
  case "$target" in
    \[IGNORE\]*) echo "  ○ $doc  →  $target（跳过）";;
    *) echo "  ● $doc  →  $target"
       [ "$FULL" = 1 ] && git -C "$REPO" diff "$FROM_TAG..$TO_TAG" -- "docs/zh/$doc" | sed 's/^/      /';;
  esac
done

echo
echo "提示：逐条按上面清单改对应 skill 文件，行为变更打版本门控；"
echo "      改完 bump 锚点（CLAUDE.md / README.md / changelog.md / 各 SKILL）+ 记忆，再 commit。"
echo "      ⚠️ kimi-datasource 单独实现，不在本同步范围。"
