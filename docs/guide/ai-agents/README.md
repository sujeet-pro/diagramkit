---
title: AI Agents
description: Agent-first onboarding and automation workflow for diagramkit.
---

# AI Agents

<picture>
  <source srcset=".diagramkit/ai-agent-workflow-dark.svg" media="(prefers-color-scheme: dark)">
  <img src=".diagramkit/ai-agent-workflow-light.svg" alt="AI agent workflow sequence diagram">
</picture>

This page is the fastest path for agent-driven setup and usage.

## 60-Second Agent Flow

Ask your coding agent (any of Claude Code, Cursor, Codex, Continue, OpenCode, Windsurf, GitHub Copilot, ...):

> Set up diagramkit in this repo:
>
> 1. `npm add diagramkit`
> 2. Read `node_modules/diagramkit/REFERENCE.md` (anchor on the LOCAL install).
> 3. `npx diagramkit warmup` (skip if Graphviz-only).
> 4. Add a `render:diagrams` script to `package.json`.
> 5. Create `diagramkit.config.json5` only if the repo needs non-default behavior (`npx diagramkit init --yes`).
> 6. Install diagramkit's agent skills with the standalone `skills` CLI: `npx skills add sujeet-pro/diagramkit`.
> 7. Render all diagrams: `npx diagramkit render .`.

Expected commands:

```bash
npm add diagramkit
npx diagramkit warmup                   # skip if Graphviz-only
npx skills add sujeet-pro/diagramkit    # installs every diagramkit-* agent skill
npm run render:diagrams
```

> [!NOTE]
> `npx diagramkit warmup` is only required for Mermaid, Excalidraw, and Draw.io. Graphviz-only repos can skip it.

> [!IMPORTANT]
> diagramkit does not ship its own "install skills" command. Skill installation is delegated to [`skills`](https://github.com/vercel-labs/skills) (Vercel Labs) so the same skills work across 41+ agents and stay current via `npx skills update sujeet-pro/diagramkit` without bumping the diagramkit npm package.

## Which Agent Doc to Use

diagramkit ships agent-readable files in two locations at the package root:

### Structured agent guidance (`ai-guidelines/`)

Prose guides that change less often:

| File                                 | Purpose                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `ai-guidelines/usage.md`             | Primary agent instructions — setup, prompts, quick reference                   |
| `ai-guidelines/diagram-authoring.md` | Exhaustive diagram authoring guide — all engines, colors, theming, embedding   |

### LLM reference files (package root)

Two plain-text files with tiered detail:

| File            | Best for                 | Includes                                      |
| --------------- | ------------------------ | --------------------------------------------- |
| `llms.txt`      | Day-to-day usage         | CLI patterns, config layering summary         |
| `llms-full.txt` | Deep implementation work | Full CLI + API + types + architecture         |

You can also run:

```bash
diagramkit --agent-help
```

This prints `llms-full.txt` so agents can ingest a single stream.

For repo bootstrap, start with `node_modules/diagramkit/ai-guidelines/usage.md`. It is the best single file for install, config, and package-script guidance.

## Install Project Skills (any agent)

Skills live in this repo's `skills/` folder and are also bundled into the npm package. Install them into your project with the standalone [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add sujeet-pro/diagramkit                              # all skills
npx skills add sujeet-pro/diagramkit -a claude-code -a cursor     # specific agents
npx skills add sujeet-pro/diagramkit -s diagramkit-setup          # specific skills
npx skills update sujeet-pro/diagramkit                           # refresh later
```

Shipped skills:

| Skill                   | Use when                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `diagramkit-setup`      | First-time install + repo bootstrap. **Run first.**                                         |
| `diagramkit-auto`       | Routes a diagram request to the best engine.                                                |
| `diagramkit-mermaid`    | Authors Mermaid + renders to SVG/PNG/JPEG/WebP/AVIF via the local diagramkit CLI.           |
| `diagramkit-excalidraw` | Authors Excalidraw + renders to SVG/PNG/JPEG/WebP/AVIF.                                     |
| `diagramkit-draw-io`    | Authors Draw.io (cloud icons, BPMN, swimlanes) + renders to SVG/PNG/JPEG/WebP/AVIF.         |
| `diagramkit-graphviz`   | Authors Graphviz DOT + renders to SVG/PNG/JPEG/WebP/AVIF.                                   |

> [!NOTE]
> Every `diagramkit-*` skill always prefers the **locally installed** CLI. They read `node_modules/diagramkit/REFERENCE.md` first and run `npx diagramkit ...` (which auto-resolves to `./node_modules/.bin/diagramkit`) so the agent uses the exact CLI/API surface for the version installed in this repo — never a divergent global install.

If `npx skills` is unavailable, copy the folders manually from `node_modules/diagramkit/skills/diagramkit-*/` into the agent skill directory the project uses.

## Agent Prompts

These copy-paste prompts can be given to any AI coding agent. They reference the locally installed package (`node_modules/diagramkit/`) so they always match the version installed in your repo.

### Bootstrap diagramkit + install all skills

> Set up diagramkit in this repo:
>
> 1. `npm add diagramkit`.
> 2. Read `node_modules/diagramkit/REFERENCE.md` (anchor on the LOCAL install; do NOT use a globally installed `diagramkit`).
> 3. `npx diagramkit warmup` (skip if Graphviz-only).
> 4. If non-default behavior is needed: `npx diagramkit init --yes`.
> 5. Add `"render:diagrams": "diagramkit render ."` to `package.json`.
> 6. Install diagramkit's agent skills: `npx skills add sujeet-pro/diagramkit`.
> 7. Render: `npx diagramkit render .`.

### Add diagrams to documentation

> Add visual diagrams to the documentation in this project. If diagramkit is not installed, run `npm add diagramkit`. Then `npx skills add sujeet-pro/diagramkit`. Read `node_modules/diagramkit/REFERENCE.md` first, then `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for engine selection, syntax, color palettes, and embedding patterns. Create source files in `diagrams/` folders next to the markdown they support. Render with `npx diagramkit render .` (uses the local install) and embed using the appropriate pattern for the target surface.

### Generate a diagram + multi-format raster export

> Create a diagram for [TOPIC] using the diagramkit-* skills installed in this repo. Read `node_modules/diagramkit/REFERENCE.md` first so you anchor on the LOCAL install. Use `diagramkit-auto` to pick the engine, then follow the matching engine skill (mermaid / excalidraw / draw-io / graphviz). Save the source under `diagrams/`. Render to multiple formats with the local CLI: `npx diagramkit render diagrams/<file> --format svg,png,webp --scale 2`. Embed with the `<picture>` pattern.

### Refresh the diagramkit agent skills

> Refresh the diagramkit-* skills: `npx skills update sujeet-pro/diagramkit`. Then re-read `.claude/skills/diagramkit-setup/SKILL.md` (or the equivalent under `.cursor/skills/`, `.codex/skills/`, `.agents/skills/`) and confirm the local diagramkit is current with `npx diagramkit --version`.

### Review and update existing diagrams

> Review and update the diagrams in this project. Read `node_modules/diagramkit/REFERENCE.md` and `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for guidelines. Check each diagram against the quality checklist and color palette. Re-render with `npx diagramkit render . --force` after changes (uses the local install). Verify both light and dark variants.

## Recommended Prompt Sequence

1. **Execute:** "Render all diagram files to SVG."
2. **Optimize:** "Now render PNG for docs/email where needed."
3. **Harden:** "Use --dry-run and show what will re-render before changing files."
4. **Automate:** "Add a CI step that runs diagramkit render . and fails on errors."

## Manual Fallback Rules

If your assistant does not support project skills yet, paste the equivalent guidance into the repo's memory or rules files.

### `CLAUDE.md`

~~~markdown
## Diagram Rendering

When changing .mermaid, .mmd, .excalidraw, .drawio, .dot, or .gv files, run:

```bash
npx diagramkit render <file-or-dir>
```

Use defaults unless asked otherwise:
- format: svg
- theme: both
- outputs in .diagramkit/ next to source files
~~~

### `.cursor/rules`

```text
When editing diagram files (.mermaid, .mmd, .excalidraw, .drawio, .dot, .gv), run:
npx diagramkit render <file-or-dir>
Prefer --dry-run before large batch renders.
```

## JSON Output for Automation

Use JSON for scripts/CI:

```bash
npx diagramkit render . --json
npx diagramkit render . --plan --json
npx diagramkit doctor --json
```

`--json` returns a versioned envelope (`schemaVersion: 1`) with nested `result`.
`failedDetails` provides machine-readable diagnostics (`file`, `code`, `message`) for each failed render.
`--plan --json` includes stale reasons before execution.

JSON schema: `diagramkit/schemas/diagramkit-cli-render.v1.json` (exported from the npm package).

Use `--quiet --json` together for clean JSON on stdout (suppresses log noise to stderr).

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Error (render failure, unknown command, etc.) |

## Error Codes

`failedDetails` entries include a `code` field:

| Code | Description |
| --- | --- |
| `UNKNOWN_TYPE` | File extension not recognized |
| `RENDER_FAILED` | Diagram rendering failed (syntax error, etc.) |
| `MISSING_DEPENDENCY` | Required dependency not installed (e.g. sharp for raster) |
| `CONFIG_INVALID` | Invalid configuration value |
| `BROWSER_LAUNCH_FAILED` | Playwright Chromium could not start |
| `BUNDLE_FAILED` | IIFE bundle generation failed |

## Deep Dives

- [Getting Started](../getting-started/README.md)
- [CLI](../cli/README.md)
- [JavaScript API](../js-api/README.md)
- [Configuration](../configuration/README.md)
- [Bundled Assets](../bundled-assets/README.md) — schemas, llms.txt, ai-guidelines, skills the npm package ships
