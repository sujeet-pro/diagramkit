# diagramkit

Standalone diagram rendering CLI & library. Converts `.mermaid`, `.excalidraw`, and `.drawio` files to SVG/PNG/JPEG/WebP with light/dark mode support and color contrast optimization.

## Architecture

- **Unified Playwright** — single headless Chromium instance for mermaid, excalidraw, and draw.io
- **Browser pool** — lazy init, reference counting, idle timeout (5s), auto-cleanup
- **4 pages** — mermaid light, mermaid dark (separate because `mermaid.initialize()` is global), excalidraw (handles darkMode per-call), drawio (handles darkMode per-call)
- **Manifest system** — SHA-256 content hashing for incremental rebuilds
- **Output convention** — `.diagrams/` hidden folder next to source files
- **Extension aliases** — multiple file extensions map to each diagram type (e.g. `.mmd`, `.mmdc` -> mermaid)

## Design philosophy

These principles guide all implementation decisions. Follow them when adding features or modifying code.

### Single browser, shared pool

All diagram types render through one Chromium instance managed by `BrowserPool`. This avoids the cost of launching multiple browsers. New diagram types MUST use this same pool — add a new page type to the pool rather than launching a separate process. The pool uses reference counting with idle timeout so the browser is only alive while renders are in-flight.

### SVG-first, raster as optional conversion

The core pipeline always produces SVG. Raster formats (PNG/JPEG/WebP) are a post-processing step via `sharp`, which is an optional peer dependency. This keeps the core lightweight and means SVG users don't need native dependencies. Never make sharp a hard requirement.

### Light + dark by default

Every diagram type renders both theme variants unless the user explicitly requests one. Output filenames always include `-light` or `-dark` suffixes. There is no "themeless" output. This ensures all consumers (docs, README, email) can reference the correct variant.

### Incremental by default

The manifest system (SHA-256 content hash + format + theme tracking) prevents re-rendering unchanged files. This is critical for large repos where batch rendering could otherwise be slow. The manifest also tracks expected output filenames so missing outputs trigger re-render even if the source hash hasn't changed.

### Configuration layering

Config merges in a strict order: defaults → global (`~/.config/diagramkit/config.json`) → local (`.diagramkitrc.json`, walks up) → per-call overrides. Each layer is a partial object spread on top of the previous. Never change this order.

### Atomic writes everywhere

All output files are written to `.tmp` then renamed. This prevents partial files from being served by dev servers or committed by watchers that detect changes mid-write.

### Extension-based type detection

Diagram type is determined solely by file extension, using longest-match-first resolution (so `.drawio.xml` beats `.xml`). The extension map is configurable via `extensionMap` in config. Adding a new diagram type means adding its extensions to the map and a renderer — no other code needs to know about it.

### Browser entry points as IIFE bundles

Excalidraw and draw.io renderers work by bundling a TypeScript entry file into an IIFE (via rolldown at runtime) and injecting it into a Playwright page. This pattern lets us use npm packages (like `@excalidraw/excalidraw`) inside the browser context without a dev server. The entry files live in `src/renderers/*-entry.ts` and expose globals like `__renderExcalidraw()`.

## Adding a new diagram type

To add support for a new diagram format (e.g. PlantUML):

1. **Extension map** — add entries to `DEFAULT_EXTENSION_MAP` in `src/extensions.ts` (e.g. `.puml: 'plantuml'`)
2. **DiagramType union** — add `'plantuml'` to the `DiagramType` type in `src/types.ts`
3. **Renderer branch** — add an `else if (type === 'plantuml')` branch in `src/renderer.ts:render()`
4. **Pool page** — add a `getPlantumlPage()` method to `BrowserPool` in `src/pool.ts`, following the excalidraw/drawio pattern if the renderer needs a bundled IIFE, or the mermaid pattern if it loads a script directly
5. **Browser entry** (if needed) — create `src/renderers/plantuml-entry.ts` with a `__renderPlantuml()` global, add it to `vite.config.ts` pack entries
6. **Class renderer** — create `src/renderers/plantuml.ts` implementing `DiagramRenderer`, export from `src/renderers/index.ts`
7. **Tests** — add extension tests, a fixture file, and e2e test coverage
8. **Docs & skills** — add `docs/diagrams/plantuml.md` and `agent_skills/diagram-plantuml.md`

The manifest, discovery, output naming, and watch systems all work automatically via the extension map — no changes needed there.

## Types

```typescript
type DiagramType = 'mermaid' | 'excalidraw' | 'drawio'
type OutputFormat = 'svg' | 'png' | 'jpeg' | 'webp'
type Theme = 'light' | 'dark' | 'both'
```

## Directory structure

```
cli/
  bin.ts              CLI entry point (manual arg parsing, no framework)
src/
  index.ts            Public API barrel — all exports go through here
  types.ts            All public TypeScript interfaces
  pool.ts             BrowserPool (Playwright lifecycle, ref counting, page management)
  renderer.ts         render(), renderFile(), renderAll(), renderDiagramFileToDisk()
  discovery.ts        findDiagramFiles() recursive scan, filterByType()
  manifest.ts         SHA-256 hashing, staleness, orphan cleanup, manifest I/O
  watch.ts            chokidar file watching with safe re-render
  config.ts           Configuration loading (defaults → global → local → overrides)
  convert.ts          SVG-to-raster conversion via sharp (dynamic import)
  extensions.ts       Extension-to-DiagramType mapping and aliases
  output.ts           Output naming, atomic writes, extension stripping
  renderers/
    excalidraw-entry.ts  Browser IIFE for excalidraw exportToSvg
    drawio-entry.ts      Browser IIFE for draw.io mxGraphModel parsing
    browser-env.d.ts     Minimal DOM types for browser entry files
  color/
    index.ts          Color utility barrel
    index.test.ts     Color unit tests
    convert.ts        hex/rgb/hsl conversions
    luminance.ts      WCAG relative luminance
    contrast.ts       postProcessDarkSvg() — fix dark mode contrast
  *.test.ts           Unit tests colocated with source files
e2e/
  api-render.e2e.test.ts  API rendering e2e (vitest, all types/formats/themes/incremental)
  cli-render.e2e.test.ts  CLI rendering e2e (vitest, flags/output dirs/filtering)
  test-utils.ts           Shared e2e helpers (fixture workspace, CLI runner, validators)
  README.md               Lists all e2e test cases
  fixtures/               Sample .mmd, .excalidraw, .drawio.xml for testing
docs/                 VitePress documentation site
agent_skills/         User-installable Claude Code skills (shipped in npm package)
  diagrams/
    SKILL.md          Engine selection orchestrator
  diagramkit/
    SKILL.md          Render diagrams to images (CLI, output convention, config)
  diagram-mermaid/
    SKILL.md          Mermaid source file authoring
  diagram-excalidraw/
    SKILL.md          Excalidraw source file authoring
  diagram-drawio/
    SKILL.md          Draw.io source file authoring
  image-convert/
    SKILL.md          SVG-to-raster conversion
  diagrams-troubleshoot/
    SKILL.md          Common errors and fixes
  diagrams-ci-cd/
    SKILL.md          CI/CD integration guide
  refs/
    mermaid/          Mermaid diagram type syntax (flowchart, sequence, class, etc.)
    excalidraw/       Excalidraw JSON format, arrows, colors, examples, validation
    drawio/           Draw.io shapes and styles references
.claude/
  skills/
    review-repo/      Project-level skill (for developing diagramkit itself, not shipped)
      SKILL.md        Full repository review with parallel agent teams
INSTALL_SKILLS.md     Skill manifest and installation instructions (shipped in npm package)
```

## Commands

```bash
diagramkit render <file-or-dir>                # Render diagrams
diagramkit render . --watch                    # Watch mode
diagramkit render docs/arch.mermaid            # Default SVG output
diagramkit render . --format png --theme light # Raster for email/Confluence
diagramkit render . --format webp --quality 85 # WebP output when raster is required
diagramkit render . --theme dark               # Dark only
diagramkit render . --force                    # Ignore manifest cache
diagramkit render . --type mermaid             # Filter by type
diagramkit render . --no-contrast              # Skip dark SVG contrast fix
diagramkit render . --scale 3                  # High-res raster
diagramkit render file.mermaid --output ./out  # Custom output dir for a single file
diagramkit render . --dry-run                  # Preview what would render
diagramkit render . --quiet                    # Suppress info output
diagramkit render . --json                     # Machine-readable JSON output
diagramkit warmup                              # Install Playwright chromium
diagramkit init                                # Create .diagramkitrc.json config
diagramkit install-skills                      # Copy skills to .claude/skills/
diagramkit install-skills --global             # Copy skills to ~/.claude/skills/
```

## Key APIs

```typescript
render(source, type, options?)    // Render from string → RenderResult
renderFile(filePath, options?)    // Render from file → RenderResult
renderAll(options?)               // Batch render directory → RenderAllResult { rendered, skipped, failed }
renderDiagramFileToDisk(file, options?) // Render single file + write to disk. Useful for custom watch implementations.
watchDiagrams(options)            // Watch mode with debounce
convertSvg(svg, options)          // SVG to PNG/JPEG/WebP via sharp. Imported from 'diagramkit/convert', not the main entrypoint.
loadConfig(overrides?, dir?)      // Merged config: defaults -> global -> local -> overrides
getExtensionMap(overrides?)       // Get extension-to-type mapping
warmup() / dispose()              // Browser lifecycle
postProcessDarkSvg(svg)           // Color contrast fix (handles style="" and fill="" attributes)
atomicWrite(path, content)        // Atomic .tmp + rename write
```

## Coding conventions

- ESM only, trailing commas, no semicolons
- Async for all rendering (Playwright-based)
- Sync FS for file reading (readFileSync)
- No CLI framework — manual arg parsing
- Comments explain reasoning, not what code does
- Section headers: `/* -- Name -- */`
- Dynamic imports for optional deps (sharp)
- Atomic writes in renderers: .tmp + rename
- Test files: unit tests colocated with source (`src/*.test.ts`), e2e tests in `e2e/`
- Unit tests cover pure logic; e2e tests cover real Playwright rendering across all diagram types

## Dependencies

- `playwright` — headless Chromium for all rendering
- `mermaid` — loaded into browser page for mermaid diagrams
- `chokidar` — file watching
- `@excalidraw/excalidraw` + `react` + `react-dom` — excalidraw rendering (bundled to IIFE at runtime via rolldown)
- `rolldown` — bundles excalidraw/drawio browser entry points as IIFE at runtime
- `sharp` (optional peer) — SVG-to-raster conversion (PNG/JPEG/WebP); dynamically imported, only needed for raster output

## Extension aliases

| Extension     | DiagramType |
| ------------- | ----------- |
| `.mermaid`    | mermaid     |
| `.mmd`        | mermaid     |
| `.mmdc`       | mermaid     |
| `.excalidraw` | excalidraw  |
| `.drawio`     | drawio      |
| `.drawio.xml` | drawio      |
| `.dio`        | drawio      |

## Runtime compatibility

- **Node 24** (`.node-version`) with npm 11.x
- **engines.node**: `>=24.0.0`

## Testing strategy

- **Unit tests** (`src/**/*.test.ts`): Colocated with source files. Test pure logic modules (extensions, config, manifest, output, discovery, color, convert) with real temp directories and mocked FS where needed. No browser required.
- **E2E tests** (`e2e/`): Vitest-integrated tests that run with `npm run test:e2e`. Test real rendering through Playwright for all diagram types, themes, formats, CLI flags, manifest behavior, and incremental rebuilds. Each test creates and cleans up an isolated temp workspace.
- **CI**: E2E on Node 24 (from `.node-version`).
- Run `npm test` for all, `npm run test:unit` for fast feedback, `npm run test:e2e` for e2e.
- **Export policy**: Only export functions needed by other modules or the public API. Never export a function solely for testing — test through the public interface or restructure the code instead.

## Validation before commit

Always run these checks before committing changes:

```bash
npm run check          # Lint and format
npm run typecheck      # Type checking
npm run build          # Build dist
npm run build:docs     # Build docs site
npm run test:unit      # Unit tests
npm run test:e2e       # E2E rendering tests (Node)
```

Or run everything at once:

```bash
npm run validate    # All checks in sequence (lint + typecheck + build + docs + all tests)
```

## LLM files

- **llms.txt** — Concise LLM-oriented summary following the llms.txt convention.
- **llms-full.txt** — Detailed LLM reference with architecture, API, and internals.
- When updating the codebase, keep these files in sync with actual behavior.

## Agent skills (user-installable)

Skills can be installed into a project with `diagramkit install-skills` or globally with `diagramkit install-skills --global`. Each skill lives in its own folder under `agent_skills/<skill-name>/SKILL.md`. Shared references live in `agent_skills/refs/`.

- **agent_skills/diagramkit/SKILL.md** — Quick reference for CLI, output convention, configuration, dark mode.
- **agent_skills/diagrams/SKILL.md** — Engine selection: when to use mermaid vs excalidraw vs drawio.
- **agent_skills/diagram-mermaid/SKILL.md** — Mermaid authoring with all 20+ diagram type syntax.
- **agent_skills/diagram-excalidraw/SKILL.md** — Excalidraw JSON authoring rules and patterns.
- **agent_skills/diagram-drawio/SKILL.md** — Draw.io XML authoring with shapes, styles, containers.
- **agent_skills/image-convert/SKILL.md** — SVG-to-raster conversion using diagramkit.
- **agent_skills/diagrams-troubleshoot/SKILL.md** — Common errors and fixes for all diagram types.
- **agent_skills/diagrams-ci-cd/SKILL.md** — CI/CD integration guide (GitHub Actions, GitLab CI, Docker).
- **agent_skills/refs/** — Shared references for mermaid syntax, excalidraw JSON format, draw.io shapes and styles.

## Project skills (for developing diagramkit)

These skills are for contributors working on diagramkit itself. They live in `.claude/skills/` and are NOT shipped in the npm package.

- **.claude/skills/review-repo/SKILL.md** — Full repository review with parallel agent teams. Covers code quality, tests, architecture, performance, security, docs, CLAUDE.md alignment, and skills. Use `/review-repo` to run.
