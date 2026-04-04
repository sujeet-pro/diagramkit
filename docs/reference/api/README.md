---
title: API Reference
description: Complete function reference for all public exports from diagramkit.
---

# API Reference

## Core Rendering

### `render(source, type, options?)`

Render a diagram from a source string.

```ts
function render(
  source: string,
  type: DiagramType,
  options?: RenderOptions,
): Promise<RenderResult>
```

| Parameter | Type | Required | Description |
|:----------|:-----|:---------|:------------|
| `source` | `string` | Yes | Diagram source content |
| `type` | `DiagramType` | Yes | Engine to use |
| `options` | [`RenderOptions`](/reference/types#renderoptions) | No | Rendering config |

**Behavior:** Acquires the browser pool for browser-backed engines. For `theme: 'both'`, renders both variants. Applies `postProcessDarkSvg()` to Mermaid dark SVGs when `contrastOptimize` is `true`. Converts to raster via sharp for non-SVG formats.

---

### `renderFile(filePath, options?)`

Render a file from disk. Type inferred from extension.

```ts
function renderFile(
  filePath: string,
  options?: RenderOptions,
): Promise<RenderResult>
```

---

### `renderAll(options?)`

Batch render all diagrams in a directory tree. Writes to `.diagramkit/` folders.

```ts
function renderAll(options?: BatchOptions): Promise<RenderAllResult>
```

Returns `{ rendered, skipped, failed }` arrays of file paths.

**Steps:** discover files, filter by type, check manifest, render stale files, update manifest, clean orphans.

---

### `renderDiagramFileToDisk(file, options?)`

Render a single file and write output to disk. Returns written filenames.

```ts
function renderDiagramFileToDisk(
  file: DiagramFile,
  options?: RenderOptions & { config?: DiagramkitConfig; outDir?: string },
): Promise<string[]>
```

---

### `watchDiagrams(options)`

Watch for changes and re-render. Returns cleanup function.

```ts
function watchDiagrams(options: WatchOptions): () => Promise<void>
```

**Watched:** `**/*.mermaid`, `**/*.mmd`, `**/*.mmdc`, `**/*.excalidraw`, `**/*.drawio`, `**/*.drawio.xml`, `**/*.dio`, `**/*.dot`, `**/*.gv`, `**/*.graphviz`

---

## Browser Lifecycle

### `warmup()`

```ts
function warmup(): Promise<void>
```

Pre-warm the browser pool. Optional -- launches automatically on first render.

### `dispose()`

```ts
function dispose(): Promise<void>
```

Close browser pool and release resources. Safe to call multiple times.

---

## File Discovery

### `findDiagramFiles(dir, config?)`

```ts
function findDiagramFiles(
  dir: string,
  config?: Partial<DiagramkitConfig>,
): DiagramFile[]
```

Recursively find all diagram files. Skips hidden dirs and `node_modules`.

### `filterByType(files, type, config?)`

```ts
function filterByType(
  files: DiagramFile[],
  type: DiagramType,
  config?: Partial<DiagramkitConfig>,
): DiagramFile[]
```

---

## Manifest

### `filterStaleFiles(files, force, format?, config?, theme?)`

```ts
function filterStaleFiles(
  files: DiagramFile[],
  force: boolean,
  format?: OutputFormat,
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
): StaleFile[]
```

Filter to files needing re-render. Caches manifests per directory.

### `isStale(file, format?, config?, theme?, manifest?)`

```ts
function isStale(
  file: DiagramFile,
  format?: OutputFormat,
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
  manifest?: Manifest,
): boolean
```

Returns `true` if: no manifest entry, hash changed, format changed, outputs missing, or manifest disabled.

### `readManifest(sourceDir, config?)`

```ts
function readManifest(
  sourceDir: string,
  config?: Partial<DiagramkitConfig>,
): Manifest
```

### `getDiagramsDir(sourceDir, config?)`

```ts
function getDiagramsDir(sourceDir: string, config?: Partial<DiagramkitConfig>): string
```

### `ensureDiagramsDir(sourceDir, config?)`

```ts
function ensureDiagramsDir(sourceDir: string, config?: Partial<DiagramkitConfig>): string
```

Like `getDiagramsDir` but creates the directory if missing.

---

## Extension Utilities

### `getExtensionMap(overrides?)`

```ts
function getExtensionMap(overrides?: Record<string, DiagramType>): Record<string, DiagramType>
```

### `getDiagramType(filename, map?)`

```ts
function getDiagramType(filename: string, map?: Record<string, DiagramType>): DiagramType | null
```

Longest-match-first resolution.

### `getMatchedExtension(filename, map?)`

```ts
function getMatchedExtension(filename: string, map?: Record<string, DiagramType>): string | null
```

### `getAllExtensions(map?)`

```ts
function getAllExtensions(map?: Record<string, DiagramType>): string[]
```

### `getExtensionsForType(type, map?)`

```ts
function getExtensionsForType(type: DiagramType, map?: Record<string, DiagramType>): string[]
```

### `stripDiagramExtension(filename, map?)`

```ts
function stripDiagramExtension(filename: string, map?: Record<string, DiagramType>): string
```

---

## Configuration

### `getDefaultConfig()`

```ts
function getDefaultConfig(): DiagramkitConfig
```

### `loadConfig(overrides?, dir?, configFile?)`

```ts
function loadConfig(
  overrides?: Partial<DiagramkitConfig>,
  dir?: string,
  configFile?: string,
): DiagramkitConfig
```

Merge order: defaults, global, env vars, local (or explicit `configFile`), overrides.

### `getFileOverrides(filePath, config?, rootDir?)`

```ts
function getFileOverrides(
  filePath: string,
  config?: Partial<DiagramkitConfig>,
  rootDir?: string,
): FileOverride | undefined
```

Resolve per-file overrides from the `overrides` config. Matches against exact filenames, relative paths, and glob patterns. Returns the merged override for the file, or `undefined` if no overrides match.

### `defaultMermaidDarkTheme`

```ts
const defaultMermaidDarkTheme: Record<string, string>
```

---

## SVG-to-Raster Conversion

### `convertSvg(svg, options)`

```ts
function convertSvg(
  svg: Buffer | string,
  options: ConvertOptions,
): Promise<Buffer>
```

Also available from `diagramkit/convert`.

---

## Color Utilities

### `postProcessDarkSvg(svg)`

```ts
function postProcessDarkSvg(svg: string): string
```

WCAG contrast optimization for dark SVGs. Exported from both `diagramkit` and `diagramkit/color`.

---

## Output Utilities

### `atomicWrite(path, content)`

```ts
function atomicWrite(path: string, content: Buffer): void
```

Write via `.tmp` + rename to prevent partial files.

---

## Subpath Exports

| Import | Content |
|:-------|:--------|
| `diagramkit` | Main API |
| `diagramkit/utils` | Discovery, manifest, extensions, output, color |
| `diagramkit/color` | Color utilities |
| `diagramkit/convert` | SVG-to-raster conversion |
