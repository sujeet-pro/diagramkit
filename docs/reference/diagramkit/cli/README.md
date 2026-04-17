---
title: CLI Reference
description: Complete command and option reference for the diagramkit CLI.
---

# CLI Reference

## Invocation Paths

These startup forms are equivalent after installation:

```bash
npx diagramkit --version
./node_modules/.bin/diagramkit --version
node ./node_modules/diagramkit/dist/cli/bin.mjs --version
```

## Commands

| Command | Description |
|:--------|:------------|
| `render <file-or-dir>` | Render diagram file(s) to images |
| `<file-or-dir>` | Alias for `render <file-or-dir>` |
| `validate <file-or-dir> [--recursive] [--json]` | Validate generated SVG file(s) for correctness and `<img>`-tag compatibility |
| `warmup` | Pre-install Playwright Chromium browser |
| `doctor [--json]` | Validate runtime dependencies and environment |
| `init [--ts] [--yes]` | Create config file (`--yes` accepts defaults; `--ts` writes a TypeScript config with `defineConfig()`) |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |
| `--agent-help` | Output full reference for LLM agents |
| `--interactive`, `-i` | Force the interactive wizard (TTY required; warns and falls back on non-TTY) |
| `--no-interactive` | Disable the interactive wizard (good for CI / agents) |
| `--yes`, `-y` | Alias for `--no-interactive` (accept defaults) |

Bare `diagramkit` on a TTY launches the top-level interactive picker; on non-TTY (CI, scripts) it prints help. Bare `diagramkit render` on a TTY launches the render wizard.

> [!IMPORTANT]
> **Project skills are installed by `npx skills`, not by the diagramkit CLI.** The previous `diagramkit --install-skill` flag was removed in v0.3. Use the standalone [`skills`](https://github.com/vercel-labs/skills) CLI from Vercel Labs — it works with Claude Code, Cursor, Codex, Continue, OpenCode, and 41+ other agents:
>
> ```bash
> npx skills add sujeet-pro/diagramkit                              # all skills
> npx skills add sujeet-pro/diagramkit -a claude-code -a cursor     # specific agents
> npx skills add sujeet-pro/diagramkit -s diagramkit-setup          # specific skills
> npx skills update sujeet-pro/diagramkit                           # refresh later
> ```
>
> Running the legacy `diagramkit --install-skill` exits with code 1 and prints a message pointing at `npx skills`.

## `render` Options

| Flag | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `--format` | `svg`, `png`, `jpeg` (`jpg` alias), `webp`, `avif` | `svg` | Output format (comma-separated for multiple) |
| `--theme` | `light`, `dark`, `both` | `both` | Theme variant(s) |
| `--scale` | `number` | `2` | Raster scale factor |
| `--quality` | `number` | `90` | JPEG/WebP/AVIF quality (1--100) |
| `--force`, `-f` | `boolean` | `false` | Re-render all, ignore cache |
| `--watch`, `-w` | `boolean` | `false` | Watch for changes |
| `--no-contrast` | `boolean` | `false` | Disable dark SVG contrast optimization |
| `--type` | `mermaid`, `excalidraw`, `drawio`, `graphviz` | all | Filter by type |
| `--output` | `string` | `.diagramkit/` sibling | Custom output dir (works for single files and directories; in directory mode, all outputs go to this folder and manifest tracking is disabled) |
| `--output-dir` | `string` | `.diagramkit` | Output folder name |
| `--manifest-file` | `string` | `manifest.json` | Manifest filename |
| `--no-manifest` | `boolean` | `false` | Disable manifest tracking |
| `--same-folder` | `boolean` | `false` | Output next to source files |
| `--output-prefix` | `string` | `''` | Prefix for output filenames |
| `--output-suffix` | `string` | `''` | Suffix for output filenames |
| `--dry-run` | `boolean` | `false` | Preview without rendering |
| `--plan` | `boolean` | `false` | Preview stale files with machine-readable reasons |
| `--quiet` | `boolean` | `false` | Errors only |
| `--log-level` | `silent`, `error`, `warn`, `info`, `verbose` (+ aliases: `errors`, `warning`, `warnings`, `log`) | `info` | Logging verbosity |
| `--config` | `string` | — | Path to config file (skip auto-discovery) |
| `--strict-config` | `boolean` | `false` | Fail instead of warning on invalid config |
| `--strict` | `boolean` | `false` | Exit non-zero if any single render fails (independent of `--strict-config`) |
| `--max-type-lanes` | `1-4` | `4` | Max concurrent engine lanes during batch render |
| `--json` | `boolean` | `false` | JSON output for CI |
| `--interactive`, `-i` | `boolean` | `false` | Force the interactive render wizard (even with positional args). Falls back with a warning on non-TTY. |
| `--no-interactive` | `boolean` | `false` | Disable the interactive wizard (CI / agents) |
| `--yes`, `-y` | `boolean` | `false` | Alias for `--no-interactive` |

> Render-time validation: every `diagramkit render` run also pipes generated SVGs through the same checks as `diagramkit validate`. Failures cause a non-zero exit (`process.exitCode = 1`) unless you opt out with `--no-manifest` and a custom `--output` directory.

## `validate` Options

| Flag | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `--recursive` | `boolean` | `false` | Recurse into subdirectories when target is a directory |
| `--json` | `boolean` | `false` | Emit JSON `{ files, valid, invalid, results: [...] }` (no envelope) |

`validate` exits with code 1 when any SVG fails validation. Without `--recursive`, only files in the top level of the target directory are inspected. JSON output is intentionally non-versioned (the schema is small and stable) — see `formatValidationResult()` for the human-readable variant.

## Output Naming

Pattern: `{name}-{theme}.{format}`

| Source | Theme | Format | Output |
|:-------|:------|:-------|:-------|
| `flow.mermaid` | both | svg | `flow-light.svg`, `flow-dark.svg` |
| `system.excalidraw` | light | png | `system-light.png` |
| `arch.drawio` | dark | jpeg | `arch-dark.jpeg` |
| `dependency.dot` | dark | svg | `dependency-dark.svg` |

With `outputPrefix` / `outputSuffix` config:

```
${outputPrefix}${name}${outputSuffix}-${theme}.${format}
```

## Output Directory

By default, output goes to `.diagramkit/` next to the source:

```
project/
  docs/
    flow.mermaid
    .diagramkit/
      flow-light.svg
      flow-dark.svg
      manifest.json
```

Configurable via [`diagramkit.config.json5`](../../../guide/configuration/README.md).

## Supported File Types

| Extension | Type |
|:----------|:-----|
| `.mermaid`, `.mmd`, `.mmdc` | Mermaid |
| `.excalidraw` | Excalidraw |
| `.drawio`, `.drawio.xml`, `.dio` | Draw.io |
| `.dot`, `.gv`, `.graphviz` | Graphviz |

## Discovery Rules

When given a directory, `diagramkit render` recursively scans for supported extensions, skipping:

- Hidden directories (`.` prefix)
- `node_modules/`
- Symlinks
- Configured output directory

## Exit Codes

| Code | Meaning |
|:-----|:--------|
| `0` | Success |
| `1` | Error |

Watch mode stays running until `Ctrl+C`.

## JSON Envelope (v1)

`--json` outputs a versioned envelope:

```json
{
  "schemaVersion": 1,
  "command": "render",
  "target": { "kind": "directory", "path": "/abs/path" },
  "phase": "execute",
  "options": {},
  "result": {}
}
```

JSON schema: `diagramkit/schemas/diagramkit-cli-render.v1.json` (exported from the npm package).

### Breaking Change Note

Older CLI versions returned unversioned JSON objects (for example `{ rendered, skipped, failed }` directly at the root).  
Use `schemaVersion: 1` and read data from `result` in this release.
