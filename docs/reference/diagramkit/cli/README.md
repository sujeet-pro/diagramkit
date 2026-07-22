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
| `validate <file-or-dir> [--recursive] [--json] [--scope-dir <name>] [--fail-on <CODE,...>] [--fail-on-severity <warn\|error>]` | Validate generated SVG file(s) for correctness and `<img>`-tag compatibility |
| `skills install [options]` | Install versioned-pointer skill stubs (`.agents/skills` + harness mirrors) |
| `skills` | Show skills subcommand help |
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
> **Project skills are installed by `diagramkit skills install`, not by any other CLI flag.** The previous `diagramkit --install-skill` flag was removed in v0.3. Skills ship inside the npm package at `node_modules/diagramkit/skills/<name>/SKILL.md`. The default install is:
>
> ```bash
> npx diagramkit skills install
> ```
>
> It writes thin pointer SKILL.md files at `.agents/skills/diagramkit-*` (with mirrors under `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.continue/skills/` for detected or `--harness`-selected harnesses) that defer to the bundled originals, idempotently. See [`skills install` Options](#skills-install-options) below. The `diagramkit-setup` skill documents the same pointer format as a prose fallback for non-CLI contexts. The standalone [`skills`](https://github.com/vercel-labs/skills) CLI is supported as an alternative when you specifically want skills that update independently of the installed `diagramkit`:
>
> ```bash
> npx skills add sujeet-pro/diagramkit                              # all skills
> npx skills add sujeet-pro/diagramkit -a claude-code -a cursor     # specific agents
> npx skills add sujeet-pro/diagramkit -s diagramkit-setup          # specific skills
> npx skills update sujeet-pro/diagramkit                           # refresh later
> ```
>
> Running the legacy `diagramkit --install-skill` exits with code 1 and prints a message pointing at `diagramkit skills install` and `npx skills`.

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
| `--scope-dir` | `string` | — | Only render sources under a directory segment named `<name>` (e.g. `diagrams`), skipping diagram sources elsewhere in the tree. Segment match, not substring. Orphan cleanup still runs against the full discovered set. Mirrors `validate --scope-dir`. |
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
| `--json` | `boolean` | `false` | Emit a versioned JSON envelope (`schemaVersion: 1`) |
| `--max-width` | `number` | `~500px column` | `SVG_VIEWBOX_TOO_WIDE` threshold, calibrated for a content column with up to 1.5× downscale |
| `--no-max-width` | `boolean` | `false` | Disable the `SVG_VIEWBOX_TOO_WIDE` check (use for hero banners) |
| `--scope-dir <name>` | `string` | — | Only consider SVGs under a directory segment named `<name>` (e.g. `diagrams`), skipping hand-authored assets elsewhere in the tree. No-op for a single explicitly-named file target. |
| `--fail-on <CODE,...>` | comma-separated `SvgIssueCode` | — | Promote specific issue codes to fatal (nonzero exit when present). Unknown/misspelled codes are dropped with a warning. |
| `--fail-on-severity <warn\|error>` | `string` | — | Fail if any issue at or above this severity exists (`warn` also accepts `warning`) |

`validate` exits with code 1 when any SVG fails validation under the effective policy (any `error`-severity issue always fails; `--fail-on` / `--fail-on-severity` add extra fail conditions and mark the warnings they elevate as "promoted"). Without `--recursive`, only files in the top level of the target directory are inspected. See [JSON Envelope (validate)](#json-envelope--validate-v1) below; `formatValidationResult()` produces the human-readable variant.

### Known Issue Codes

`EMPTY_FILE`, `MISSING_SVG_TAG`, `MISSING_SVG_CLOSE`, `MISSING_WIDTH`, `MISSING_HEIGHT`, `NO_VISUAL_ELEMENTS`, `CONTAINS_SCRIPT`, `CONTAINS_FOREIGN_OBJECT`, `MISSING_XMLNS`, `EXTERNAL_RESOURCE`, `INVALID_VIEWBOX`, `SVG_TOO_LARGE`, `LOW_CONTRAST_TEXT`, `ASPECT_RATIO_EXTREME`, `SVG_VIEWBOX_TOO_WIDE`.

## `skills install` Options

| Flag | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `--dir <path>` | `string` | cwd | Target repo directory |
| `--harness <list>` | comma-separated / repeatable | auto-detect | `claude`, `cursor`, `codex`, `continue`. Auto-detect looks for existing `.claude/`, `.cursor/`, `.codex/`, `.continue/` dirs; `.agents/` is always written |
| `--only <name>...` | comma-separated / repeatable | all shipped skills | Restrict to specific skills; matches with or without the `diagramkit-` prefix |
| `--check` | `boolean` | `false` | Verify only — exit nonzero on any missing/stale/orphaned stub, write nothing |
| `--dry-run` | `boolean` | `false` | Show planned `created`/`updated`/`removed` actions without writing |
| `--json` | `boolean` | `false` | Emit a machine-readable result (`schemaVersion: 1`, `command: "skills-install"`) |

For every skill shipped at `node_modules/diagramkit/skills/<name>/SKILL.md`, writes a canonical pointer at `.agents/skills/<name>/SKILL.md` plus mirrors under each targeted harness. Stubs carry an HTML-comment version marker (`<!-- diagramkit-skill-pointer: pkg=diagramkit version=<v> ... -->`) so re-runs are idempotent and drift is detectable via `--check`. Orphan sweep: a managed stub whose skill no longer ships is reported `orphaned` under `--check` and deleted under plain `install` — scoped to the `diagramkit-*` namespace and only stubs the tool generated (marker present); hand-authored `diagramkit-*` folders and non-namespaced skills (e.g. `prj-*`) are never touched.

## Output Naming

Pattern: `{name}-{theme}.{format}`

| Source | Theme | Format | Output |
|:-------|:------|:-------|:-------|
| `flow.mermaid` | both | svg | `flow-light.svg`, `flow-dark.svg` |
| `system.excalidraw` | light | png | `system-light.png` |
| `arch.drawio` | dark | jpeg | `arch-dark.jpeg` |
| `dependency.dot` | dark | svg | `dependency-dark.svg` |

With `outputPrefix` / `outputSuffix` config:

```text
${outputPrefix}${name}${outputSuffix}-${theme}.${format}
```

## Output Directory

By default, output goes to `.diagramkit/` next to the source:

```text
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

## JSON Envelope — `render` (v1)

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

## JSON Envelope — `validate` (v1)

```json
{
  "schemaVersion": 1,
  "command": "validate",
  "target": { "kind": "directory", "path": "/abs/path" },
  "files": 12,
  "valid": 10,
  "invalid": 2,
  "policy": { "scopeDir": null, "failOnCodes": [], "failOnSeverity": null },
  "promoted": [{ "code": "LOW_CONTRAST_TEXT", "severity": "warning", "count": 1 }],
  "failed": true,
  "results": [{ "file": "/abs/path/x.svg", "valid": false, "issues": [] }]
}
```

`policy` echoes the effective `--scope-dir`/`--fail-on`/`--fail-on-severity` flags for this run. `promoted` lists warning-severity issues elevated to fatal by the policy (errors are never listed — they already fail via the baseline). `failed` is the overall exit disposition. JSON schema: `diagramkit/schemas/diagramkit-cli-validate.v1.json` (exported from the npm package).

### Breaking Change Note

Older CLI versions returned unversioned JSON objects (for example `{ rendered, skipped, failed }` directly at the root).  
Use `schemaVersion: 1` and read data from `result` in this release.
