# API Reference

Complete reference for all public functions exported by `diagramkit`.

## Core Rendering

### `render(source, type, options?)`

Render a diagram from a source string.

```typescript
function render(
  source: string,
  type: DiagramType,
  options?: RenderOptions,
): Promise<RenderResult>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `source` | `string` | Yes | Diagram source (Mermaid syntax, Excalidraw JSON, or Draw.io XML) |
| `type` | `'mermaid' \| 'excalidraw' \| 'drawio'` | Yes | Diagram engine to use |
| `options` | [`RenderOptions`](/reference/types#renderoptions) | No | Rendering configuration |

**Returns:** `Promise<RenderResult>` -- see [`RenderResult`](/reference/types#renderresult)

**Behavior:**
- Acquires the browser pool (launches Chromium if needed)
- For `theme: 'both'`, renders both variants in sequence
- For Mermaid, uses separate light/dark pages (due to global `mermaid.initialize()`)
- For Excalidraw and Draw.io, uses a single page with per-call dark mode flag
- Applies `postProcessDarkSvg()` to Mermaid dark SVGs when `contrastOptimize` is `true`
- For raster formats, converts the SVG to raster using sharp with the requested density and quality settings

---

### `renderFile(filePath, options?)`

Render a diagram file from disk. Diagram type is inferred from the file extension.

```typescript
function renderFile(
  filePath: string,
  options?: RenderOptions,
): Promise<RenderResult>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | `string` | Yes | Absolute path to a diagram file |
| `options` | [`RenderOptions`](/reference/types#renderoptions) | No | Rendering configuration |

**Returns:** `Promise<RenderResult>`

**Extension mapping:** Uses the [built-in extension map](/guide/configuration#extensionmap), merged with any `options.config.extensionMap` overrides, to determine the diagram type. File is read synchronously with `readFileSync`.

---

### `renderAll(options?)`

Render all diagrams in a directory tree. Writes output to `.diagrams/` folders.

```typescript
function renderAll(options?: BatchOptions): Promise<RenderAllResult>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | [`BatchOptions`](/reference/types#batchoptions) | No | Batch configuration |

**Returns:** `Promise<RenderAllResult>` -- see [`RenderAllResult`](/reference/types#renderallresult)

```typescript
interface RenderAllResult {
  /** Files that were successfully rendered */
  rendered: string[]
  /** Files that were skipped (up-to-date) */
  skipped: string[]
  /** Files that failed to render */
  failed: string[]
}
```

**Behavior:**
1. Discovers all diagram files with `findDiagramFiles()`
2. Optionally filters by `type`
3. Checks manifest for staleness (unless `force: true`)
4. Renders stale files via `renderDiagramFileToDisk()` (grouped by diagram type for concurrency)
5. Updates manifest
6. Cleans orphaned outputs

---

### `watchDiagrams(options)`

Watch for diagram file changes and re-render on change or addition.

```typescript
function watchDiagrams(options: WatchOptions): () => Promise<void>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | [`WatchOptions`](/reference/types#watchoptions) | Yes | Watch configuration |

**Returns:** `() => Promise<void>` -- call this function to stop watching

**Watched patterns:** `**/*.mermaid`, `**/*.mmd`, `**/*.mmdc`, `**/*.excalidraw`, `**/*.drawio`, `**/*.drawio.xml`, `**/*.dio`

**Ignored:** `node_modules`, configured output directory (e.g. `.diagrams`), `dist`

---

## Browser Lifecycle

### `warmup()`

Pre-warm the browser pool by launching Chromium.

```typescript
function warmup(): Promise<void>
```

Acquires and immediately releases the pool. The browser stays alive due to the 5-second idle timeout, ready for subsequent render calls.

---

### `dispose()`

Explicitly close the browser pool and release all resources.

```typescript
function dispose(): Promise<void>
```

Cancels any idle timeout and closes the Chromium instance. Safe to call multiple times.

---

## File Discovery

### `findDiagramFiles(dir, config?)`

Recursively find all diagram source files under a directory.

```typescript
function findDiagramFiles(
  dir: string,
  config?: Partial<DiagramkitConfig>,
): DiagramFile[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dir` | `string` | Yes | Root directory to scan |
| `config` | `Partial<DiagramkitConfig>` | No | Config with optional `extensionMap` overrides |

**Returns:** `DiagramFile[]`

**Skips:** Hidden directories (starting with `.`), `node_modules`.

---

### `filterByType(files, type, config?)`

Filter diagram files to a specific diagram type.

```typescript
function filterByType(
  files: DiagramFile[],
  type: DiagramType,
  config?: Partial<DiagramkitConfig>,
): DiagramFile[]
```

---

## Manifest

### `filterStaleFiles(files, force, format?, config?, theme?)`

Filter diagram files to only those that need re-rendering. Caches manifests per directory.

```typescript
function filterStaleFiles(
  files: DiagramFile[],
  force: boolean,
  format?: OutputFormat,
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
): StaleFile[]
```

Returns files that are stale due to: content change, format/theme change, missing outputs, or disabled manifest. When `force` is `true`, all files are returned.

### `isStale(file, format?, config?, theme?, manifest?)`

Check if a diagram file needs re-rendering.

```typescript
function isStale(
  file: DiagramFile,
  format?: OutputFormat,
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
  manifest?: Manifest,
): boolean
```

Returns `true` if:
- Manifest is disabled (`useManifest: false`)
- No manifest entry exists for the file
- Content hash has changed
- Output format has changed
- Any expected output file is missing

---

### `readManifest(sourceDir, config?)`

Read the manifest from a source directory's output folder.

```typescript
function readManifest(
  sourceDir: string,
  config?: Partial<DiagramkitConfig>,
): Manifest
```

Returns `{ version: 1, diagrams: {} }` if no manifest exists. Supports migration from the old `manifest.json` filename.

---

### `getDiagramsDir(sourceDir, config?)`

Get the output directory path for a given source directory.

```typescript
function getDiagramsDir(
  sourceDir: string,
  config?: Partial<DiagramkitConfig>,
): string
```

Returns `sourceDir` when `sameFolder` is `true`, otherwise `sourceDir/outputDir`.

---

### `ensureDiagramsDir(sourceDir, config?)`

Like `getDiagramsDir`, but creates the directory if it does not exist.

```typescript
function ensureDiagramsDir(
  sourceDir: string,
  config?: Partial<DiagramkitConfig>,
): string
```

---

### `renderDiagramFileToDisk(file, options?)`

Render a single diagram file and write output to disk. Returns the list of written filenames. Useful for custom watch implementations.

```typescript
function renderDiagramFileToDisk(
  file: DiagramFile,
  options?: RenderOptions & { config?: DiagramkitConfig; outDir?: string },
): Promise<string[]>
```

---

### `getExtensionMap(overrides?)`

Get the full extension-to-type mapping, merged with optional overrides.

```typescript
function getExtensionMap(
  overrides?: Record<string, DiagramType>,
): Record<string, DiagramType>
```

---

### `getDiagramType(filename, map?)`

Resolve the diagram type from a filename using longest-match-first resolution.

```typescript
function getDiagramType(
  filename: string,
  map?: Record<string, DiagramType>,
): DiagramType | null
```

---

### `getMatchedExtension(filename, map?)`

Get the matched extension string from a filename.

```typescript
function getMatchedExtension(
  filename: string,
  map?: Record<string, DiagramType>,
): string | null
```

---

### `getAllExtensions(map?)`

Return all known diagram file extensions.

```typescript
function getAllExtensions(
  map?: Record<string, DiagramType>,
): string[]
```

---

### `getExtensionsForType(type, map?)`

Return all extensions that map to a given diagram type.

```typescript
function getExtensionsForType(
  type: DiagramType,
  map?: Record<string, DiagramType>,
): string[]
```

---

### `stripDiagramExtension(filename, map?)`

Strip the diagram extension from a filename, returning the base name.

```typescript
function stripDiagramExtension(
  filename: string,
  map?: Record<string, DiagramType>,
): string
```

---

### `getDefaultConfig()`

Return the default configuration values.

```typescript
function getDefaultConfig(): DiagramkitConfig
```

---

### `defaultMermaidDarkTheme`

The default Mermaid dark theme variables object used for dark mode rendering.

```typescript
const defaultMermaidDarkTheme: Record<string, string>
```

---

## Color Utilities

### `postProcessDarkSvg(svg)`

Apply WCAG contrast optimization to a dark-mode SVG.

```typescript
function postProcessDarkSvg(svg: string): string
```

Finds inline `fill:#hex` values with relative luminance > 0.4 and darkens them (lightness set to 0.25, saturation capped at 0.6) while preserving hue.

Exported from both `diagramkit` and `diagramkit/color`.

---

## Output Utilities

### `atomicWrite(path, content)`

Write a file atomically by writing to a `.tmp` file first, then renaming. Prevents partial files from being served by dev servers or committed by watchers.

```typescript
function atomicWrite(path: string, content: Buffer): void
```

---

## Subpath Exports

diagramkit provides three package exports:

| Import path | Content |
|-------------|---------|
| `diagramkit` | Main API (rendering, discovery, manifest, color) |
| `diagramkit/color` | Color utilities only (`postProcessDarkSvg`, `hexToRgb`, `rgbToHsl`, `hslToHex`, `relativeLuminance`) |
| `diagramkit/convert` | SVG-to-raster conversion (`convertSvg`) |
