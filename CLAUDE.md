# diagramkit

Standalone diagram rendering CLI & library. Converts `.mermaid`, `.excalidraw`, `.drawio`, and Graphviz `.dot/.gv` files to SVG/PNG/JPEG/WebP/AVIF with light/dark mode support and color contrast optimization.

## Architecture

- **Unified Playwright** — single headless Chromium instance for mermaid, excalidraw, and draw.io
- **Browser pool** — lazy init, reference counting, idle timeout (5s), auto-cleanup
- **4 pages** — mermaid light, mermaid dark (separate because `mermaid.initialize()` is global), excalidraw (handles darkMode per-call), drawio (handles darkMode per-call)
- **Manifest system** — SHA-256 content hashing for incremental rebuilds
- **Output convention** — `.diagramkit/` hidden folder next to source files
- **Extension aliases** — multiple file extensions map to each diagram type (e.g. `.mmd`, `.mmdc` -> mermaid)

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
3. **Engine profile** — add metadata to `ENGINE_PROFILES` in `src/engine-profiles.ts` (for example whether the type requires browser pool access)
4. **Pool page** (if browser-based) — add a `getPlantumlPage()` method to `BrowserPool` in `src/pool.ts`, following the excalidraw/drawio pattern if the renderer needs a bundled IIFE, or the mermaid pattern if it loads a script directly
5. **Browser entry** (if needed) — create `src/renderers/plantuml-entry.ts` with a `__renderPlantuml()` global, add it to `vite.config.ts` pack entries (so the entry file is included in the build output)
6. **Renderer logic** — register a renderer in `src/render-engines.ts` and ensure `src/renderer.ts` can dispatch to it through the engine registry
7. **Tests** — add extension tests, a fixture file, and e2e test coverage
8. **Docs** — add `docs/guide/diagrams/plantuml/README.md`

The manifest, discovery, output naming, and watch systems all work automatically via the extension map — no changes needed there.

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
  copy-llms.mjs        Copies llms.txt and llms-full.txt to gh-pages/ after docs build
  run-pagesmith.mjs    Wrapper for pagesmith CLI (docs dev/build/preview)
schemas/
  diagramkit-cli-render.v1.json  JSON schema for CLI render JSON output (schemaVersion 1)
docs/                 Documentation site content (@pagesmith/docs convention)
  README.md           Home page (DocHome layout)
  meta.json5          Header/footer navigation
  public/
    favicon.svg       Site favicon
  guide/              Guide section (getting-started, design-principles, cli, configuration, image-formats, watch-mode, js-api, api-patterns, diagrams, architecture, ai-agents, ci-cd, troubleshooting)
    architecture/     How diagramkit works under the hood
    ci-cd/            CI/CD integration guide (GitHub Actions, GitLab CI, Docker)
    troubleshooting/  Common issues and solutions
    diagrams/         Per-engine guides (mermaid, excalidraw, drawio, graphviz)
  reference/          Reference section (cli, api, config, types)
gh-pages/             Built docs output (gitignored) — includes copies of llms.txt, llms-full.txt
GUIDELINES.md         Coding conventions
.claude/
  skills/
    review-repo/      Project-level skill (for developing diagramkit itself, not shipped)
      SKILL.md        Full repository review with parallel agent teams
    update-docs/      Project-level skill for updating docs when implementation changes
      SKILL.md        Docs structure, workflow, markdown conventions
    pagesmith/        Pagesmith file-based CMS helper skill
      SKILL.md        Content collections, markdown pipeline, docs configuration
    ps-update-all-docs/ Full-repo documentation regeneration skill
      SKILL.md        Docs structure, skills alignment, AI context updates
pagesmith.config.json5  Docs site configuration (name, outDir, basePath, etc.)
```

## Commands

```bash
diagramkit render <file-or-dir>                # Render diagrams
diagramkit render . --watch                    # Watch mode
diagramkit render docs/arch.mermaid            # Default SVG output
diagramkit render . --format png --theme light # Raster for email/Confluence
diagramkit render . --format svg,png            # Multi-format: SVG + PNG in one pass
diagramkit render . --format webp --quality 85 # WebP output when raster is required
diagramkit render . --output ./build/images    # All outputs to one folder
diagramkit render . --output-dir _renders      # Change default output folder name
diagramkit render . --manifest-file cache.json # Customize manifest filename
diagramkit render . --no-manifest              # Disable manifest tracking
diagramkit render . --same-folder              # Write outputs next to sources
diagramkit render . --output-prefix dk-        # Prefix output names
diagramkit render . --output-suffix -v2        # Suffix output names
diagramkit render . --theme dark               # Dark only
diagramkit render . --force                    # Ignore manifest cache
diagramkit render . --type mermaid             # Filter by type
diagramkit render . --no-contrast              # Skip dark SVG contrast fix
diagramkit render . --scale 3                  # High-res raster
diagramkit render file.mermaid --output ./out  # Custom output dir for a single file
diagramkit render . --dry-run                  # Preview what would render
diagramkit render . --quiet                    # Suppress info output
diagramkit render . --log-level warn           # Logger verbosity override
diagramkit render . --json                     # Machine-readable JSON output
diagramkit render . --config ./custom.json5    # Explicit config file
diagramkit render . --strict-config            # Fail on config warnings
diagramkit render . --max-type-lanes 2         # Limit parallel engine lanes
diagramkit docs/arch.mermaid                   # Path alias for "render"
diagramkit warmup                              # Install Playwright chromium
diagramkit init                                # Create diagramkit.config.json5
diagramkit init --ts                           # Create diagramkit.config.ts
diagramkit init --yes                          # Non-interactive config with defaults
diagramkit doctor                              # Diagnose environment and config
diagramkit --agent-help                        # Output full reference for LLM agents
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
loadConfig(overrides?, dir?, configFile?, options?) // Merged config: defaults → global → env → local → overrides
getDefaultConfig()                          // Get default config values
getFileOverrides(filePath, config?, rootDir?) // Resolve per-file overrides from config
convertSvg(svg, options)                    // SVG to PNG/JPEG/WebP/AVIF via sharp
warmup() / dispose()                        // Browser lifecycle
ENGINE_PROFILES                             // Engine capability metadata (runtime, browserPool, laneOrder)
getEngineProfile(type)                      // Get profile for a specific diagram type
defaultMermaidDarkTheme                     // Built-in mermaid dark theme variable map
DiagramkitError                             // Typed error class with DiagramkitErrorCode
```

**Utilities** (`diagramkit/utils`):

```typescript
findDiagramFiles(dir, config?)              // Recursive file discovery
filterByType(files, type, config?)          // Filter files by diagram type
readManifest(sourceDir, config?)            // Read manifest (v2 format with per-output metadata)
writeManifest(sourceDir, manifest, config?) // Write manifest atomically
updateManifest(files, formats?, config?, theme?) // Update manifest after renders
filterStaleFiles(files, force, formats?, config?, theme?) // Get stale files
planStaleFiles(files, force, formats?, config?, theme?)   // Stale plan with reasons
isStale(file, formats?, config?, theme?, manifest?)       // Check single file staleness
hashFile(filePath)                          // SHA-256 content hash
cleanOrphans(files, config?, roots?)        // Remove orphaned outputs
getDiagramsDir(sourceDir, config?)          // Get output directory path
ensureDiagramsDir(sourceDir, config?)       // Ensure output directory exists
getDiagramType(filename, map?)              // Extension → DiagramType
getExtensionMap(overrides?)                 // Get extension-to-type mapping
getMatchedExtension(filename, map?)         // Get matched extension key
getExtensionsForType(type, map?)            // Extensions for a diagram type
getAllExtensions(map?)                       // All known extensions
stripDiagramExtension(filename, map?)       // Strip diagram extension from filename
atomicWrite(path, content: Buffer)          // Atomic .tmp + rename write
writeRenderResult(name, outDir, result, naming?) // Write render output to disk
getExpectedOutputNames(name, format?, theme?, naming?)      // Expected output filenames
getExpectedOutputNamesMulti(name, formats, theme?, naming?) // Multi-format output names
getOutputFileName(name, variant, format?, naming?)          // Single output filename
getOutputVariants(theme?)                                   // Theme variants array
renderGraphviz(source, options?)            // Graphviz rendering (WASM, no browser)
postProcessDarkSvg(svg)                     // Color contrast fix
```

**Color** (`diagramkit/color`):

```typescript
postProcessDarkSvg(svg) // WCAG contrast optimization for dark SVGs
```

**Convert** (`diagramkit/convert`):

```typescript
convertSvg(svg, options) // SVG to PNG/JPEG/WebP/AVIF via sharp
```

## Coding conventions

- ESM only (exception: `createRequire` for sync config loading), trailing commas, no semicolons
- Async rendering pipeline; browser-backed engines use Playwright and Graphviz uses WASM
- Sync FS for file reading (readFileSync)
- No CLI framework — manual arg parsing
- Comments explain reasoning, not what code does
- Section headers: `/* ── Name ── */`
- Dynamic imports for optional deps (sharp)
- Atomic writes in renderers: .tmp + rename
- Test files: unit tests colocated with source (`src/*.test.ts`), e2e tests in `e2e/`
- Unit tests cover pure logic; e2e tests cover real Playwright rendering across all diagram types

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

## Testing strategy

- **Unit tests** (`src/**/*.test.ts`): Colocated with source files. Test pure logic modules (extensions, config, manifest, output, discovery, color, convert, pool, graphviz, watch, render-engines, renderer, render-all, runtime, logging, cli-bin, engine-profiles, doctor) with real temp directories and mocked FS where needed. No browser required.
- **E2E tests** (`e2e/`): Vitest-integrated tests that run with `npm run test:e2e`. Test real rendering through Playwright for all diagram types, themes, formats, CLI flags, manifest behavior, and incremental rebuilds. Each test creates and cleans up an isolated temp workspace.
- **CI**: E2E on Node 24 (from `.node-version`).
- Run `npm test` for all, `npm run test:unit` for fast feedback, `npm run test:e2e` for e2e.
- **Export policy**: Only export functions needed by other modules or the public API. Never export a function solely for testing — test through the public interface or restructure the code instead.

## Validation before commit

Always run these checks before committing changes:

```bash
npm run check          # Lint and format
npm run typecheck      # Type checking
npm run build          # Build library dist (lib-only, does not include docs)
npm run test:unit      # Unit tests
npm run test:e2e       # E2E rendering tests (Node)
```

To build both the library and documentation site:

```bash
npm run build:all      # lib:build + docs:build
```

Or run everything at once:

```bash
npm run validate    # All checks in sequence (lint + typecheck + lib build + all tests)
```

## LLM files

- **llms.txt** — CLI-focused summary. Points to llms-full.txt for programmatic API.
- **llms-quick.txt** — Ultra-short command-focused cheatsheet.
- **llms-full.txt** — Comprehensive reference covering both CLI and programmatic API, types, config, architecture.
- **`diagramkit --agent-help`** — CLI command that outputs `llms-full.txt` content, intended for LLM agents to consume within skills or tool pipelines.
- When updating the codebase, keep these files in sync with actual behavior.
- No agent skills ship with the npm package — the llms files are the canonical LLM reference.

## Documentation site

The docs site uses `@pagesmith/docs` (convention-based static site builder). Content lives in `docs/` following the folder/README.md convention with `meta.json5` for section ordering.

- **Config:** `pagesmith.config.json5` — site metadata, contentDir (`./docs`), outDir (`./gh-pages`), basePath (`/diagramkit`)
- **Build:** `npm run docs:build` — runs `pagesmith build` then copies `llms.txt` and `llms-full.txt` to `gh-pages/`
- **Dev:** `npm run docs:dev` — local dev server with live reload
- **Preview:** `npm run docs:preview` — preview built site
- **Output:** `gh-pages/` (gitignored) — built HTML + llms files, deployed to GitHub Pages

## Project skills (for developing diagramkit)

These skills are for contributors working on diagramkit itself. They live in `.claude/skills/` and are NOT shipped in the npm package.

- **.claude/skills/review-repo/SKILL.md** — Full repository review with parallel agent teams. Covers code quality, tests, architecture, performance, security, docs, CLAUDE.md alignment, and skills. Use `/review-repo` to run.
- **.claude/skills/update-docs/SKILL.md** — Update documentation when implementation changes. Covers docs structure, workflow, markdown conventions, and key implementation facts. Use `/update-docs` to run.
- **.claude/skills/pagesmith/SKILL.md** — Pagesmith file-based CMS helper. Content collections, markdown pipeline, docs configuration, and AI artifact generation. Use `/pagesmith` to run.
- **.claude/skills/ps-update-all-docs/SKILL.md** — Full-repo documentation regeneration for Pagesmith projects. Docs structure, skills alignment, and AI context updates. Use `/ps-update-all-docs` to run.

<!-- pagesmith-ai:claude-memory:start -->

# Pagesmith

Pagesmith is a filesystem-first content toolkit with two main packages: `@pagesmith/core` (shared content/runtime layer) and `@pagesmith/docs` (convention-based documentation).

Use Pagesmith when you need:

- schema-validated content collections loaded from the filesystem
- lazy markdown rendering with headings and read-time metadata
- framework-agnostic content APIs for React, Solid, Svelte, vanilla JS, Node, Bun, or Deno

Core APIs:

- `defineCollection({...})` to define a typed collection
- `defineConfig({...})` to group collections and markdown options
- `createContentLayer(config)` to query content and run validation
- `entry.render()` to convert markdown on demand

Working rules:

- prefer folder-based markdown entries when content references sibling assets
- follow the markdown guidelines in `.pagesmith/markdown-guidelines.md` when authoring content
- use fenced code blocks with a language identifier, one h1 per page, sequential heading depth

Docs-specific rules:

- `@pagesmith/docs` is convention-based and builds a static docs site from `<contentDir>` plus `pagesmith.config.json5`
- top-level content folders become top navigation sections (for example `guide/`, `reference/`, `packages/`)
- folder-based markdown entries should prefer `README.md` or `index.md` when a page owns sibling assets
- the home page is `<contentDir>/README.md`; optional home-specific data can live in `<contentDir>/home.json5`
- sidebar labels, nav labels, and ordering live in frontmatter (`sidebarLabel`, `navLabel`, `order`)
- footer links live in `pagesmith.config.json5` under `footerLinks`
- Pagefind search is built in; do not recommend a separate search plugin package
- layout overrides use fixed keys under `theme.layouts` such as `home`, `page`, and `notFound`
- for MCP-compatible tooling, prefer `pagesmith mcp --stdio` from `@pagesmith/docs`

If the pagesmith skill is installed, prefer invoking it when the user explicitly asks for Pagesmith-specific help.

For package usage rules and full API/config details, read the package-shipped docs from node_modules:

- `node_modules/@pagesmith/docs/docs/agents/usage.md` — docs package usage contract
- `node_modules/@pagesmith/docs/REFERENCE.md` — docs config, CLI, content structure, layout overrides
- `node_modules/@pagesmith/core/docs/agents/usage.md` — core package usage contract
- `node_modules/@pagesmith/core/REFERENCE.md` — core API, collections, loaders, markdown, CSS, JSX runtime

## Quick Start — @pagesmith/core

```ts
import { createContentLayer, defineCollection, defineConfig, z } from '@pagesmith/core'

const posts = defineCollection({
  loader: 'markdown',
  directory: 'content/posts',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
})

const layer = createContentLayer(
  defineConfig({
    collections: { posts },
  }),
)

const entries = await layer.getCollection('posts')
const rendered = await entries[0]?.render()
```

## Quick Start — @pagesmith/docs

```json5
// pagesmith.config.json5
{
  name: 'Acme Docs',
  title: 'Acme Docs',
  description: 'Multi-package documentation',
  contentDir: './content',
  outDir: './dist',
  footerLinks: [
    { label: 'Guide', path: '/guide' },
    { label: 'Reference', path: '/reference' },
  ],
  search: { enabled: true },
}
```

```text
content/
  README.md                 # Home page (DocHome layout)
  guide/
    meta.json5              # Section ordering
    getting-started/
      README.md             # A page
  reference/
    api/README.md
```

<!-- pagesmith-ai:claude-memory:end -->
