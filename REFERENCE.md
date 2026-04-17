# diagramkit Reference

Entry point for consumers and AI agents after `npm add diagramkit`. Read this first, then follow the links to the detail you need.

## What is diagramkit

A standalone CLI and library that renders `.mermaid`, `.excalidraw`, `.drawio`, and Graphviz `.dot`/`.gv` files to SVG, PNG, JPEG, WebP, or AVIF — with automatic light/dark theme support and incremental rebuilds via SHA-256 content hashing.

## 60-second quickstart

```bash
npm add diagramkit
npx diagramkit warmup         # installs Playwright Chromium (skip if Graphviz-only)
npx diagramkit render .       # renders every diagram under the current directory
```

Outputs land in `.diagramkit/` folders next to each source file. Filenames include `-light` / `-dark` suffixes.

Optional raster output:

```bash
npm add sharp
npx diagramkit render . --format svg,png --theme both
```

## For AI agents

Paste this prompt into your AI coding agent (Claude Code, Cursor, Codex, Continue, OpenCode, Windsurf, GitHub Copilot, ...). It installs the latest diagramkit, reads this reference at the exact installed version, and configures agent skills as thin pointers that defer to the skills bundled inside the installed package:

```text
Install the latest diagramkit in this repo and configure its agent skills:

1. npm add diagramkit@latest
   Confirm with: npx diagramkit --version

2. Read node_modules/diagramkit/REFERENCE.md end to end. It is the
   version-pinned CLI/API contract for the release you just installed.
   Do NOT rely on a globally installed diagramkit or on training data.

3. Follow node_modules/diagramkit/skills/diagramkit-setup/SKILL.md end to
   end. It will run `npx diagramkit warmup` (skip if Graphviz-only), wire
   a `render:diagrams` script into package.json, optionally create
   diagramkit.config.json5 (`npx diagramkit init --yes`), render any
   existing diagrams, and write thin pointer SKILL.md files at:
     .agents/skills/diagramkit-<name>/SKILL.md    (always)
     .claude/skills/diagramkit-<name>/SKILL.md    (if .claude/ exists)
     .cursor/skills/diagramkit-<name>/SKILL.md    (if .cursor/ exists)
     .codex/skills/diagramkit-<name>/SKILL.md     (if .codex/ exists)
     .continue/skills/diagramkit-<name>/SKILL.md  (if .continue/ exists)
   Each pointer defers to
   node_modules/diagramkit/skills/diagramkit-<name>/SKILL.md — so every
   `npm install diagramkit` upgrade automatically refreshes every skill.
   Skills installed: setup, auto, mermaid, excalidraw, draw-io, graphviz,
   review (validation + WCAG 2.2 AA contrast).

4. Commit the pointer SKILL.md files with any package.json / config
   changes. Summarize what was created or skipped.
```

More prompt variants (generate a diagram, run a WCAG 2.2 AA audit, refresh after an upgrade) are in [Sample agent prompts](#sample-agent-prompts).

Agent-facing files shipped in this package:

| File                                                         | Use when                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `node_modules/diagramkit/ai-guidelines/usage.md`             | Primary agent setup guide — install, warmup, config, scripts.           |
| `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` | Exhaustive per-engine authoring reference (colors, theming, embedding). |
| `node_modules/diagramkit/llms.txt`                           | Compact CLI reference.                                                  |
| `node_modules/diagramkit/llms-full.txt`                      | Full CLI + API reference (matches `diagramkit --agent-help`).           |

## Packed agent skills

Every skill listed below is **shipped inside the npm package** at `node_modules/diagramkit/skills/<name>/SKILL.md`. They cover the full diagramkit lifecycle:

| Capability                                         | Skill                   | Owns                                                                                                                                                                                                                                       |
| -------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bootstrap**                                      | `diagramkit-setup`      | First-time install & config in a repo, package scripts, warmup, and writing the local skill pointers below. **Start here.**                                                                                                                |
| **Engine routing**                                 | `diagramkit-auto`       | Picks the best engine for a new diagram request, then delegates to the engine skill.                                                                                                                                                       |
| **Authoring + image generation (vector + raster)** | `diagramkit-mermaid`    | Author Mermaid diagrams (flowchart, sequence, class, state, ER, gantt, …) and render to SVG / PNG / JPEG / WebP / AVIF.                                                                                                                    |
| **Authoring + image generation (vector + raster)** | `diagramkit-excalidraw` | Author freeform hand-drawn Excalidraw diagrams and render to SVG / PNG / JPEG / WebP / AVIF.                                                                                                                                               |
| **Authoring + image generation (vector + raster)** | `diagramkit-draw-io`    | Author Draw.io diagrams (cloud vendor icons, BPMN, swimlanes, multi-page) and render to SVG / PNG / JPEG / WebP / AVIF.                                                                                                                    |
| **Authoring + image generation (vector + raster)** | `diagramkit-graphviz`   | Author Graphviz DOT algorithmic-layout diagrams and render to SVG / PNG / JPEG / WebP / AVIF (no browser; WASM).                                                                                                                           |
| **Validation + accessibility (WCAG 2.2 AA)**       | `diagramkit-review`     | Audit + repair every diagram: lint sources per engine rules, force re-render, validate SVG structure / `<img>`-embed safety, and **fix WCAG 2.2 AA contrast** (text & background). Use for pre-merge or pre-release diagram health checks. |

> [!NOTE]
> The skills always prefer the locally installed CLI. They run `npx diagramkit ...` (auto-resolves to `node_modules/.bin/diagramkit`) and read `node_modules/diagramkit/REFERENCE.md` first, so the agent uses the exact CLI/API surface for the version installed in this repo — not whatever happens to be on the global PATH.

### Install the skills into your repo

The skills ship with the package, so the simplest install is to write **thin local pointers** that defer to `node_modules/diagramkit/skills/<name>/SKILL.md`. This keeps every skill version-pinned to the installed `diagramkit` and works for any agent (Claude Code, Cursor, Codex, Continue, OpenCode, …) without an extra dependency.

The `diagramkit-setup` skill writes these pointers automatically. The canonical layout it produces:

```text
.agents/skills/diagramkit-<name>/SKILL.md   # source of truth pointer (always created)
.claude/skills/diagramkit-<name>/SKILL.md   # harness pointer → .agents/skills/...
.cursor/skills/diagramkit-<name>/SKILL.md   # harness pointer → .agents/skills/...
.codex/skills/diagramkit-<name>/SKILL.md    # harness pointer → .agents/skills/...
```

Each pointer is a tiny markdown file with frontmatter and a one-line "follow `node_modules/diagramkit/skills/diagramkit-<name>/SKILL.md`" instruction. They are safe to commit — they regenerate when you upgrade `diagramkit` (the pointer text is stable; the linked content tracks the package version).

If you'd rather pull skills from GitHub (e.g. so they advance independently of the installed `diagramkit`), the standalone [`skills`](https://github.com/vercel-labs/skills) CLI also works:

```bash
npx skills add sujeet-pro/diagramkit                       # all diagramkit-* skills, all detected agents
npx skills add sujeet-pro/diagramkit -a claude-code -a cursor
npx skills add sujeet-pro/diagramkit -s diagramkit-setup -s diagramkit-review
```

Pick **one** mechanism per repo (local pointers OR `npx skills`) so skills don't drift against each other.

## Sample agent prompts

Copy any of these into your AI agent. They are written so agents (Claude Code, Cursor, Codex, etc.) can act without further clarification.

### 1. Bootstrap diagramkit + install all skills (local pointers)

```text
Set up diagramkit in this repository:

1. Install the latest diagramkit: `npm add diagramkit`.
2. Read `node_modules/diagramkit/REFERENCE.md` for the canonical CLI + API
   surface for the installed version.
3. Follow `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md` end to
   end. It will:
     - run `npx diagramkit warmup` unless the repo is Graphviz-only,
     - wire a `render:diagrams` script in package.json,
     - optionally create `diagramkit.config.json5` (`npx diagramkit init --yes`),
     - render any existing diagrams,
     - and write thin pointer skills (one SKILL.md per skill, with frontmatter
       and a one-line "follow node_modules/diagramkit/skills/<name>/SKILL.md"
       instruction) under:
         .agents/skills/diagramkit-<name>/SKILL.md   (always)
         .claude/skills/diagramkit-<name>/SKILL.md   (if .claude/ exists or Claude Code is in use)
         .cursor/skills/diagramkit-<name>/SKILL.md   (if .cursor/ exists or Cursor is in use)
         .codex/skills/diagramkit-<name>/SKILL.md    (if .codex/ exists or Codex is in use)
       The set of <name>s is: setup, auto, mermaid, excalidraw, draw-io,
       graphviz, review.
```

### 2. Generate a diagram + export to multiple image formats

```text
I need a [TOPIC] diagram. Use the diagramkit skills installed in this repo:

1. Read `node_modules/diagramkit/REFERENCE.md` so you use the locally installed
   diagramkit CLI/API (not a globally installed one).
2. Follow `.agents/skills/diagramkit-auto/SKILL.md` (or your harness's pointer
   under `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`) to pick the
   best engine, then follow the matching engine skill (`diagramkit-mermaid`,
   `diagramkit-excalidraw`, `diagramkit-draw-io`, or `diagramkit-graphviz`).
3. Place the source file under `diagrams/` and render with the locally
   installed CLI: `npx diagramkit render diagrams/<file>`.
4. Also export rasters for the docs site:
     `npx diagramkit render diagrams/<file> --format svg,png,webp --scale 2`
5. Embed into the markdown using the `<picture>` pattern from the skill.
```

### 3. Validate every diagram (structure, embed-safety, WCAG 2.2 AA contrast)

```text
Audit every diagram in this repo for structural validity, `<img>`-embed
safety, and WCAG 2.2 AA text/background contrast:

1. Read `node_modules/diagramkit/REFERENCE.md` and confirm `npx diagramkit
   --version` resolves to the local install.
2. Follow `.agents/skills/diagramkit-review/SKILL.md` end to end. It will
   force-render every diagram, run `diagramkit validate . --recursive --json`,
   classify issues (errors vs warnings), and delegate per-engine fixes back to
   the matching engine skill's "Review Mode" (palette swaps for low-contrast
   text, `htmlLabels: false` for foreignObject, etc.).
3. Cap fix loops at 8 iterations per source; log residuals into the summary
   under `.temp/diagram-review/<timestamp>/report.md`.
```

### 4. Refresh skills after upgrading diagramkit

```text
After `npm update diagramkit`:

1. Re-read `node_modules/diagramkit/REFERENCE.md` to pick up any CLI/API
   changes in the new version.
2. The `.agents/skills/diagramkit-*` thin pointers don't need rewriting —
   they always defer to `node_modules/diagramkit/skills/<name>/SKILL.md`,
   which is updated by the npm install. If new skills were added in this
   release, re-run `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md`
   to write the missing pointers.
3. If the repo uses `npx skills` instead of local pointers, run
   `npx skills update sujeet-pro/diagramkit`.
```

## Quick CLI reference

```bash
diagramkit render <file-or-dir>          # Render diagrams
diagramkit render . --watch              # Watch mode
diagramkit render . --format svg,png     # Multi-format output
diagramkit render . --theme dark         # Dark only
diagramkit render . --scale 3            # High-res raster
diagramkit render . --quality 85         # JPEG/WebP/AVIF quality
diagramkit render . --force              # Ignore manifest cache
diagramkit render . --type mermaid       # Filter by diagram type
diagramkit render . --output ./build     # Single output folder
diagramkit render . --same-folder        # Write next to source
diagramkit render . --no-contrast        # Skip dark SVG contrast fix
diagramkit render . --dry-run            # Preview without rendering
diagramkit render . --strict             # Fail loudly on any single render failure
diagramkit render . --json               # Machine-readable output (CI/agents)
diagramkit validate .diagramkit/         # Validate top-level SVGs in a folder
diagramkit validate .diagramkit/ -r      # (or --recursive) recurse into subfolders
diagramkit validate output.svg           # Single file
diagramkit validate . --recursive --json # JSON report for CI
diagramkit warmup                        # Install Playwright Chromium
diagramkit doctor                        # Check environment and config
diagramkit doctor --json                 # JSON diagnostics
diagramkit init                          # Create config file (interactive)
diagramkit init --yes --ts               # Non-interactive TypeScript config
diagramkit --interactive / -i            # Force the interactive wizard (TTY)
diagramkit --no-interactive              # Disable wizard (CI / agents)
diagramkit --agent-help                  # Full reference (same as llms-full.txt)
```

> Skill installation is handled by `diagramkit-setup` (writes local pointers into `.agents/skills/diagramkit-*` and the matching harness folders). See [Packed agent skills](#packed-agent-skills).

## Quick API reference

```ts
import {
  render,
  renderFile,
  renderAll,
  watchDiagrams,
  createRendererRuntime,
  warmup,
  dispose,
  defineConfig,
} from 'diagramkit'

// From a string
const result = await render('flowchart LR; A-->B', 'mermaid', { theme: 'both' })

// From a file
const fileResult = await renderFile('docs/arch.mermaid')

// Batch render a directory
const batch = await renderAll({ dir: '.', formats: ['svg'], theme: 'both' })

// Watch mode
const stop = watchDiagrams({ dir: '.' })

// Isolated runtime (for workers / long-running services)
const runtime = createRendererRuntime()

await dispose()
```

Subpath exports:

- `diagramkit` — core rendering APIs.
- `diagramkit/utils` — discovery / manifest / output / validation helpers.
- `diagramkit/color` — dark SVG contrast utilities.
- `diagramkit/convert` — SVG-to-raster conversion.
- `diagramkit/validate` — SVG structural + img-tag-compatibility checks.

## Configuration

diagramkit is zero-config by default. If you need custom behavior, create `diagramkit.config.json5` at the repo root (or `diagramkit.config.ts` for programmatic config):

```json5
{
  // Editor autocomplete + validation; ignored at runtime.
  $schema: './node_modules/diagramkit/schemas/diagramkit-config.v1.json',
  outputDir: '.diagramkit',
  defaultFormats: ['svg'],
  defaultTheme: 'both',
  sameFolder: false,
  outputPrefix: '',
  outputSuffix: '',
}
```

Config layers (low → high precedence): defaults → `~/.config/diagramkit/config.json5` → `DIAGRAMKIT_*` env vars → local `diagramkit.config.{json5,ts}` (walks up) → per-call overrides.

JSON schemas exported from the npm package:

- `diagramkit/schemas/diagramkit-config.v1.json` — `diagramkit.config.{json5,json}` config file
- `diagramkit/schemas/diagramkit-cli-render.v1.json` — `diagramkit render --json` output envelope

`npx diagramkit init` writes a config file with the `$schema` reference already wired up so editors offer autocomplete out of the box.

## Supported extensions

| Extension     | Diagram type |
| ------------- | ------------ |
| `.mermaid`    | Mermaid      |
| `.mmd`        | Mermaid      |
| `.mmdc`       | Mermaid      |
| `.excalidraw` | Excalidraw   |
| `.drawio`     | Draw.io      |
| `.drawio.xml` | Draw.io      |
| `.dio`        | Draw.io      |
| `.dot`        | Graphviz     |
| `.gv`         | Graphviz     |
| `.graphviz`   | Graphviz     |

## Requirements

- Node.js >= 24
- Playwright Chromium (install with `npx diagramkit warmup`; not needed for Graphviz-only workflows)
- `sharp` (optional peer, required only for PNG/JPEG/WebP/AVIF output)

## Online documentation

Full docs: [projects.sujeet.pro/diagramkit](https://projects.sujeet.pro/diagramkit/)

- [Getting started](https://projects.sujeet.pro/diagramkit/guide/getting-started/)
- [AI agent workflows](https://projects.sujeet.pro/diagramkit/guide/ai-agents/)
- [CLI reference](https://projects.sujeet.pro/diagramkit/reference/diagramkit/cli/)
- [API reference](https://projects.sujeet.pro/diagramkit/reference/diagramkit/api/)
- [Config reference](https://projects.sujeet.pro/diagramkit/reference/diagramkit/config/)
- [Architecture](https://projects.sujeet.pro/diagramkit/reference/how-it-works/)

## License

[MIT](https://github.com/sujeet-pro/diagramkit/blob/main/LICENSE)
