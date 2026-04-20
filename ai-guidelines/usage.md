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
5. Install diagramkit's agent skills. The recommended path is the `diagramkit-setup` skill, which writes **thin local pointers** under `.agents/skills/diagramkit-*/SKILL.md` (and harness mirrors under `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.continue/skills/`) that defer to the version-pinned originals at `node_modules/diagramkit/skills/`. Trigger it by following `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md`. The standalone `[skills](https://github.com/vercel-labs/skills)` CLI (`npx skills add sujeet-pro/diagramkit`) is an alternative when you want skills that update independently of the installed `diagramkit` package.

For a fully agent-driven bootstrap, trigger the `diagramkit-setup` skill (see below).

## Shipped skills

Every skill below is **bundled in the npm package** at `node_modules/diagramkit/skills/<name>/SKILL.md`. They cover the full diagramkit lifecycle:

| Capability                                                                  | Skill                   | SKILL.md path                                                   |
| --------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| Bootstrap (install + skill pointers)                                        | `diagramkit-setup`      | `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md`      |
| Engine routing for new diagram requests                                     | `diagramkit-auto`       | `node_modules/diagramkit/skills/diagramkit-auto/SKILL.md`       |
| Authoring + image generation (vector + raster)                              | `diagramkit-mermaid`    | `node_modules/diagramkit/skills/diagramkit-mermaid/SKILL.md`    |
| Authoring + image generation (vector + raster)                              | `diagramkit-excalidraw` | `node_modules/diagramkit/skills/diagramkit-excalidraw/SKILL.md` |
| Authoring + image generation (vector + raster)                              | `diagramkit-draw-io`    | `node_modules/diagramkit/skills/diagramkit-draw-io/SKILL.md`    |
| Authoring + image generation (vector + raster)                              | `diagramkit-graphviz`   | `node_modules/diagramkit/skills/diagramkit-graphviz/SKILL.md`   |
| Validation (SVG structure, `<img>`-embed safety) **+ WCAG 2.2 AA contrast** | `diagramkit-review`     | `node_modules/diagramkit/skills/diagramkit-review/SKILL.md`     |

### Installing the skills into a repo

Pick **one** mechanism per repo so skills don't drift against each other.

**Default — local pointers (recommended).** Follow `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md` and let it write the pointer files. The pointers are tiny SKILL.md files with frontmatter and a single "follow `node_modules/diagramkit/skills/<name>/SKILL.md`" line. They are safe to commit. Each `npm install diagramkit` upgrade automatically refreshes the linked skill content.

**Alternative — fetch from GitHub via the standalone `skills` CLI:**

```bash
npx skills add sujeet-pro/diagramkit                       # all diagramkit-* skills, all detected agents
npx skills add sujeet-pro/diagramkit -a claude-code -a cursor -a codex
npx skills add sujeet-pro/diagramkit -s diagramkit-setup -s diagramkit-review
npx skills update sujeet-pro/diagramkit                    # refresh later
```

> The diagramkit- skills always prefer the locally installed CLI: they read `node_modules/diagramkit/REFERENCE.md` first and call `npx diagramkit ...` (which auto-resolves to `./node_modules/.bin/diagramkit`). They never assume a globally installed `diagramkit`.

## Agent prompts

### Prompt: set up diagramkit in a new repo (full bootstrap)

> Add `diagramkit` to this repository:
>
> 1. `npm add diagramkit`.
> 2. Read `node_modules/diagramkit/REFERENCE.md` so you anchor on the locally installed version (do NOT use a globally installed `diagramkit`).
> 3. Follow `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md` end to end. It will run `npx diagramkit warmup` (unless Graphviz-only), wire a `render:diagrams` script, optionally create `diagramkit.config.json5`, render existing diagrams, and write thin pointer skills under `.agents/skills/diagramkit-*` (and `.claude/skills/`, `.cursor/skills/`, `.codex/skills/` mirrors when those harnesses are in use) that defer to `node_modules/diagramkit/skills/<name>/SKILL.md`.

### Prompt: add diagrams to documentation

> Add visual diagrams to the documentation in this project. If `diagramkit` is not installed, run `npm add diagramkit` and follow `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md` to install the skills as local pointers. Read `node_modules/diagramkit/REFERENCE.md` first, then `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for engine selection, syntax, color palettes, and embedding patterns. Create diagram source files in `diagrams/` folders next to the markdown they support. Render with `npx diagramkit render .` (uses the local install) and embed using the `<picture>` pattern.

### Prompt: create a specific diagram with multi-format export

> Create a diagram for [TOPIC] using the diagramkit- skills installed in this repo. Read `node_modules/diagramkit/REFERENCE.md` first so you use the locally installed diagramkit version. Follow `.agents/skills/diagramkit-auto/SKILL.md` (or its harness mirror) to pick the engine, then follow the chosen engine's skill (mermaid / excalidraw / draw-io / graphviz). Use the mid-tone color palette for theme-safe rendering. Place the source in the `diagrams/` folder next to the relevant markdown. Render to multiple formats with the local CLI:
> `npx diagramkit render <file> --format svg,png,webp --scale 2`
> Embed using the `<picture>` pattern.

### Prompt: validate every diagram (structure, embed-safety, WCAG 2.2 AA contrast)

> Run a full diagram health check on this repo. Read `node_modules/diagramkit/REFERENCE.md` first so you use the locally installed CLI, then follow `.agents/skills/diagramkit-review/SKILL.md` (or `node_modules/diagramkit/skills/diagramkit-review/SKILL.md` directly). It will force-render every diagram, run `diagramkit validate . --recursive --json`, classify issues into errors vs warnings, and delegate per-engine fixes (palette swaps for `LOW_CONTRAST_TEXT`, `htmlLabels: false` for foreignObject, etc.) back to the matching engine skill's "Review Mode". Cap fix loops at 8 iterations per source.

### Prompt: refresh the diagramkit agent skills

> After upgrading diagramkit (`npm update diagramkit`), re-read `node_modules/diagramkit/REFERENCE.md` for any CLI/API changes. If the repo uses local pointer skills (default — under `.agents/skills/diagramkit-*`), they automatically pick up the new package — only re-run `node_modules/diagramkit/skills/diagramkit-setup/SKILL.md` if the upgrade added new skills that need pointers. If the repo uses the standalone `skills` CLI instead, run `npx skills update sujeet-pro/diagramkit`. Confirm with `npx diagramkit --version`.

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

> Skills are installed by the `diagramkit-setup` skill as local pointers under `.agents/skills/diagramkit-*` (and harness mirrors). See [Installing the skills into a repo](#installing-the-skills-into-a-repo).

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

## Mermaid aspect-ratio rebalance

Mermaid's default Dagre layout has no aspect-ratio knob. A `flowchart LR` with a long sequential chain produces a very wide SVG (e.g. 12:1) and a `flowchart TD` with many siblings produces a very tall one — both are hard to read when embedded at 650 px or in narrow docs. diagramkit can detect this and either warn or transparently re-render closer to a target aspect ratio.

Configure once in `diagramkit.config.json5`:

```json5
{
  mermaidLayout: {
    mode: 'auto',           // 'off' | 'warn' | 'flip' | 'elk' | 'auto'
    targetAspectRatio: 4 / 3,
    tolerance: 2.5,
  },
}
```

- Default is `'warn'` — diagramkit measures every Mermaid render and warns when the ratio falls outside `[1:1.9, 3.3:1]`. Existing outputs are unchanged.
- `'flip'` swaps `flowchart LR ↔ TB` (and `RL ↔ BT`) and keeps the closer-to-target render. Cheap, semantic-preserving for most graphs.
- `'elk'` injects a `%%{init:{"layout":"elk","elk":{"aspectRatio":...}}}%%` directive. Requires the optional `@mermaid-js/layout-elk` plugin to be available; otherwise the attempt is caught and the original render is kept.
- `'auto'` tries `flip` first, then `elk` (and `flip + elk`), and picks the closest result.
- Only `flowchart`/`graph` diagrams are rebalanced. Sequence, gantt, journey, state, class, ER, pie, mindmap, sankey, gitGraph degrade to `warn`-only behaviour.

Same options can be passed per render call via `RenderOptions.mermaidLayout`. Full schema and trade-offs: `node_modules/diagramkit/REFERENCE.md` → Configuration → `mermaidLayout`.

## Package files reference

| File                                                            | Purpose                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `node_modules/diagramkit/REFERENCE.md`                          | Consumer landing page — read first.                                                              |
| `node_modules/diagramkit/ai-guidelines/usage.md`                | This file — primary agent instructions.                                                          |
| `node_modules/diagramkit/ai-guidelines/diagram-authoring.md`    | Exhaustive diagram authoring guide.                                                              |
| `node_modules/diagramkit/llms.txt`                              | Compact CLI reference.                                                                           |
| `node_modules/diagramkit/llms-full.txt`                         | Full CLI + API reference.                                                                        |
| `node_modules/diagramkit/skills/*/SKILL.md`                     | Task-specific consumer skills (install into your repo as local pointers via `diagramkit-setup`). |
| `node_modules/diagramkit/schemas/diagramkit-cli-render.v1.json` | JSON output schema for `--json` mode.                                                            |
