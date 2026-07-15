# AGENTS.md

Guidance for Codex when working in this repository.

## Repository Shape

This repo is a collection of Agent Skills for the Kimi / Moonshot AI platform. It is pure Markdown: no build, lint, test, or runtime code. Editing this repo means editing skill documentation; "running" it means installing the skill directories into a skills root.

The product direction is **Kimi as a sub-agent base**: a host agent delegates bounded work to Kimi Code CLI, primarily through headless shell-out (`kimi -p`). Keep that positioning central when adding or updating content.

In scope:
- Headless `kimi -p`, `--output-format stream-json`, output parsing, exit codes, and multi-turn continuation.
- Automation auth: API key vs OAuth, provider/model/env/data config needed for delegated runs.
- Built-in tools, `--skills-dir` skill injection, MCP/hooks that constrain the subagent, troubleshooting, and version tracking.
- Kimi API and source-derived datasource gateway usage where they support host-agent workflows.

Out of scope: purely interactive or cosmetic features such as themes, IDE/ACP integration, Web mode, visualizers, and one-off TUI conveniences. When upstream changes these, mark them with a one-line `超出范围` note or `[IGNORE]`; do not deeply document them.

## Architecture

Each top-level skill directory is independently discoverable:

- `kimi-router/` (`name: kimi`): the thin entry router. It maps user intent to sub-skills and must not absorb detailed reference content.
- `kimi-subagent/`: the core skill. It explains how the host shells out to `kimi -p ... --output-format stream-json`, passes complete context, parses output, delegates in parallel, and handles integration failures.
- `kimi-cli/`: Node.js Kimi Code CLI reference: flags, subcommands, sessions, slash commands, config, plugins, MCP, hooks, tools, skills, errors, and changelog.
- `kimi-api/`: OpenAI-compatible Kimi platform API and Tool Calls.
- `kimi-datasource/`: source-derived gateway documentation for direct `POST https://api.kimi.com/coding/v1/tools` calls with a static API key.

Use progressive disclosure: quick-reference belongs in each `SKILL.md`; exhaustive detail belongs under that skill's `references/`. Keep the router body short and keep sub-skill frontmatter mutually distinct.

## Editing Rules

- Write documentation in Chinese, with English/code where natural, matching existing tone.
- `SKILL.md` frontmatter is load-bearing. If a capability is added, removed, renamed, or narrowed, update `description`, `whenToUse`, and `kimi-router/SKILL.md` together.
- Prefer updating existing version-gated notes in place over adding parallel sections.
- Before editing commands, flags, paths, model names, or config keys, verify against the source of truth described below.
- Use `rtk` for shell commands per the global RTK rules. Do not paste the full RTK command catalog into this file.

## Current Kimi Facts

Content is last verified against `@moonshot-ai/kimi-code` v0.24.2, tag date 2026-07-15, checked on 2026-07-15.

Current baseline:
- CLI package: Node.js `@moonshot-ai/kimi-code`, Node >= 22.19.0.
- Data dir: `~/.kimi-code/`; config files: `config.toml` and `tui.toml`; `kimi doctor` validates config.
- Headless delegation: `kimi -p` with `--output-format text|stream-json`.
- Built-in sub-agents: `coder`, `explore`, `plan`; no YAML custom-agent file format. Customize through Skills.
- v0.19.2 made `-c` the GA short option for `--continue`; `-C` is only a hidden legacy alias.
- v0.20.0 added shell mode, Write auto-creating missing parent directories, `/reload` refreshing plugin Skills, and third-party plugin install confirmation.
- v0.21.0 added plugin-declared slash commands, double-`Esc` undo picker, and the thinking-effort refactor; `default_thinking` and `thinking.mode` are deprecated in favor of `[thinking].enabled`.
- v0.22.0 added `[models."<alias>".overrides]`; v0.22.2 added `background.print_wait_ceiling_s` and `tui.disable_paste_burst`; v0.22.3 fixed `kimi -p` to wait for background subagents before exit.
- v0.23.0 enables preserved thinking by default for Kimi models when Thinking is on; disable with `[thinking] keep = "off"` or `KIMI_MODEL_THINKING_KEEP=off`. It also introduced experimental progressive tool disclosure under the early capability name `select_tools`; it remains off by default.
- v0.23.4 added configurable image compression; v0.23.6 added `print_background_mode`, configurable sub-agent timeouts, and renamed the experimental dynamic-tool capability to `dynamically_loaded_tools`.
- v0.24.0 moves timed-out foreground Bash commands into the background by default. v0.24.2 makes `kimi -p` use `print_background_mode = "steer"` by default with effectively unbounded print-mode background/sub-agent waits, raises per-step LLM retries from 3 to 10, and adds `/check-kimi-code-docs`.

Avoid stale Python-era facts unless explicitly documenting migration:
- `uv ` installation flows for the old CLI.
- `kimi_cli.tools`.
- `--agent-file`, YAML `agent.yaml` subagents, `wire` mode, or `toad` TUI.
- Treat old `~/.kimi/` paths as stale except for the datasource exception below.

## Version Drift Workflow

Version drift is the main maintenance risk. Source repo docs and changelog are authoritative because the public site can lag or miss patch releases.

Primary update flow:
1. Check local and published versions: `kimi --version` and `npm view @moonshot-ai/kimi-code version`.
2. Run `scripts/sync-from-upstream.sh [--full]` from this repo. It diffs the official clone at `/Users/ghy/work/github-ghy/kimi-code` unless `KIMI_CODE_REPO` overrides it.
3. Edit only the mapped skill files from the script output. Add new docs pages to the script `MAP`, or mark them `[IGNORE]` if outside the subagent-base positioning.
4. Keep anchors synchronized in `AGENTS.md`, `README.md`, `kimi-cli/references/changelog.md`, and affected `SKILL.md` files.
5. Check `apps/kimi-code/CHANGELOG.md` in the upstream repo for patch-only behavior changes.

The sync script intentionally excludes `customization/datasource.md`; datasource is maintained by source re-derivation.

## Datasource Exception

`kimi-datasource` is authored from plugin source and live gateway probing, not from the official usage page. Official docs describe natural-language OAuth usage, but the source shows a thin gateway wrapper that also accepts static `sk-kimi-...` API keys.

Datasource source of truth:
- Managed plugin source: `~/.kimi-code/plugins/managed/kimi-datasource/bin/kimi-datasource.mjs`.
- Live `get_data_source_desc` probes for the data-source API catalog.
- Re-derivation steps in `kimi-datasource/references/gateway-api.md` section 8.

Do not "fix" legacy datasource paths such as `~/.kimi/plugins/kimi-datasource` or `~/.kimi/credentials` when they are cited as real legacy plugin behavior.

## Validation

There are no automated project checks. After documentation changes, run the smallest relevant verification:

- Verify every `SKILL.md` frontmatter has valid YAML with `name` and `description`.
- Verify links to `references/*.md` resolve.
- Verify `kimi-router/SKILL.md` still covers exactly the four sub-skills.
- Grep for stale Python-era red flags, allowing documented migration text and the datasource legacy-path exception.
- For version updates, run `scripts/sync-from-upstream.sh` and confirm no mapped source changes were missed.
- Optional install check: copy the skill folders into `~/.kimi-code/skills/` or another skills root and confirm `/skill:kimi` routes correctly.
