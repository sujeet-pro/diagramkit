# diagramkit Project Context

Canonical description of what diagramkit is, how it is structured, and how it renders diagrams. Every contributor-facing agent (Claude, Codex/AGENTS, Cursor, Gemini) should read this first alongside `coding-standards.md` and `contributor-workflow.md`.

## What it is

Standalone diagram rendering CLI and library. Converts `.mermaid`, `.excalidraw`, `.drawio`, and Graphviz `.dot`/`.gv` files to SVG/PNG/JPEG/WebP/AVIF with light/dark mode support and color contrast optimization.

## Architecture at a glance

- **Unified Playwright** — single headless Chromium instance for mermaid, excalidraw, and draw.io.
- **Browser pool** — lazy init, reference counting, idle timeout (5s), auto-cleanup.
- **4 pages** — mermaid light, mermaid dark (separate because `mermaid.initialize()` is global), excalidraw (handles darkMode per-call), drawio (handles darkMode per-call).
- **Manifest system** — SHA-256 content hashing for incremental rebuilds.
- **Output convention** — `.diagramkit/` hidden folder next to source files.
- **Extension aliases** — multiple file extensions map to each diagram type (e.g. `.mmd`, `.mmdc` -> mermaid).

## Design philosophy

These principles guide all implementation decisions. Follow them when adding features or modifying code.

### Single browser, shared pool

All browser-based diagram types render through one Chromium instance managed by `BrowserPool`. Graphviz uses `@viz-js/viz` (WASM) directly, without a browser. This avoids the cost of launching multiple browsers. New browser-based diagram types MUST use this same pool — add a new page type to the pool rather than launching a separate process. The pool uses reference counting with idle timeout so the browser is only alive while renders are in-flight.

### SVG-first, raster as optional conversion

The core pipeline always produces SVG. Raster formats (PNG/JPEG/WebP/AVIF) are a post-processing step via `sharp`, which is an optional peer dependency. This keeps the core lightweight and means SVG users don't need native dependencies. Never make sharp a hard requirement. Multiple formats can be requested in a single render — SVG is rendered once and then converted to each raster format.

### Light + dark by default

Every diagram type renders both theme variants unless the user explicitly requests one. Output filenames always include `-light` or `-dark` suffixes. There is no "themeless" output. This ensures all consumers (docs, README, email) can reference the correct variant.

### Incremental by default

The manifest system (SHA-256 content hash + formats array + theme tracking) prevents re-rendering unchanged files. This is critical for large repos where batch rendering could otherwise be slow. The manifest tracks all generated formats (accumulative) so re-processing regenerates all previously generated formats. Missing outputs trigger re-render even if the source hash hasn't changed. Use `--force` to reset format tracking.

### Configuration layering

Config merges in a strict order: defaults → global (`~/.config/diagramkit/config.json5` or `config.json`) → env vars (`DIAGRAMKIT_*`) → local (`diagramkit.config.ts` or `.json5`, walks up) → per-call overrides. Each layer is a partial object spread on top of the previous. Never change this order. Legacy `.diagramkitrc.json` is still supported but deprecated.

Object-valued fields (`extensionMap`, `overrides`, `mermaidLayout`) are deep-merged so a partial override (e.g. `{ mermaidLayout: { mode: 'auto' } }`) keeps the other defaults intact. `mermaidLayout` is additionally validated by `resolveMermaidLayout()` so invalid `mode`/`targetAspectRatio`/`tolerance` values fall back to defaults with a warning (or throw under `strict: true`). Schema mirror lives at `schemas/diagramkit-config.v1.json`.

### Atomic writes everywhere

All output files are written to `.tmp` then renamed. This prevents partial files from being served by dev servers or committed by watchers that detect changes mid-write.

### Extension-based type detection

Diagram type is determined solely by file extension, using longest-match-first resolution (so `.drawio.xml` beats `.xml`). The extension map is configurable via `extensionMap` in config. Adding a new diagram type means adding its extensions to the map and a renderer — no other code needs to know about it.

### Browser entry points as IIFE bundles

Excalidraw and draw.io renderers work by bundling a TypeScript entry file into an IIFE (via rolldown at runtime) and injecting it into a Playwright page. This pattern lets us use npm packages (like `@excalidraw/excalidraw`) inside the browser context without a dev server. The entry files live in `src/renderers/*-entry.ts` and expose globals like `__renderExcalidraw()`.

## Types

```typescript
type DiagramType = 'mermaid' | 'excalidraw' | 'drawio' | 'graphviz'
type OutputFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'avif'
type Theme = 'light' | 'dark' | 'both'
```

## Directory structure

```
cli/
  bin.ts              CLI entry point (manual arg parsing, no framework)
src/
  index.ts            Public API barrel for runtime, rendering, config, and engine metadata
  utils.ts            Utility barrel (discovery, manifest, extensions, output, color)
  types.ts            All public TypeScript interfaces
  pool.ts             BrowserPool (Playwright lifecycle, ref counting, page management)
  renderer.ts         render(), renderFile(), renderDiagramFileToDisk(), defaultMermaidDarkTheme
  render-all.ts       renderAll() batch orchestration and per-type lane scheduling
  render-engines.ts   Per-type SVG renderers (mermaid/excalidraw/drawio/graphviz)
  engine-profiles.ts  Engine capability metadata (browser-backed vs non-browser)
  runtime.ts          createRendererRuntime() isolated runtime wrapper
  doctor.ts           doctor command implementation and health checks
  logging.ts          Leveled logger (silent/error/warn/info/verbose), createLeveledLogger()
  mermaid-theme.ts    Default mermaid dark theme variables
  discovery.ts        findDiagramFiles() recursive scan, filterByType()
  manifest.ts         SHA-256 hashing, staleness, orphan cleanup, manifest I/O
  watch.ts            chokidar file watching with safe re-render
  config.ts           Configuration loading (defaults → global → env → local → overrides), defineConfig()
  convert.ts          SVG-to-raster conversion via sharp (dynamic import)
  extensions.ts       Extension-to-DiagramType mapping and aliases
  output.ts           Output naming, atomic writes, extension stripping
  graphviz.ts         Graphviz rendering via @viz-js/viz (WASM, no browser)
  validate.ts         SVG validation (structure, dimensions, visual elements, img-tag compatibility)
  renderers/
    excalidraw-entry.ts  Browser IIFE for excalidraw exportToSvg
    drawio-entry.ts      Browser IIFE for draw.io mxGraphModel parsing
    excalidraw.d.ts      Type declarations for @excalidraw/excalidraw
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
  fixtures/
    mixed-diagrams/      Sample .mmd, .excalidraw, .drawio.xml, .dot for testing
scripts/
  copy-llms.ts         Copies root llms*.txt into gh-pages/ after build:docs
  run-pagesmith.ts     Wrapper for pagesmith CLI (docs dev/build/preview)
  validate-build.ts    Post-build checks (package payload, SKILL.md frontmatter, docs links)
ai-guidelines/          Consumer-facing agent guidance (shipped in npm package)
  usage.md              Primary agent setup prompts and quick reference
  diagram-authoring.md  Exhaustive diagram authoring guide (all engines, colors, theming, embedding)
llms.txt                Compact CLI reference for LLM agents (repo root, shipped in npm)
llms-full.txt           Full CLI + API + types + architecture reference (repo root, shipped)
.agents/skills/         Canonical contributor skills (SKILL.md + references/)
  review-repo/
    SKILL.md
    references/
      project-context.md      This file — architecture, module map, design philosophy
      coding-standards.md     Language, style, testing, error handling conventions
      contributor-workflow.md .temp/ convention, sync rule, validation pipeline, release flow
  update-docs/
    SKILL.md
    references/
      docs-workflow.md        Pagesmith and AI-first docs authoring rules
  add-diagram-type/SKILL.md
  add-cli-flag/SKILL.md
  release/SKILL.md
.claude/skills/         Thin pointer mirrors to .agents/skills
.cursor/skills/         Thin pointer mirrors to .agents/skills
.cursor/commands/       Cursor slash-command shortcuts to .agents/skills
skills/                 Consumer skills shipped to npm (diagramkit-mermaid/-excalidraw/-drawio/-graphviz/-auto/-setup)
REFERENCE.md            Consumer-facing landing page included in the npm tarball
schemas/
  diagramkit-cli-render.v1.json  JSON schema for CLI render JSON output (schemaVersion 1)
  diagramkit-config.v1.json      JSON schema for diagramkit.config.{json5,json} (used as $schema)
docs/                 Documentation site content (@pagesmith/docs convention)
  README.md           Home page (DocHome layout)
  meta.json5          Header/footer navigation
  guide/              Guide section (ai-agents FIRST, then getting-started, configuration, cli, js-api, bundled-assets, diagrams, watch-mode, image-formats, ci-cd, api-patterns, architecture, design-principles, troubleshooting)
  reference/
    diagramkit/       Per-package reference series (cli, api, config, types, utils, color, convert)
    how-it-works/     "How this is built" series (pool, manifest, rendering-pipeline, color-processing)
gh-pages/             Built docs output (gitignored). copy-llms.ts copies root llms*.txt into here after build:docs.
.github/workflows/
  cicd.yml            Parallelized CI: lint, typecheck, build-lib → {lib-pack-check, unit, e2e, docs-build → validate-build}, summary, deploy-docs
  publish.yml         Manual release (workflow_dispatch): release_type=patch|minor|major
CLAUDE.md             Claude-client wrapper — non-negotiables + pointers to .agents/skills/ (+ pagesmith memory block)
AGENTS.md             Codex / generic AGENTS-compatible wrapper — same shape as CLAUDE.md
GEMINI.md             Gemini-client wrapper — same shape
pagesmith.config.json5  Docs site configuration (name, outDir, basePath, etc.)
```

## Key APIs

**Core API** (`diagramkit`):

```typescript
render(source, type, options?)              // Render from string → RenderResult
renderFile(filePath, options?)              // Render from file → RenderResult
renderAll(options?)                         // Batch render directory → RenderAllResult
renderDiagramFileToDisk(file, options?)     // Render single file + write to disk
watchDiagrams(options)                      // Watch mode with debounce
createRendererRuntime()                     // Isolated runtime with its own browser pool
defineConfig(config)                        // Identity helper for TS config autocomplete
loadConfig(overrides?, dir?, configFile?, options?) // Merged config
getDefaultConfig()                          // Get default config values
getFileOverrides(filePath, config?, rootDir?) // Resolve per-file overrides from config
convertSvg(svg, options)                    // SVG to PNG/JPEG/WebP/AVIF via sharp
warmup() / dispose()                        // Browser lifecycle
ENGINE_PROFILES                             // Engine capability metadata
getEngineProfile(type)                      // Get profile for a specific diagram type
defaultMermaidDarkTheme                     // Built-in mermaid dark theme variable map
DiagramkitError                             // Typed error class with DiagramkitErrorCode
```

**Mermaid layout pipeline** (`src/render-engines.ts` + `src/mermaid-layout.ts`):

The mermaid renderer measures the output SVG aspect ratio and, depending on `mermaidLayout.mode`, may re-render with a flipped flowchart direction or an injected ELK init directive to bring the ratio closer to `targetAspectRatio`. The fast path (`off`, `warn`) preserves the original parallel light/dark render. The rebalance path (`flip`, `elk`, `auto`) probes one theme first, picks the closest source variant via `pickClosestToTarget()` (log-scale distance), then re-renders the other theme against the chosen source so light and dark match. Failed rebalance attempts are caught and surfaced through the warn callback — they never break a successful initial render. Non-flowchart diagrams degrade to `warn`-only behaviour.

**Utilities** (`diagramkit/utils`):

```typescript
findDiagramFiles(dir, config?)              // Recursive file discovery
filterByType(files, type, config?)          // Filter files by diagram type
readManifest(sourceDir, config?)            // Read manifest (v2 format with per-output metadata)
writeManifest(sourceDir, manifest, config?) // Write manifest atomically
updateManifest(files, formats?, config?, theme?)
filterStaleFiles(files, force, formats?, config?, theme?)
planStaleFiles(files, force, formats?, config?, theme?)
isStale(file, formats?, config?, theme?, manifest?)
hashFile(filePath)                          // SHA-256 content hash
cleanOrphans(files, config?, roots?)
getDiagramsDir(sourceDir, config?)
ensureDiagramsDir(sourceDir, config?)
getDiagramType(filename, map?)
getExtensionMap(overrides?)
getMatchedExtension(filename, map?)
getExtensionsForType(type, map?)
getAllExtensions(map?)
stripDiagramExtension(filename, map?)
atomicWrite(path, content: Buffer)
writeRenderResult(name, outDir, result, naming?)
getExpectedOutputNames(name, format?, theme?, naming?)
getExpectedOutputNamesMulti(name, formats, theme?, naming?)
getOutputFileName(name, variant, format?, naming?)
getOutputVariants(theme?)
renderGraphviz(source, options?)
postProcessDarkSvg(svg)
validateSvg(svg, filePath?)
validateSvgFile(filePath)
validateSvgDirectory(dir, options?)
formatValidationResult(result)
```

**Color** (`diagramkit/color`):

```typescript
postProcessDarkSvg(svg) // WCAG contrast optimization for dark SVGs
```

**Convert** (`diagramkit/convert`):

```typescript
convertSvg(svg, options) // SVG to PNG/JPEG/WebP/AVIF via sharp
```

## Adding a new diagram type

To add support for a new diagram format (e.g. PlantUML):

1. **Extension map** — add entries to `DEFAULT_EXTENSION_MAP` in `src/extensions.ts` (e.g. `.puml: 'plantuml'`)
2. **DiagramType union** — add `'plantuml'` to the `DiagramType` type in `src/types.ts`
3. **Engine profile** — add metadata to `ENGINE_PROFILES` in `src/engine-profiles.ts` (whether the type requires browser pool access)
4. **Pool page** (if browser-based) — add a `getPlantumlPage()` method to `BrowserPool` in `src/pool.ts`, following the excalidraw/drawio pattern if the renderer needs a bundled IIFE, or the mermaid pattern if it loads a script directly
5. **Browser entry** (if needed) — create `src/renderers/plantuml-entry.ts` with a `__renderPlantuml()` global, add it to `vite.config.ts` pack entries
6. **Renderer logic** — register a renderer in `src/render-engines.ts` and ensure `src/renderer.ts` can dispatch to it through the engine registry
7. **Tests** — add extension tests, a fixture file, and e2e test coverage
8. **Docs** — add `docs/guide/diagrams/plantuml/README.md`

The manifest, discovery, output naming, and watch systems all work automatically via the extension map — no changes needed there.

The canonical skill for this task is `.agents/skills/prj-add-diagram-type/SKILL.md`.

## Dependencies

- `playwright` — headless Chromium for mermaid/excalidraw/drawio rendering
- `mermaid` — loaded into browser page for mermaid diagrams
- `chokidar` — file watching
- `@excalidraw/excalidraw` + `react` + `react-dom` — excalidraw rendering (bundled to IIFE at runtime via rolldown)
- `rolldown` — bundles excalidraw/drawio browser entry points as IIFE at runtime
- `json5` — JSON5 config file parsing (comments, trailing commas)
- `@viz-js/viz` — Graphviz rendering engine (WASM-based, used for .dot/.gv/.graphviz files)
- `jiti` — TypeScript config file loading
- `@clack/prompts` — interactive CLI prompts for `diagramkit init`
- `sharp` (optional peer) — SVG-to-raster conversion (PNG/JPEG/WebP/AVIF); dynamically imported, only needed for raster output

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
| `.dot`        | graphviz    |
| `.gv`         | graphviz    |
| `.graphviz`   | graphviz    |

## Runtime compatibility

- **Node 24** (`.node-version`) with npm 11.x
- **engines.node**: `>=24.0.0`
