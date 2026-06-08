# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A **collection of Agent Skills** (pure Markdown — no build/lint/test/runtime) documenting the Kimi (Moonshot AI) platform. It uses a **skill-router** architecture: a thin entry skill routes by user intent to four focused sub-skills. The package's stated purpose is to **guide a host agent (Claude Code or the Kimi main agent) to delegate work to the Kimi Code CLI as a sub-agent** (headless shell-out) and to use Kimi's other capabilities. "Editing this repo" = editing documentation; "running" it = installing the sub-skill folders into a skills root.

## Architecture: one repo, many skills + a router

Each top-level directory is an **independently discoverable** skill (directory-form `SKILL.md` + optional `references/`):

- `kimi-router/` (skill name `kimi`) — entry router. Body is a thin **intent → sub-skill** dispatch table; it deliberately holds no detail. Its `description`/`whenToUse` are deliberately broad so any kimi-related query triggers it.
- `kimi-subagent/` — **the core skill**: host shells out to `kimi -p ... --output-format stream-json` to run Kimi as an isolated sub-agent. References: `headless-output.md` (output formats, parsing, exit codes), `patterns.md` (concurrency, task-splitting, when-to-delegate).
- `kimi-cli/` — interactive Node CLI usage. References: `cli-reference.md` (flags/subcommands/mutual-exclusion/keys), `slash-commands.md`.
- `kimi-api/` — open-platform API + Tool Calls. References: `api_guide.md`, `tool_reference.md`.
- `kimi-datasource/` — the official **data plugin**: natural-language queries over financial (stocks + macro), corporate, and academic data.

**Progressive disclosure:** quick-reference lives in each `SKILL.md`; exhaustive detail lives in that skill's `references/`. Don't duplicate the same example across both. The router must not absorb sub-skill detail.

## Conventions

- **Language:** Chinese (with English/code where natural). Match existing tone.
- **Frontmatter is load-bearing:** a skill triggers via its `description`/`whenToUse`. If you add/remove a capability in a `SKILL.md`, update its frontmatter so it still triggers — and keep the router's dispatch table in sync. Keep sub-skill descriptions **mutually distinct** to avoid mis-triggering.
- **Node, not Python.** The CLI was rewritten from Python `kimi-cli` to Node `@moonshot-ai/kimi-code`. When editing, never reintroduce stale Python-era facts. Red flags to grep for and avoid: `uv `, `kimi_cli.tools`, `~/.kimi/` (now `~/.kimi-code/`), `--agent-file` / YAML `agent.yaml` subagents, `wire` mode, `toad` TUI. Current facts: Node ≥ 24.15.0; data dir `~/.kimi-code/`; config `config.toml` + `tui.toml` (`kimi doctor` validates); built-in sub-agents `coder`/`explore`/`plan` (no custom-agent file format — customize via Skills); headless `kimi -p` with `--output-format text|stream-json`.
- **"Create a kimi-subagent" means headless shell-out**, not a YAML agent file (that format is gone in the Node CLI). Keep `kimi-subagent` anchored to this reality.

## Version drift is the main maintenance risk

**Content last verified against `@moonshot-ai/kimi-code` v0.11.0 (2026-06-08).** When updating, first run `kimi --version` and `npm view @moonshot-ai/kimi-code version`; if they differ from 0.11.0, re-check the docs and bump this anchor (and the one in `README.md`).

The CLI/API change often. Before changing commands, flags, paths, or model names, verify against the authoritative docs linked at the bottom of each `SKILL.md` (kimi.com/code/docs for the CLI; platform.kimi.com for the API). Update version-gated notes in place rather than adding parallel sections.

## Validating changes

No automated checks. Verify by: (1) every `SKILL.md` frontmatter is valid YAML with `name` + `description`; (2) cross-references to `references/*.md` resolve; (3) router dispatch table covers all four sub-skills; (4) `grep` for the Python-era red flags above returns nothing; (5) optionally copy a sub-folder into `~/.claude/skills/` (or `~/.kimi-code/skills/`) and confirm it loads and `/skill:kimi` dispatches correctly.
