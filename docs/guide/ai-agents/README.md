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

Ask your coding agent:

> Set up diagramkit in this repo. Install the package, read `node_modules/diagramkit/llms.txt`, add a `render:diagrams` script to `package.json`, create `diagramkit.config.json5` only if the repo needs non-default behavior, run `npx diagramkit --install-skill`, warm up Chromium unless the repo is Graphviz-only, and render all diagrams to SVG.

Expected commands:

```bash
npm add diagramkit
npx diagramkit --install-skill
npx diagramkit warmup
npm run render:diagrams
```

> [!NOTE]
> `npx diagramkit warmup` is only required for Mermaid, Excalidraw, and Draw.io. Graphviz-only repos can skip it.

## Which Agent Doc to Use

diagramkit ships agent-readable files in two locations:

### AI Guidelines (npm package)

The `ai-guidelines/` folder is included in the npm package and provides structured guidance for AI agents:

| File | Purpose |
| --- | --- |
| `ai-guidelines/usage.md` | Primary agent instructions — setup, prompts, quick reference |
| `ai-guidelines/diagram-authoring.md` | Exhaustive diagram authoring guide — all engines, colors, theming, embedding |
| `ai-guidelines/llms.txt` | Compact CLI reference |
| `ai-guidelines/llms-full.txt` | Full CLI + API + types + architecture reference |

### LLM Reference Files (root)

| File | Best for | Includes |
| --- | --- | --- |
| `llms-quick.txt` | Fast autopilot tasks | Minimal commands, defaults, troubleshooting |
| `llms.txt` | Day-to-day usage | CLI patterns, config layering summary |
| `llms-full.txt` | Deep implementation work | Full CLI + API + types + architecture |

You can also run:

```bash
diagramkit --agent-help
```

This prints `llms-full.txt` so agents can ingest a single stream.

For repo bootstrap, start with `node_modules/diagramkit/ai-guidelines/usage.md`. It is the best single file for install, config, and package-script guidance.

## Install Project Skills

Use the CLI to install project-level skills for both Claude and Cursor:

```bash
npx diagramkit --install-skill
```

This creates:

- `.claude/skills/diagramkit/SKILL.md`
- `.cursor/skills/diagramkit/SKILL.md`

The generated skill tells agents to read `node_modules/diagramkit/llms.txt`, suggests `"render:diagrams": "diagramkit render ."` for `package.json`, and skips existing files instead of overwriting them.

## Agent Prompts

These prompts can be given to any AI coding agent. Each references the `ai-guidelines/` files shipped in the npm package.

### Add diagrams to documentation

> Add visual diagrams to the documentation in this project. Install `diagramkit` if not present. Read `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for engine selection, syntax, color palettes, and embedding patterns. Create diagram source files in `diagrams/` folders next to the markdown they support. Render with `npx diagramkit render .` and embed using the appropriate pattern for the target surface.

### Create a diagram skill for this project

> Create a project-level diagram skill based on diagramkit. Read `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for the full reference. Create `.claude/skills/diagrams/SKILL.md` that includes: engine selection guidance, the project's preferred color palette, file layout conventions, embedding patterns, and rendering commands. Keep the skill focused on this project's needs — reference the ai-guidelines files for exhaustive engine details.

### Review and update existing diagrams

> Review and update the diagrams in this project. Read `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for guidelines. Check each diagram against the quality checklist and color palette. Re-render with `npx diagramkit render . --force` after changes. Verify both light and dark variants.

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

- [Getting Started](/guide/getting-started)
- [CLI](/guide/cli)
- [JavaScript API](/guide/js-api)
- [Configuration](/guide/configuration)
