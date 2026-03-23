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
8. **Docs & skills** — add `docs/diagrams/plantuml.md` and `skills/claude-code/diagram-plantuml.md`

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
    index.ts          createRenderers() factory
    mermaid.ts        MermaidRenderer class (DiagramRenderer interface)
    excalidraw.ts     ExcalidrawRenderer class
    excalidraw-entry.ts  Browser IIFE for excalidraw exportToSvg
    drawio.ts         DrawioRenderer class
    drawio-entry.ts   Browser IIFE for draw.io mxGraphModel parsing
    browser-env.d.ts  Minimal DOM types for browser entry files
  color/
    index.ts          Color utility barrel
    convert.ts        hex/rgb/hsl conversions
    luminance.ts      WCAG relative luminance
    contrast.ts       postProcessDarkSvg() — fix dark mode contrast
  __tests__/          Unit tests (pure logic, mocked FS where needed)
  test-utils/
    e2e.ts            Shared e2e helpers (fixture workspace, CLI runner, validators)
  e2e/
    api-render.e2e.test.ts  API rendering e2e (all types, formats, themes, incremental)
    cli-render.e2e.test.ts  CLI rendering e2e (flags, output dirs, filtering)
    fixtures/               Sample .mmd, .excalidraw, .drawio.xml for testing
docs/                 VitePress documentation site
skills/
  claude-code/        LLM skills for diagram generation and rendering
    diagramkit.md     Quick reference (CLI, output convention, config)
    diagrams.md       Engine selection orchestrator
    diagram-mermaid.md    Mermaid authoring (20+ diagram types)
    diagram-excalidraw.md Excalidraw authoring
    diagram-drawio.md     Draw.io authoring
    image-convert.md      SVG-to-raster conversion
    references/           Excalidraw JSON format, arrows, colors, examples, validation
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
diagramkit render file.mermaid --output ./out  # Custom output dir
diagramkit warmup                              # Install Playwright chromium
```

## Key APIs

```typescript
render(source, type, options?)    // Render from string
renderFile(filePath, options?)    // Render from file
renderAll(options?)               // Batch render directory
watchDiagrams(options)            // Watch mode
convertSvg(svg, options)          // SVG to PNG/JPEG/WebP via sharp
loadConfig(overrides?, dir?)      // Merged config: defaults -> global -> local -> overrides
getExtensionMap(overrides?)       // Get extension-to-type mapping
warmup() / dispose()              // Browser lifecycle
postProcessDarkSvg(svg)           // Color contrast fix
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
- Test files: unit tests in `src/__tests__/`, e2e tests in `src/e2e/`
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

## Testing strategy

- **Unit tests** (`src/__tests__/`): Test pure logic modules (extensions, config, manifest, output, discovery, color, convert) with real temp directories and mocked FS where needed. No browser required.
- **E2E tests** (`src/e2e/`): Test real rendering through Playwright for all diagram types (mermaid, excalidraw, drawio) across all output formats (SVG, PNG, JPEG, WebP), themes, config options, and incremental rebuild behavior. Each test creates an isolated temp workspace from fixture files.
- **CLI e2e tests**: Run the built CLI binary (`dist/cli/bin.mjs`) via `execFileSync` to verify flag parsing and output.
- Run `npm test` for all, `npm run test:unit` for fast feedback, `npm run test:e2e` for rendering tests.

## Claude Code skills

- **skills/claude-code/diagramkit.md** — Quick reference for CLI, output convention, configuration, dark mode.
- **skills/claude-code/diagrams.md** — Engine selection: when to use mermaid vs excalidraw vs drawio.
- **skills/claude-code/diagram-mermaid.md** — Mermaid authoring with all 20+ diagram type syntax.
- **skills/claude-code/diagram-excalidraw.md** — Excalidraw JSON authoring rules and patterns.
- **skills/claude-code/diagram-drawio.md** — Draw.io XML authoring with shapes, styles, containers.
- **skills/claude-code/image-convert.md** — SVG-to-raster conversion using diagramkit.
- **skills/claude-code/references/** — Excalidraw JSON format spec, arrows, colors, examples, validation.
