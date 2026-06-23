export const meta = {
  name: 'sync-kimi-skill',
  description: '据官方源码仓库 docs diff 自动更新本 skill（kimi 做 subagent 底座，忽略无关功能）',
  phases: [
    { title: 'Scan', detail: '在官方 clone 里 diff，按目标文件分组出在范围内的变更' },
    { title: 'Update', detail: '每个目标 skill 文件一个 agent，in-place 改写' },
    { title: 'Verify', detail: '对抗式复核每处改动是否忠实于上游 diff、是否臆造/越界' },
    { title: 'Finalize', detail: 'bump 锚点 + 校验 + commit' },
  ],
}

const REPO = (args && args.repo) || '/Users/ghy/work/github-ghy/kimi-code'
const TO = (args && args.toRef) || ''      // 空＝最新 released tag
const FROM = (args && args.fromRef) || ''  // 空＝本仓库 changelog 锚点

const SCOPE = `定位：本仓库是「用 kimi 做 subagent 底座」的 Agent Skill 集（宿主 headless 委派 kimi）。
铁律：
- 只更新与该定位相关的内容；纯交互/外观功能（themes、IDE/ACP、kimi web/server/vis、纯 TUI 便捷项）一律**忽略**，
  若上游新增这类内容，只在对应文件留一行「⚠️ 超出范围」标记，不展开。
- kimi-datasource 单独实现，**完全不动**。
- 行为变更要打版本门控（如「v0.X 起……」）；官方未公开的字段/schema **不得臆造**。
- 中文为主，匹配既有文风；改动 in-place，别新增平行小节。
权威约定见本仓库根 CLAUDE.md。`

const SCAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    fromRef: { type: 'string' }, toRef: { type: 'string' },
    changedTargets: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          target: { type: 'string', description: '本仓库要改的文件相对路径' },
          sourceDocs: { type: 'array', items: { type: 'string' } },
        }, required: ['target', 'sourceDocs'],
      },
    },
    ignoredChanged: { type: 'array', items: { type: 'string' }, description: '有变更但超出范围、被跳过的上游 doc' },
  }, required: ['fromRef', 'toRef', 'changedTargets'],
}

phase('Scan')
const scan = await agent(
  `在官方 Kimi Code clone (${REPO}) 里算出需要同步到本 skill 仓库（cwd）的变更。

步骤：
1. \`git -C ${REPO} fetch --tags --prune --quiet\`。
2. 确定 from：${FROM ? `用 "${FROM}"` : '读本仓库 kimi-cli/references/changelog.md 第一个 v0.X.Y 锚点，转成 tag @moonshot-ai/kimi-code@<去v>'}。
   确定 to：${TO ? `用 "${TO}"（可能是分支如 origin/main）` : '最新 released tag（git -C 里 tag 按 creatordate 倒序、含 @moonshot-ai/kimi-code@ 的第一个）'}。
3. 对下面【docs 路径→本仓库目标文件】映射，逐组用 \`git -C ${REPO} diff --stat <from>..<to> -- docs/zh/<doc> docs/en/<doc>\` 判断该组是否有变更；
   release-notes/changelog 这组还要带上 \`apps/kimi-code/CHANGELOG.md\` 一起判断。
   只把**有变更**的目标放进 changedTargets（合并同一 target 的多个 sourceDocs）。

映射（在范围内）：
- reference/kimi-command.md, reference/keyboard.md → kimi-cli/references/cli-reference.md
- reference/slash-commands.md → kimi-cli/references/slash-commands.md
- reference/tools.md → kimi-cli/references/tools.md
- configuration/config-files.md, configuration/providers.md → kimi-cli/references/config-files.md
- configuration/overrides.md, configuration/env-vars.md, configuration/data-locations.md → kimi-cli/references/env-and-data.md
- customization/mcp.md → kimi-cli/references/mcp.md
- customization/hooks.md → kimi-cli/references/hooks.md
- customization/plugins.md → kimi-cli/references/plugins.md
- customization/skills.md → kimi-cli/references/skills.md
- customization/agents.md → kimi-subagent/references/patterns.md
- guides/interaction.md, guides/sessions.md, guides/goals.md, guides/use-cases.md → kimi-cli/references/interaction.md
- kimi-code/error-reference.md → kimi-cli/references/error-reference.md
- release-notes/changelog.md (+ apps/kimi-code/CHANGELOG.md) → kimi-cli/references/changelog.md

忽略（有变更也只记进 ignoredChanged，不要列入 changedTargets）：
- customization/themes.md, customization/datasource.md, reference/kimi-acp.md, guides/ides.md
（datasource 单独实现；其余为交互/外观，超出范围。）

只读不写。返回结构化结果。`,
  { label: 'scan', phase: 'Scan', schema: SCAN_SCHEMA },
)

log(`from ${scan.fromRef} → to ${scan.toRef}；命中 ${scan.changedTargets.length} 个目标，忽略 ${(scan.ignoredChanged||[]).length} 个超范围变更`)

if (!scan.changedTargets.length) {
  log('无范围内变更，结束。')
  return { fromRef: scan.fromRef, toRef: scan.toRef, updated: [], note: 'no in-scope doc changes' }
}

const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    target: { type: 'string' }, ok: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  }, required: ['target', 'ok'],
}

// Update → Verify 逐目标流水（不同目标改不同文件，可并行无冲突）
const results = await pipeline(
  scan.changedTargets,
  (t) => agent(
    `${SCOPE}

任务：把官方 docs 在 ${scan.fromRef}..${scan.toRef} 的变更，同步进本仓库文件 **${t.target}**。
上游来源文档：${t.sourceDocs.join(', ')}（在 ${REPO}/docs/zh/ 与 docs/en/ 下）。

步骤：
1. 逐个 \`git -C ${REPO} diff ${scan.fromRef}..${scan.toRef} -- docs/zh/<doc>\`（changelog 目标还要 diff apps/kimi-code/CHANGELOG.md）看清改了什么。
2. Read 本仓库 ${t.target}，对照 diff **in-place 编辑**：新增/变更的事实补上、过时的改正、行为变更打版本门控、超范围内容只留标记。
3. 若该目标是 changelog.md：补齐新版本条目与「功能首次出现」表；但**锚点行**留给 Finalize 统一改。
不改其它文件。返回：改了哪些点（简明 bullet）。`,
    { label: `update:${t.target.split('/').pop()}`, phase: 'Update' },
  ).then((summary) => ({ target: t.target, sourceDocs: t.sourceDocs, summary })),
  (r) => agent(
    `${SCOPE}

对抗式复核：本仓库文件 **${r.target}** 刚据上游 ${scan.fromRef}..${scan.toRef} 的 ${r.sourceDocs.join(', ')} 做了更新。
请：① 重跑相关 \`git -C ${REPO} diff\` 与 Read ${r.target}，核对改动是否**忠实**于上游、有无**臆造**官方未写的字段、有无把**超范围**内容展开、版本门控是否正确。
② 发现问题就**直接修正** ${r.target}。返回 ok 与问题列表（若有）。`,
    { label: `verify:${r.target.split('/').pop()}`, phase: 'Verify', schema: VERDICT_SCHEMA },
  ).then((v) => ({ ...r, verdict: v })),
)

const updated = results.filter(Boolean)
phase('Finalize')
const report = await agent(
  `${SCOPE}

收尾。已更新的文件：
${updated.map((r) => `- ${r.target}: ${r.summary ? String(r.summary).slice(0, 200) : ''}`).join('\n')}

步骤：
1. 确定目标版本：读 ${REPO} 的 apps/kimi-code/CHANGELOG.md 顶部。若 to=${scan.toRef} 对应某个**已发布**版本，锚点就用它（带发布日期）；
   若 to 是分支（如 origin/main）且只有**未发布**改动，**不要捏造发布日期**——把锚点标成「最新 released tag」并在 changelog.md 标注 unreleased/main 增量。
2. 统一 bump 锚点：CLAUDE.md、README.md、kimi-cli/SKILL.md、kimi-cli/references/changelog.md（保持四处一致）。
3. 校验：每个 SKILL.md frontmatter 有 name+description；所有 \`references/*.md\` 内部链接解析；
   grep Python 红旗（uv/~/.kimi/ 等）为空（CLAUDE.md 定义清单除外）；无残留旧锚点。有问题就修。
4. \`git add -A && git commit\`，中文 message 概述本次同步（含版本范围与改动文件）。**只 commit 不 push。**
返回：最终 commit 标题 + 一句话总结 + 校验结论。`,
  { label: 'finalize', phase: 'Finalize' },
)

return { fromRef: scan.fromRef, toRef: scan.toRef, updated: updated.map((r) => r.target), ignored: scan.ignoredChanged || [], report }
