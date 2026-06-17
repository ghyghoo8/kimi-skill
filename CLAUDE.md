# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A **collection of Agent Skills** (pure Markdown — no build/lint/test/runtime) documenting the Kimi (Moonshot AI) platform. It uses a **skill-router** architecture: a thin entry skill routes by user intent to four focused sub-skills. The package's stated purpose is to **guide a host agent (Claude Code or the Kimi main agent) to delegate work to the Kimi Code CLI as a sub-agent** (headless shell-out) and to use Kimi's other capabilities. "Editing this repo" = editing documentation; "running" it = installing the sub-skill folders into a skills root.

## Architecture: one repo, many skills + a router

Each top-level directory is an **independently discoverable** skill (directory-form `SKILL.md` + optional `references/`):

- `kimi-router/` (skill name `kimi`) — entry router. Body is a thin **intent → sub-skill** dispatch table; it deliberately holds no detail. Its `description`/`whenToUse` are deliberately broad so any kimi-related query triggers it.
- `kimi-subagent/` — **the core skill**: host shells out to `kimi -p ... --output-format stream-json` to run Kimi as an isolated sub-agent. References: `headless-output.md` (output formats, parsing, exit codes — incl. Goal-mode `3`/`6`), `patterns.md` (concurrency, task-splitting, when-to-delegate, built-in `coder`/`explore`/`plan`), `integration-troubleshooting.md` (host-program/cron pitfalls: PATH, API-key-vs-OAuth auth, stream-json parsing).
- `kimi-cli/` — interactive Node CLI usage. References: `cli-reference.md` (flags/subcommands/`provider`/mutual-exclusion), `slash-commands.md`, `config-files.md` (every `config.toml`/`tui.toml` key), `env-and-data.md` (override precedence, all env vars, data-dir tree), `plugins.md` (manifest, `/plugins`, MCP-in-plugin), `hooks.md` (events table, stdin/exit-code contract), `interaction.md` (TUI keys, sessions, Goal mode, use-cases), `error-reference.md` (backend error catalog: 401/402/403/429/400/404/500 + tool errors), `mcp.md` (MCP transports stdio/HTTP/SSE, `mcp.json` schema, `/mcp-config`), `changelog.md` (version history + per-feature "first appeared in" table).
- `kimi-api/` — open-platform API + Tool Calls. References: `api_guide.md`, `tool_reference.md`.
- `kimi-datasource/` — the official **data plugin**: natural-language queries over financial (stocks + macro), corporate, and academic data.

**Progressive disclosure:** quick-reference lives in each `SKILL.md`; exhaustive detail lives in that skill's `references/`. Don't duplicate the same example across both. The router must not absorb sub-skill detail.

## Conventions

- **Language:** Chinese (with English/code where natural). Match existing tone.
- **Frontmatter is load-bearing:** a skill triggers via its `description`/`whenToUse`. If you add/remove a capability in a `SKILL.md`, update its frontmatter so it still triggers — and keep the router's dispatch table in sync. Keep sub-skill descriptions **mutually distinct** to avoid mis-triggering.
- **Node, not Python.** The CLI was rewritten from Python `kimi-cli` to Node `@moonshot-ai/kimi-code`. When editing, never reintroduce stale Python-era facts. Red flags to grep for and avoid: `uv `, `kimi_cli.tools`, `~/.kimi/` (now `~/.kimi-code/`), `--agent-file` / YAML `agent.yaml` subagents, `wire` mode, `toad` TUI. Current facts: Node ≥ 24.15.0; data dir `~/.kimi-code/`; config `config.toml` + `tui.toml` (`kimi doctor` validates); built-in sub-agents `coder`/`explore`/`plan` (no custom-agent file format — customize via Skills); headless `kimi -p` with `--output-format text|stream-json`.
- **"Create a kimi-subagent" means headless shell-out**, not a YAML agent file (that format is gone in the Node CLI). Keep `kimi-subagent` anchored to this reality.

## Version drift is the main maintenance risk

**Content last verified against `@moonshot-ai/kimi-code` v0.16.0 (released 2026-06-16, verified 2026-06-17).** When updating, first run `kimi --version` and `npm view @moonshot-ai/kimi-code version`; if they differ from 0.16.0, re-check the docs and bump this anchor (and the one in `README.md`). The version history + per-feature "first appeared in" table lives in `kimi-cli/references/changelog.md` (mirror of the official what's-new) — keep it current when bumping.

v0.12.0 graduated **Goal mode / background questions / Sub-Skill** out of experimental (GA — no `KIMI_CODE_EXPERIMENTAL_*` flag needed; experimental flags only matter for ≤v0.11), turned **micro-compaction on by default**, added **`/swarm`** (multi-agent parallel) and **proxy support** (`HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY`/SOCKS). v0.13.0 added custom color themes (`/custom-theme`) + `/import-from-cc-codex`. v0.14.0 added the **`Interrupt` hook event** (fires instead of `Stop` when the user hits Esc) and **`/undo`**. v0.15.0 added a cross-workspace session selector and **MCP legacy-SSE** support. v0.16.0 added the **`kimi vis`** subcommand (browser session visualizer).

On 2026-06-08 the following official pages were crawled and folded into `kimi-cli`/`kimi-subagent`/`kimi-datasource`: `reference/kimi-command`, `configuration/config-files`, `configuration/overrides`, `configuration/env-vars`, `configuration/data-locations`, `customization/datasource`, `customization/plugins`, `customization/agents`, `customization/hooks`, `guides/interaction`, `guides/sessions`, `guides/goals`, `guides/use-cases`, `kimi-code/error-reference`, `customization/mcp`. When re-verifying drift, diff against these same pages.

The CLI/API change often. Before changing commands, flags, paths, or model names, verify against the authoritative docs linked at the bottom of each `SKILL.md` (kimi.com/code/docs for the CLI; platform.kimi.com for the API). Update version-gated notes in place rather than adding parallel sections.

## Validating changes

No automated checks. Verify by: (1) every `SKILL.md` frontmatter is valid YAML with `name` + `description`; (2) cross-references to `references/*.md` resolve; (3) router dispatch table covers all four sub-skills; (4) `grep` for the Python-era red flags above returns nothing; (5) optionally copy a sub-folder into `~/.claude/skills/` (or `~/.kimi-code/skills/`) and confirm it loads and `/skill:kimi` dispatches correctly.
