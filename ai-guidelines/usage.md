# diagramkit Usage For AI Agents

Use this file as the primary instruction source for `diagramkit`.

## Getting Started

1. Install: `npm add diagramkit`
2. Warmup: `npx diagramkit warmup` (installs Playwright Chromium)
3. Render: `npx diagramkit render .`
4. For diagram authoring guidance, read: `node_modules/diagramkit/ai-guidelines/diagram-authoring.md`
5. For full API/CLI reference, read: `node_modules/diagramkit/ai-guidelines/llms-full.txt`

## When To Use diagramkit

- Convert `.mermaid`, `.excalidraw`, `.drawio`, and `.dot`/`.gv` files to SVG/PNG/JPEG/WebP/AVIF
- Automatic light/dark mode rendering with WCAG contrast optimization
- Incremental builds via SHA-256 manifest
- Watch mode for live re-rendering
- Batch rendering for CI/CD pipelines

## Repo Bootstrap

Recommended setup steps for adding diagramkit to a repository:

1. `npm add diagramkit`
2. Add `"render:diagrams": "diagramkit render ."` to `package.json` scripts
3. `npx diagramkit warmup` (skip if Graphviz-only)
4. `npx diagramkit init` to create `diagramkit.config.json5` (only if non-default behavior is needed)
5. `npx diagramkit --install-skill` to create `.claude/skills/diagramkit/SKILL.md` and `.cursor/skills/diagramkit/SKILL.md`

## Agent Prompts

### Prompt: Add diagrams to documentation

> Add visual diagrams to the documentation in this project. Install `diagramkit` if not present. Read `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for engine selection, syntax, color palettes, and embedding patterns. Create diagram source files in `diagrams/` folders next to the markdown they support. Render with `npx diagramkit render .` and embed using the appropriate pattern for the target surface (Pagesmith docs, GitHub README, or plain markdown).

### Prompt: Create a specific diagram

> Create a diagram for [TOPIC]. Read `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` first to choose the right engine and follow the authoring rules. Use the mid-tone color palette for theme-safe rendering. Place the source file in the `diagrams/` folder next to the relevant markdown. Render with `npx diagramkit render [file]` and embed in the markdown using the correct pattern.

### Prompt: Update existing diagrams

> Review and update the diagrams in this project. Read `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for the current guidelines. Check each diagram source file against the quality checklist and color palette. Re-render with `npx diagramkit render . --force` after changes. Verify both light and dark variants look correct.

### Prompt: Set up diagramkit in a new repo

> Add `diagramkit` to this repository following the bootstrap steps. Read `node_modules/diagramkit/ai-guidelines/usage.md` for setup instructions. Install the package, run warmup, add render scripts to package.json, and optionally create a config file. Install project skills with `npx diagramkit --install-skill`.

### Prompt: Create a diagram skill for this project

> Create a project-level diagram skill based on diagramkit. Read `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` for the full reference. Create `.claude/skills/diagrams/SKILL.md` (or equivalent) that includes: engine selection guidance, the project's preferred color palette, file layout conventions, embedding patterns for the project's markdown surface, and rendering commands. Keep the skill focused on this project's specific needs — reference the ai-guidelines files for the exhaustive engine details.

## Package Files Reference

| File                                                         | Purpose                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `node_modules/diagramkit/ai-guidelines/usage.md`             | This file — primary agent instructions                                       |
| `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` | Exhaustive diagram authoring guide (all engines, colors, theming, embedding) |
| `node_modules/diagramkit/ai-guidelines/llms.txt`             | Compact CLI reference                                                        |
| `node_modules/diagramkit/ai-guidelines/llms-full.txt`        | Full CLI + API reference                                                     |

## Quick CLI Reference

```bash
diagramkit render <file-or-dir>          # Render diagrams
diagramkit render . --watch              # Watch mode
diagramkit render . --format svg,png     # Multi-format
diagramkit render . --theme dark         # Dark only
diagramkit render . --force              # Ignore cache
diagramkit render . --type mermaid       # Filter by type
diagramkit render . --no-contrast        # Skip contrast optimization
diagramkit render . --json               # Machine-readable output
diagramkit warmup                        # Install Chromium
diagramkit doctor                        # Check environment
diagramkit init                          # Create config file
diagramkit --install-skill               # Install project skills
diagramkit --agent-help                  # Full LLM reference
```

## Quick API Reference

```ts
import { render, renderFile, renderAll, watchDiagrams, warmup, dispose } from 'diagramkit'

// Render from string
const result = await render(source, 'mermaid', { theme: 'both' })

// Render from file
const result = await renderFile('flow.mermaid')

// Batch render directory
const { rendered, skipped, failed } = await renderAll({ dir: '.' })

// Watch mode
const stop = watchDiagrams({ dir: '.' })

// Cleanup
await dispose()
```

## Non-negotiable Rules

- Always render both light and dark variants (default behavior)
- Use mid-tone colors from the universal palette in `diagram-authoring.md`
- Commit editable source files alongside rendered outputs
- Never hand-edit generated SVGs
- Use the correct markdown embedding pattern for the target surface
- Re-render after every source change

## Related Package Docs

- `node_modules/diagramkit/ai-guidelines/diagram-authoring.md` — full authoring reference
- `node_modules/diagramkit/schemas/diagramkit-cli-render.v1.json` — JSON output schema
