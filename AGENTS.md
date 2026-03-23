# diagramkit

Standalone diagram rendering CLI & library. Converts `.mermaid`, `.excalidraw`, and `.drawio` files to SVG/PNG/JPEG/WebP with light/dark mode support and color contrast optimization.

## Architecture

- **Unified Playwright** — single headless Chromium instance for mermaid, excalidraw, and draw.io
- **Browser pool** — lazy init, reference counting, idle timeout (5s), auto-cleanup
- **4 pages** — mermaid light, mermaid dark (separate because `mermaid.initialize()` is global), excalidraw (handles darkMode per-call), drawio (handles darkMode per-call)
- **Manifest system** — SHA-256 content hashing for incremental rebuilds
- **Output convention** — `.diagrams/` hidden folder next to source files
- **Extension aliases** — multiple file extensions map to each diagram type (e.g. `.mmd`, `.mmdc` -> mermaid)

## Types

```typescript
type DiagramType = 'mermaid' | 'excalidraw' | 'drawio'
type OutputFormat = 'svg' | 'png' | 'jpeg' | 'webp'
type Theme = 'light' | 'dark' | 'both'
```

## Directory structure

```
cli/
  bin.ts              CLI entry point
src/
  index.ts            Public API barrel
  types.ts            All public types
  pool.ts             BrowserPool (Playwright lifecycle)
  renderer.ts         render(), renderFile(), renderAll()
  discovery.ts        Find .mermaid/.excalidraw/.drawio files
  manifest.ts         SHA-256 hashing, staleness, orphan cleanup
  watch.ts            chokidar file watching
  config.ts           Configuration loading (defaults, global, local, overrides)
  convert.ts          SVG-to-raster conversion via sharp
  extensions.ts       Extension-to-DiagramType mapping and aliases
  renderers/
    index.ts          createRenderers() factory
    mermaid.ts        Direct Playwright mermaid rendering
    excalidraw.ts     Playwright + rolldown IIFE excalidraw rendering
    excalidraw-entry.ts  Browser IIFE for excalidraw exportToSvg
    drawio.ts         Playwright draw.io XML-to-SVG rendering
    drawio-entry.ts   Browser IIFE for draw.io mxGraphModel parsing
  color/
    index.ts          Color utility barrel
    convert.ts        hex/rgb/hsl conversions
    luminance.ts      WCAG relative luminance
    contrast.ts       postProcessDarkSvg() — fix dark mode contrast
  __tests__/
    manifest.test.ts  Manifest unit tests
    color.test.ts     Color utility unit tests
docs/                 Documentation
skills/
  Codex/
    diagramkit.md     LLM skill for diagram generation and rendering
```

## Commands

```bash
diagramkit render <file-or-dir>                # Render diagrams
diagramkit render . --watch                    # Watch mode
diagramkit render . --format png               # PNG output
diagramkit render . --format webp --quality 85 # WebP output
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

- ESM only, trailing commas
- Async for all rendering (Playwright-based)
- Sync FS for file reading (readFileSync)
- No CLI framework — manual arg parsing
- Comments explain reasoning, not what code does
- Section headers: `/* -- Name -- */`
- Dynamic imports for optional deps (sharp, excalidraw)
- Atomic writes in renderers: .tmp + rename

## Dependencies

- `playwright` (peer) — headless Chromium
- `mermaid` (peer) — loaded into browser page
- `chokidar` — file watching
- `sharp` (optional) — SVG-to-raster conversion (PNG/JPEG/WebP)
- `@excalidraw/excalidraw` + `react` + `react-dom` (optional peers) — for .excalidraw files
- `rolldown` (dev) — bundles excalidraw/drawio browser entry points as IIFE

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

## Codex skills

- **skills/Codex/diagramkit.md** — Diagram generation and rendering skill. Covers CLI usage, output conventions, markdown linking patterns (`<picture>` for light/dark), mermaid/excalidraw authoring tips, format/theme options, and dark mode contrast behavior.
