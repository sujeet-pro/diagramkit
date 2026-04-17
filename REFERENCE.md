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

Give your coding agent this prompt to set diagramkit up for a repo (see [Sample agent prompts](#sample-agent-prompts) for more variants):

```text
Install diagramkit in this repo. Read node_modules/diagramkit/REFERENCE.md first,
then node_modules/diagramkit/ai-guidelines/usage.md. Add a `render:diagrams`
script to package.json, warm up Chromium unless the repo is Graphviz-only, and
render all diagrams. Install diagramkit's project skills with the standalone
"skills" CLI: `npx skills add sujeet-pro/diagramkit`.
```

Agent-facing files shipped in this package:

| File                                                         | Use when                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `node_modules/diagramkit/ai-guidelines/usage.md`             | Primary agent setup guide — install, warmup, config, scripts.           |
| `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` | Exhaustive per-engine authoring reference (colors, theming, embedding). |
| `node_modules/diagramkit/llms.txt`                           | Compact CLI reference.                                                  |
| `node_modules/diagramkit/llms-full.txt`                      | Full CLI + API reference (matches `diagramkit --agent-help`).           |

## Consumer skills

diagramkit ships task-specific skills your agent can load on demand. They live in `node_modules/diagramkit/skills/` and they are also published in the GitHub repo so the [`skills`](https://github.com/vercel-labs/skills) CLI can install them into any repo regardless of which agent the user runs (Claude Code, Cursor, Codex, Continue, OpenCode, ...):

| Skill                   | When to load                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `diagramkit-setup`      | First-time install and configuration in a repo (also installs the per-engine skills below). **Start here.**        |
| `diagramkit-auto`       | Pick the best engine for a diagram request, then delegate.                                                         |
| `diagramkit-mermaid`    | Author Mermaid diagrams (flowchart, sequence, class, state, ER, gantt, etc.) and render to SVG/PNG/JPEG/WebP/AVIF. |
| `diagramkit-excalidraw` | Author freeform hand-drawn Excalidraw diagrams and render to SVG/PNG/JPEG/WebP/AVIF.                               |
| `diagramkit-draw-io`    | Author Draw.io diagrams with cloud vendor icons, BPMN, swimlanes; render to SVG/PNG/JPEG/WebP/AVIF.                |
| `diagramkit-graphviz`   | Author Graphviz DOT algorithmic-layout diagrams and render to SVG/PNG/JPEG/WebP/AVIF.                              |

### Install all diagramkit skills into your repo

Use the standalone `skills` CLI (one-line, agent-agnostic):

```bash
# Install every diagramkit-* skill (engine + setup + auto)
npx skills add sujeet-pro/diagramkit

# Or target one or more specific agents
npx skills add sujeet-pro/diagramkit -a claude-code -a cursor -a codex

# Or install only specific skills
npx skills add sujeet-pro/diagramkit -s diagramkit-setup -s diagramkit-mermaid
```

Why use the `skills` CLI instead of an internal flag:

- diagramkit stays focused on rendering — it does not ship CLI plumbing for installing skills, since [`skills`](https://github.com/vercel-labs/skills) already does that for 41+ agents.
- Skills are kept in the diagramkit GitHub repo (`skills/diagramkit-*`), so `npx skills update` keeps them current without bumping the diagramkit npm package.
- You can manually copy `node_modules/diagramkit/skills/diagramkit-*/` into `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, or `.continue/skills/` if you cannot use `npx skills`.

> [!NOTE]
> The diagramkit-\* skills always prefer the locally installed CLI. They run `npx diagramkit ...` (which auto-resolves to `node_modules/.bin/diagramkit`) and read `node_modules/diagramkit/REFERENCE.md` first so the agent uses the exact CLI/API surface for the version installed in this repo, not whatever happens to be on the global PATH.

## Sample agent prompts

Copy any of these into your AI agent. They are written so agents (Claude Code, Cursor, Codex, etc.) can act without further clarification.

### 1. Bootstrap diagramkit + install all skills

```text
Set up diagramkit in this repository:

1. Install the latest diagramkit: `npm add diagramkit`.
2. Read `node_modules/diagramkit/REFERENCE.md` for the canonical CLI + API surface
   for the installed version, then `node_modules/diagramkit/ai-guidelines/usage.md`.
3. Run `npx diagramkit warmup` unless the repo is Graphviz-only.
4. Create `diagramkit.config.json5` only if non-default behavior is needed.
   Use `npx diagramkit init --yes` so the file is wired to the JSON Schema.
5. Add a `package.json` script: `"render:diagrams": "diagramkit render ."`.
6. Install diagramkit's agent skills with the standalone `skills` CLI so any
   agent (Claude/Cursor/Codex/Continue/...) can use them:
     `npx skills add sujeet-pro/diagramkit`
7. Render all diagrams once: `npx diagramkit render .`.
```

### 2. Generate a diagram + export to multiple image formats

```text
I need a [TOPIC] diagram. Use the diagramkit skills installed in this repo:

1. Read `node_modules/diagramkit/REFERENCE.md` so you use the locally installed
   diagramkit CLI/API (not a globally installed one).
2. Use the `diagramkit-auto` skill to pick the best engine, then follow the
   matching engine skill (`diagramkit-mermaid`, `diagramkit-excalidraw`,
   `diagramkit-draw-io`, or `diagramkit-graphviz`).
3. Place the source file under `diagrams/` and render with the locally
   installed CLI: `npx diagramkit render diagrams/<file>`.
4. Also export rasters for the docs site:
     `npx diagramkit render diagrams/<file> --format svg,png,webp --scale 2`
5. Embed into the markdown using the `<picture>` pattern from the skill.
```

### 3. Re-install / refresh diagramkit skills (no diagramkit upgrade needed)

```text
Refresh the diagramkit agent skills in this repo so they match the latest
upstream versions:
  npx skills update sujeet-pro/diagramkit
Then re-read `.claude/skills/diagramkit-setup/SKILL.md` (or the equivalent
under `.cursor/skills/`, `.codex/skills/`, `.agents/skills/`) and confirm the
local diagramkit install is still the right version with `npx diagramkit --version`.
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

> Project skills live outside the diagramkit CLI. Use `npx skills add sujeet-pro/diagramkit` (see above).

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
