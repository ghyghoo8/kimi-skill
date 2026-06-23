# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A **collection of Agent Skills** (pure Markdown — no build/lint/test/runtime) documenting the Kimi (Moonshot AI) platform. It uses a **skill-router** architecture: a thin entry skill routes by user intent to four focused sub-skills. The package's stated purpose is to **guide a host agent (Claude Code or the Kimi main agent) to delegate work to the Kimi Code CLI as a sub-agent** (headless shell-out) and to use Kimi's other capabilities. "Editing this repo" = editing documentation; "running" it = installing the sub-skill folders into a skills root.

**Scope / positioning (decided 2026-06-23):** the north star is **kimi as a sub-agent base** (host delegates to kimi, primarily headless). In scope: headless `kimi -p` + output parsing, automation auth (API key vs OAuth), provider/model + env + data config a delegated run needs, built-in tools & skill injection (`--skills-dir`), MCP/hooks that gate the subagent, errors, version tracking. **Out of scope — ignore but MARK with a one-line "超出范围" note rather than deep-documenting:** purely interactive/cosmetic features — custom themes (`/theme`/`/custom-theme`), IDE integration (`kimi acp`, Zed/JetBrains), Web mode (`kimi web`/`kimi server`/`kimi vis`), one-off niceties (`/import-from-cc-codex`, `/btw`). When upstream adds such a feature, mark it out-of-scope (the sync script's MAP uses `[IGNORE]`), don't expand it.

## Architecture: one repo, many skills + a router

Each top-level directory is an **independently discoverable** skill (directory-form `SKILL.md` + optional `references/`):

- `kimi-router/` (skill name `kimi`) — entry router. Body is a thin **intent → sub-skill** dispatch table; it deliberately holds no detail. Its `description`/`whenToUse` are deliberately broad so any kimi-related query triggers it.
- `kimi-subagent/` — **the core skill**: host shells out to `kimi -p ... --output-format stream-json` to run Kimi as an isolated sub-agent. References: `headless-output.md` (output formats, parsing, exit codes — incl. Goal-mode `3`/`6`), `patterns.md` (concurrency, task-splitting, when-to-delegate, built-in `coder`/`explore`/`plan`), `integration-troubleshooting.md` (host-program/cron pitfalls: PATH, API-key-vs-OAuth auth, stream-json parsing).
- `kimi-cli/` — interactive Node CLI usage. References: `cli-reference.md` (flags/subcommands/`provider`/mutual-exclusion), `slash-commands.md`, `config-files.md` (every `config.toml`/`tui.toml` key), `env-and-data.md` (override precedence, all env vars, data-dir tree), `plugins.md` (manifest, `/plugins`, MCP-in-plugin), `hooks.md` (events table, stdin/exit-code contract), `interaction.md` (TUI keys, sessions, Goal mode, use-cases), `error-reference.md` (backend error catalog: 401/402/403/429/400/404/500 + tool errors), `mcp.md` (MCP transports stdio/HTTP/SSE, `mcp.json` schema, `/mcp-config`), `tools.md` (built-in tool catalog + approval defaults — informs subagent permission scoping), `skills.md` (Skill authoring + `--skills-dir` injection), `changelog.md` (version history + per-feature "first appeared in" table). Update flow + docs→skill mapping: `scripts/sync-from-upstream.sh`.
- `kimi-api/` — open-platform API + Tool Calls. References: `api_guide.md`, `tool_reference.md`.
- `kimi-datasource/` — the Kimi Code **data gateway**. **This skill is reverse-engineered from the plugin SOURCE, not the official usage docs** (see "kimi-datasource is source-derived" below). Documents direct gateway HTTP (`POST api.kimi.com/coding/v1/tools` with a static API key) to pull structured financial/corporate/academic data, bypassing OAuth's 15-min token expiry and the `kimi -p` LLM hop. References: `gateway-api.md` (full method/data-source/API catalog + auth truth + re-derivation method).

**Progressive disclosure:** quick-reference lives in each `SKILL.md`; exhaustive detail lives in that skill's `references/`. Don't duplicate the same example across both. The router must not absorb sub-skill detail.

## Conventions

- **Language:** Chinese (with English/code where natural). Match existing tone.
- **Frontmatter is load-bearing:** a skill triggers via its `description`/`whenToUse`. If you add/remove a capability in a `SKILL.md`, update its frontmatter so it still triggers — and keep the router's dispatch table in sync. Keep sub-skill descriptions **mutually distinct** to avoid mis-triggering.
- **Node, not Python.** The CLI was rewritten from Python `kimi-cli` to Node `@moonshot-ai/kimi-code`. When editing, never reintroduce stale Python-era facts. Red flags to grep for and avoid: `uv `, `kimi_cli.tools`, `~/.kimi/` (now `~/.kimi-code/`), `--agent-file` / YAML `agent.yaml` subagents, `wire` mode, `toad` TUI. Current facts: Node ≥ 22.19.0 (lowered from 24.15.0 in v0.14.x #622); data dir `~/.kimi-code/`; config `config.toml` + `tui.toml` (`kimi doctor` validates); built-in sub-agents `coder`/`explore`/`plan` (no custom-agent file format — customize via Skills); headless `kimi -p` with `--output-format text|stream-json`.
- **"Create a kimi-subagent" means headless shell-out**, not a YAML agent file (that format is gone in the Node CLI). Keep `kimi-subagent` anchored to this reality.

## Version drift is the main maintenance risk

**Content last verified against `@moonshot-ai/kimi-code` v0.19.1 (released 2026-06-23, verified 2026-06-23; latest minor v0.19.0).** When updating, first run `kimi --version` and `npm view @moonshot-ai/kimi-code version`; if they differ from 0.19.x, re-check the docs and bump this anchor (and the one in `README.md`). The version history + per-feature "first appeared in" table lives in `kimi-cli/references/changelog.md` (mirror of the official what's-new) — keep it current when bumping.

v0.12.0 graduated **Goal mode / background questions / Sub-Skill** out of experimental (GA — no `KIMI_CODE_EXPERIMENTAL_*` flag needed; experimental flags only matter for ≤v0.11), turned **micro-compaction on by default**, added **`/swarm`** (multi-agent parallel) and **proxy support** (`HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY`/SOCKS). v0.13.0 added custom color themes (`/custom-theme`) + `/import-from-cc-codex`. v0.14.0 added the **`Interrupt` hook event** (fires instead of `Stop` when the user hits Esc) and **`/undo`**. v0.15.0 added a cross-workspace session selector and **MCP legacy-SSE** support. v0.16.0 added the **`kimi vis`** subcommand (browser session visualizer). v0.17.0 added **Web mode** (`kimi web` / `/web`, backed by `kimi server`). v0.18.0 added `KIMI_CODE_AGENT_SWARM_MAX_CONCURRENCY`. v0.19.0 added **`/add-dir` + `kimi --add-dir`** with **project-level `.kimi-code/local.toml`** (the CLI now HAS a project-level config file — update older "no project-level config" wording) and **`Ctrl+B`** background tasks.

On 2026-06-08 the following official pages were crawled and folded into `kimi-cli`/`kimi-subagent`/`kimi-datasource`: `reference/kimi-command`, `configuration/config-files`, `configuration/overrides`, `configuration/env-vars`, `configuration/data-locations`, `customization/datasource`, `customization/plugins`, `customization/agents`, `customization/hooks`, `guides/interaction`, `guides/sessions`, `guides/goals`, `guides/use-cases`, `kimi-code/error-reference`, `customization/mcp`. When re-verifying drift, diff against these same pages.

The CLI/API change often. Before changing commands, flags, paths, or model names, verify against the authoritative docs linked at the bottom of each `SKILL.md` (kimi.com/code/docs for the CLI; platform.kimi.com for the API). Update version-gated notes in place rather than adding parallel sections.

### Update mechanism (primary): diff the upstream repo's docs between tags

The canonical way to update this repo on a new release is **`scripts/sync-from-upstream.sh`** — it diffs the official source clone's `docs/` between our current anchor and the latest tag, then prints which skill files need editing. The official site lags, omits patch releases, and has been stale/wrong (Node version, flag mutual-exclusion) — the source repo is authoritative.

- Repo: `https://github.com/MoonshotAI/kimi-code` (npm `@moonshot-ai/kimi-code`; release tags `@moonshot-ai/kimi-code@<v>`). Local clone expected at `/Users/ghy/work/github-ghy/kimi-code` (override via `KIMI_CODE_REPO`). No clone → fall back to `gh api repos/MoonshotAI/kimi-code/...` or WebFetch.
- Run: `scripts/sync-from-upstream.sh [--full]` (auto from changelog anchor → latest tag), or `--from <v> --to <v>`. Then edit each flagged skill file in place, version-gate behavior changes, bump anchors (`CLAUDE.md`/`README.md`/`changelog.md`/SKILLs) + memory, commit.
- **docs path → skill file** mapping lives in the script's `MAP`. **`customization/datasource.md` is intentionally EXCLUDED** — kimi-datasource is implemented separately (source-derived, see below).
- Authoritative changelog incl. **patch** releases: `apps/kimi-code/CHANGELOG.md`. Source-only catches the site missed: Node req **24.15.0 → 22.19.0** (#622); **v0.14.2 #683** lets `--auto`/`--yolo`/`--plan` combine with `--session`/`--continue`; **#999** made `-c` the primary `--continue` short. Always grep the patch notes, not just the minor what's-new.

## kimi-datasource is source-derived (decided 2026-06-18)

The `kimi-datasource` skill is **authored from the plugin source code + live gateway probing, NOT the official usage docs.** Rationale: the official docs frame it as a natural-language black-box requiring OAuth login, but the source shows it's a thin wrapper over a gateway HTTP endpoint (`POST api.kimi.com/coding/v1/tools`) that **also accepts the static API key** (`sk-kimi-...`, never expires) — so a host program can call it directly, dodging OAuth's 15-min `access_token` expiry (the managed plugin's `loadAccessToken()` hard-checks `expires_at`) and the slow/lossy `kimi -p` LLM hop. The official-docs claim "data service must use OAuth, API key can't replace it" was **proven wrong** by direct probing.

**Maintenance rule for this skill:** on a datasource version bump, re-derive from source — don't re-read the official page. Source of truth: `~/.kimi-code/plugins/managed/kimi-datasource/bin/kimi-datasource.mjs` (gateway methods, headers, auth, `expires_at` check) + live `get_data_source_desc` probes for each data-source's API catalog. Step-by-step in `kimi-datasource/references/gateway-api.md` §8. The official URL stays in the doc only for cross-checking, never as the primary source.

**Red-flag exception:** the general "avoid `~/.kimi/`" rule (it's `~/.kimi-code/` now) does **not** apply to this skill's references to `~/.kimi/plugins/kimi-datasource` / `~/.kimi/credentials` — those are the *legacy* plugin's real paths (it genuinely reads the static API key from there) and are cited factually, not as the current data dir. Don't "fix" them.

## Validating changes

No automated checks. Verify by: (1) every `SKILL.md` frontmatter is valid YAML with `name` + `description`; (2) cross-references to `references/*.md` resolve; (3) router dispatch table covers all four sub-skills; (4) `grep` for the Python-era red flags above returns nothing; (5) optionally copy a sub-folder into `~/.claude/skills/` (or `~/.kimi-code/skills/`) and confirm it loads and `/skill:kimi` dispatches correctly.
