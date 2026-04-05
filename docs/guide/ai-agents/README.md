---
title: AI Agents
description: Agent-first onboarding and automation workflow for diagramkit.
---

# AI Agents

This page is the fastest path for agent-driven setup and usage.

## 60-Second Agent Flow

Ask your coding agent:

> Install diagramkit, warm up Chromium, and render all diagrams in this repo to SVG.

Expected commands:

```bash
npm add diagramkit
npx diagramkit warmup
npx diagramkit render .
```

## Which Agent Doc to Use

diagramkit ships three agent-readable files:

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

## Recommended Prompt Sequence

1. **Execute:** "Render all diagram files to SVG."
2. **Optimize:** "Now render PNG for docs/email where needed."
3. **Harden:** "Use --dry-run and show what will re-render before changing files."
4. **Automate:** "Add a CI step that runs diagramkit render . and fails on errors."

## Agent Rules Snippets

### CLAUDE.md

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

### .cursor/rules

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

JSON schema: `schemas/diagramkit-cli-render.v1.json` (shipped in npm package).

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
