# diagramkit Usage For AI Agents

Primary consumer-facing agent instructions. Read this after `REFERENCE.md`.

## Getting started

1. Install (always prefer the local install): `npm add diagramkit`
2. Warmup: `npx diagramkit warmup` (installs Playwright Chromium — skip if Graphviz-only)
3. Render: `npx diagramkit render .` (auto-resolves `./node_modules/.bin/diagramkit` so the CLI version matches the installed package)
4. For diagram authoring guidance: `node_modules/diagramkit/ai-guidelines/diagram-authoring.md`
5. For full CLI + API reference: `node_modules/diagramkit/llms-full.txt`

> Always anchor on the locally installed CLI/API. If `node_modules/diagramkit/REFERENCE.md` does not exist, run `npm add diagramkit` first instead of falling back to a globally installed `diagramkit`.

## When to use diagramkit

- Convert `.mermaid`, `.excalidraw`, `.drawio`, and `.dot`/`.gv` files to SVG/PNG/JPEG/WebP/AVIF.
- Automatic light/dark rendering with WCAG contrast optimization for dark SVGs.
- Incremental builds via SHA-256 manifest.
- Watch mode for live re-rendering.
- Batch rendering for CI/CD pipelines.

## Repo bootstrap

Recommended setup when adding diagramkit to a repository:

1. `npm add diagramkit` (use the local install; never rely on a global `diagramkit`).
2. Add a render script to `package.json` (e.g. `"render:diagrams": "diagramkit render ."`).
3. `npx diagramkit warmup` (skip if Graphviz-only).
4. `npx diagramkit init` to create `diagramkit.config.json5` (only if non-default behavior is needed).
5. Install diagramkit project skills with the standalone [`skills`](https://github.com/vercel-labs/skills) CLI (it works with Claude Code, Cursor, Codex, Continue, OpenCode, etc.):
   `npx skills add sujeet-pro/diagramkit`

For a fully agent-driven bootstrap, trigger the `diagramkit-setup` skill (see below).

## Shipped skills

Consumer skills are bundled into the npm package under `node_modules/diagramkit/skills/` and are also published in the diagramkit GitHub repo so the [`skills`](https://github.com/vercel-labs/skills) CLI can install them into any agent. Pick one of:

```bash
# All diagramkit-* skills
npx skills add sujeet-pro/diagramkit

# Specific agents only (any combination)
npx skills add sujeet-pro/diagramkit -a claude-code -a cursor -a codex

# Specific skills only
npx skills add sujeet-pro/diagramkit -s diagramkit-setup -s diagramkit-mermaid

# Refresh later (no diagramkit npm release required)
npx skills update sujeet-pro/diagramkit
```

If `npx skills` is unavailable, copy the folders manually from `node_modules/diagramkit/skills/diagramkit-*/` into `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.continue/skills/`, or `.agents/skills/`.

| Skill                   | SKILL.md path                                                   | Use when                                                                                   |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `diagramkit-setup`      | `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md`      | First-time install and configuration in a repo. **Run first.**                             |
| `diagramkit-auto`       | `node_modules/diagramkit/skills/diagramkit-auto/SKILL.md`       | Pick the best engine for a diagram request, then delegate.                                 |
| `diagramkit-mermaid`    | `node_modules/diagramkit/skills/diagramkit-mermaid/SKILL.md`    | Author Mermaid diagrams + render to SVG/PNG/JPEG/WebP/AVIF via the local diagramkit CLI.   |
| `diagramkit-excalidraw` | `node_modules/diagramkit/skills/diagramkit-excalidraw/SKILL.md` | Author Excalidraw diagrams + render to SVG/PNG/JPEG/WebP/AVIF.                             |
| `diagramkit-draw-io`    | `node_modules/diagramkit/skills/diagramkit-draw-io/SKILL.md`    | Author Draw.io diagrams (cloud icons, BPMN, swimlanes) + render to SVG/PNG/JPEG/WebP/AVIF. |
| `diagramkit-graphviz`   | `node_modules/diagramkit/skills/diagramkit-graphviz/SKILL.md`   | Author Graphviz DOT diagrams + render to SVG/PNG/JPEG/WebP/AVIF.                           |
| `diagramkit-review`     | `node_modules/diagramkit/skills/diagramkit-review/SKILL.md`     | Audit and repair existing diagrams (lint sources, force re-render, validate, fix loop).    |

> The diagramkit-\* skills always prefer the locally installed CLI: they read `node_modules/diagramkit/REFERENCE.md` first and call `npx diagramkit ...` (which auto-resolves to `./node_modules/.bin/diagramkit`). They never assume a globally installed `diagramkit`.

## Agent prompts

### Prompt: set up diagramkit in a new repo (full bootstrap)

> Add `diagramkit` to this repository:
>
> 1. `npm add diagramkit`.
> 2. Read `node_modules/diagramkit/REFERENCE.md` so you anchor on the locally installed version (do NOT use a globally installed `diagramkit`).
> 3. Run `npx diagramkit warmup` unless this repo is Graphviz-only.
> 4. Create `diagramkit.config.json5` with `npx diagramkit init --yes` only if non-default behavior is needed.
> 5. Add a `render:diagrams` script to `package.json` matching the repo's naming convention.
> 6. Install diagramkit's agent skills with the standalone `skills` CLI (works for any agent): `npx skills add sujeet-pro/diagramkit`.
> 7. Read `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md` and follow any remaining steps.
> 8. Run `npx diagramkit render .`.

### Prompt: add diagrams to documentation

> Add visual diagrams to the documentation in this project. If `diagramkit` is not installed, run `npm add diagramkit`. Then install the engine skills with `npx skills add sujeet-pro/diagramkit`. Read `node_modules/diagramkit/REFERENCE.md` first, then `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for engine selection, syntax, color palettes, and embedding patterns. Create diagram source files in `diagrams/` folders next to the markdown they support. Render with `npx diagramkit render .` (uses the local install) and embed using the `<picture>` pattern.

### Prompt: create a specific diagram with multi-format export

> Create a diagram for [TOPIC] using the diagramkit-\* skills installed in this repo. Read `node_modules/diagramkit/REFERENCE.md` first so you use the locally installed diagramkit version. Use `diagramkit-auto` to pick the engine, then follow the chosen engine's skill (mermaid / excalidraw / draw-io / graphviz). Use the mid-tone color palette for theme-safe rendering. Place the source in the `diagrams/` folder next to the relevant markdown. Render to multiple formats with the local CLI:
> `npx diagramkit render <file> --format svg,png,webp --scale 2`
> Embed using the `<picture>` pattern.

### Prompt: update existing diagrams

> Review and update the diagrams in this project. Read `node_modules/diagramkit/REFERENCE.md` and `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for the current guidelines. Check each diagram source file against the quality checklist and color palette. Re-render with `npx diagramkit render . --force` after changes (uses the local install). Verify both light and dark variants look correct.

### Prompt: refresh the diagramkit agent skills

> Refresh the diagramkit-\* skills installed in this repo so they match the latest upstream versions: `npx skills update sujeet-pro/diagramkit`. Then re-read `.claude/skills/diagramkit-setup/SKILL.md` (or the equivalent under `.cursor/skills/`, `.codex/skills/`, `.agents/skills/`) and confirm the local diagramkit install is current with `npx diagramkit --version`.

## Quick CLI reference

```bash
diagramkit render <file-or-dir>          # Render diagrams
diagramkit render . --watch              # Watch mode
diagramkit render . --format svg,png     # Multi-format
diagramkit render . --theme dark         # Dark only
diagramkit render . --force              # Ignore manifest cache
diagramkit render . --type mermaid       # Filter by type
diagramkit render . --no-contrast        # Skip contrast optimization
diagramkit render . --json               # Machine-readable output
diagramkit validate .diagramkit/         # Validate rendered SVGs
diagramkit warmup                        # Install Chromium
diagramkit doctor                        # Check environment
diagramkit init                          # Create config file
diagramkit --agent-help                  # Full LLM reference
```

> Skills are installed by the standalone `skills` CLI, not by `diagramkit`:
> `npx skills add sujeet-pro/diagramkit`

## Quick API reference

```ts
import { render, renderFile, renderAll, watchDiagrams, warmup, dispose } from 'diagramkit'

const result = await render(source, 'mermaid', { theme: 'both' })
const fileResult = await renderFile('flow.mermaid')
const { rendered, skipped, failed } = await renderAll({ dir: '.' })
const stop = watchDiagrams({ dir: '.' })
await dispose()
```

## Non-negotiable rules

- Always render both light and dark variants (default behavior).
- Use mid-tone colors from the universal palette in `diagram-authoring.md`.
- Commit source files alongside rendered outputs.
- Never hand-edit generated SVGs.
- Use the `<picture>` embedding pattern for theme-aware markdown.
- Re-render after every source change.

## Package files reference

| File                                                            | Purpose                                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `node_modules/diagramkit/REFERENCE.md`                          | Consumer landing page — read first.                                                                 |
| `node_modules/diagramkit/ai-guidelines/usage.md`                | This file — primary agent instructions.                                                             |
| `node_modules/diagramkit/ai-guidelines/diagram-authoring.md`    | Exhaustive diagram authoring guide.                                                                 |
| `node_modules/diagramkit/llms.txt`                              | Compact CLI reference.                                                                              |
| `node_modules/diagramkit/llms-full.txt`                         | Full CLI + API reference.                                                                           |
| `node_modules/diagramkit/skills/*/SKILL.md`                     | Task-specific consumer skills (install into your repo with `npx skills add sujeet-pro/diagramkit`). |
| `node_modules/diagramkit/schemas/diagramkit-cli-render.v1.json` | JSON output schema for `--json` mode.                                                               |
