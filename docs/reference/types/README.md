---
title: Types Reference
description: All public TypeScript types exported by diagramkit.
---

# Types Reference

## Basic Types

### `DiagramType`

```ts
type DiagramType = 'mermaid' | 'excalidraw' | 'drawio' | 'graphviz'
```

### `OutputFormat`

```ts
type OutputFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'avif'
```

### `Theme`

```ts
type Theme = 'light' | 'dark' | 'both'
```

`'both'` produces two output files per diagram.

### `LogLevel`

```ts
type LogLevel =
  | 'silent'
  | 'error'
  | 'errors'
  | 'warn'
  | 'warning'
  | 'warnings'
  | 'info'
  | 'log'
  | 'verbose'
```

### `DiagramkitErrorCode`

```ts
type DiagramkitErrorCode =
  | 'UNKNOWN_TYPE'
  | 'RENDER_FAILED'
  | 'MISSING_DEPENDENCY'
  | 'CONFIG_INVALID'
  | 'BROWSER_LAUNCH_FAILED'
  | 'BUNDLE_FAILED'
```

### `Logger`

```ts
interface Logger {
  log: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

```

### `OutputNamingOptions`

```ts
interface OutputNamingOptions {
  prefix?: string
  suffix?: string
}
```

---

## Configuration

### `DiagramkitConfig`

```ts
interface DiagramkitConfig {
  /** Output folder name. Default: '.diagramkit' */
  outputDir: string

  /** Manifest filename. Default: 'manifest.json' */
  manifestFile: string

  /** Enable incremental builds. Default: true */
  useManifest: boolean

  /** Place outputs next to source (no subfolder). Default: false */
  sameFolder: boolean

  /** Default output formats. Default: ['svg'] */
  defaultFormats: OutputFormat[]

  /** Default theme. Default: 'both' */
  defaultTheme: Theme

  /** Output filename prefix. Default: '' */
  outputPrefix: string

  /** Output filename suffix. Default: '' */
  outputSuffix: string

  /** Custom extension-to-type overrides */
  extensionMap?: Record<string, DiagramType>

  /** Directories to scan for diagram files */
  inputDirs?: string[]

  /** Per-file render overrides (keyed by filename, path, or glob) */
  overrides?: Record<string, FileOverride>
}
```

---

## File Types

### `DiagramFile`

```ts
interface DiagramFile {
  /** Absolute path to source file */
  path: string
  /** Filename without extension */
  name: string
  /** Directory containing the file */
  dir: string
  /** File extension (e.g. .mermaid, .dot) */
  ext: string
}
```

### `RenderableFile`

```ts
interface RenderableFile extends DiagramFile {
  /** SHA-256 content hash (internal) */
  _hash?: string
  /** Effective formats after applying overrides (internal) */
  _effectiveFormats?: OutputFormat[]
  /** Per-output metadata for manifest entries (internal) */
  _outputMeta?: OutputMetadata[]
}
```

### `OutputMetadata`

```ts
interface OutputMetadata {
  /** Output filename */
  file: string
  /** Output format */
  format: OutputFormat
  /** Theme variant */
  theme: 'light' | 'dark'
  /** SVG width in pixels (SVG only) */
  width?: number
  /** SVG height in pixels (SVG only) */
  height?: number
  /** JPEG/WebP/AVIF quality used */
  quality?: number
  /** Raster scale factor used */
  scale?: number
}
```

### `StaleFile`

```ts
type StaleFile = RenderableFile
```

Alias for `RenderableFile`. Returned by `filterStaleFiles()`.

### `StalePlanEntry`

```ts
interface StalePlanEntry {
  path: string
  effectiveFormats: OutputFormat[]
  reasons: StaleReason[]
}
```

### `StaleReasonCode`

```ts
type StaleReasonCode =
  | 'forced'
  | 'manifest_disabled'
  | 'no_manifest_entry'
  | 'theme_changed'
  | 'missing_outputs'
  | 'content_changed'
```

---

## Render Options

### `RenderOptions`

```ts
interface RenderOptions {
  /** Output format. Default: 'svg' */
  format?: OutputFormat
  /** Theme variant(s). Default: 'both' */
  theme?: Theme
  /** JPEG/WebP quality (1-100). Default: 90 */
  quality?: number
  /** Raster scale factor. Default: 2 */
  scale?: number
  /** Dark SVG contrast optimization. Default: true */
  contrastOptimize?: boolean
  /** Custom Mermaid dark theme variables */
  mermaidDarkTheme?: Record<string, string>
  /** Config overrides */
  config?: Partial<DiagramkitConfig>
  /** Browser pool instance for isolated runtimes (advanced) */
  pool?: BrowserPool
}
```

### `RenderResult`

```ts
interface RenderResult {
  /** Light theme output buffer */
  light?: Buffer
  /** Dark theme output buffer */
  dark?: Buffer
  /** Output format used */
  format: OutputFormat
  /** SVG width in pixels (SVG only) */
  width?: number
  /** SVG height in pixels (SVG only) */
  height?: number
}
```

`light` is `undefined` when `theme` is `'dark'`. `dark` is `undefined` when `theme` is `'light'`.

### `RenderAllResult`

```ts
interface RenderAllResult {
  /** Files that were rendered */
  rendered: string[]
  /** Files skipped (cache hit) */
  skipped: string[]
  /** Files that failed */
  failed: string[]
  /** Structured failure details aligned with `failed` */
  failedDetails: RenderFailureDetail[]
  /** Optional batch timing and lane metrics (when includeMetrics is true) */
  metrics?: {
    durationMs: number
    lanesUsed: number
    countsByType: Partial<Record<DiagramType, { rendered: number; failed: number }>>
  }
}
```

### `RenderFailureDetail`

```ts
interface RenderFailureDetail {
  file: string
  message: string
  code: DiagramkitErrorCode
}
```

---

## Batch Options

### `BatchOptions`

Extends `RenderOptions`.

```ts
interface BatchOptions extends RenderOptions {
  /** Root directory to scan. Default: cwd() */
  dir?: string
  /** Force re-render. Default: false */
  force?: boolean
  /** Filter by diagram type */
  type?: DiagramType
  /** Output formats (overrides config). */
  formats?: OutputFormat[]
  /** Custom logger */
  logger?: Logger
  /** Logging verbosity level */
  logLevel?: LogLevel
  /** Show per-file progress logs during batch rendering */
  progress?: boolean
  /** Max number of type lanes running concurrently (1-4). Default: 4. */
  maxConcurrentLanes?: number
  /** Include timing and lane metrics in result */
  includeMetrics?: boolean
}
```

---

## Watch Options

### `WatchOptions`

```ts
interface WatchOptions {
  /** Root directory to watch */
  dir: string
  /** Callback after render */
  onChange?: (file: string) => void
  /** Render options */
  renderOptions?: RenderOptions & { formats?: OutputFormat[] }
  /** Config overrides */
  config?: Partial<DiagramkitConfig>
  /** Explicit config file path (skips local auto-discovery) */
  configFile?: string
  /** Custom logger */
  logger?: Logger
  /** Logging verbosity level */
  logLevel?: LogLevel
  /** Strict config validation mode for watch startup */
  strictConfig?: boolean
  /** Optional browser pool instance for isolated runtimes */
  pool?: import('./pool').BrowserPool
  /** Debounce time for file events. Default: 200ms */
  debounceMs?: number
  /** Chokidar polling mode (useful for network volumes/containers) */
  usePolling?: boolean
  /** Chokidar polling interval in ms when usePolling=true */
  pollingInterval?: number
}
```

---

## Convert Options

### `ConvertOptions`

```ts
interface ConvertOptions {
  /** Target raster format */
  format: 'png' | 'jpeg' | 'webp' | 'avif'
  /** Scale multiplier for SVG rasterization. Default: 2 */
  scale?: number
  /** JPEG/WebP quality (1-100). Default: 90 */
  quality?: number
}
```

---

## Manifest Types

### `Manifest`

```ts
type Manifest = {
  version: 2
  diagrams: Record<string, ManifestEntry>
}
```

### `ManifestEntry`

```ts
type ManifestEntry = {
  hash: string
  generatedAt: string
  outputs: ManifestOutput[]
  formats: OutputFormat[]
  theme?: Theme
}
```

### `ManifestOutput`

```ts
type ManifestOutput = {
  file: string
  format: OutputFormat
  theme: 'light' | 'dark'
  width?: number
  height?: number
  quality?: number
  scale?: number
}
```

### `FileOverride`

```ts
type FileOverride = {
  /** Output formats for this file */
  formats?: OutputFormat[]
  /** Theme variant(s) */
  theme?: Theme
  /** Raster scale factor */
  scale?: number
  /** JPEG/WebP/AVIF quality (1-100) */
  quality?: number
  /** Dark SVG contrast optimization */
  contrastOptimize?: boolean
}
```

---

## Runtime Types

### `RendererRuntime`

```ts
interface RendererRuntime {
  pool: BrowserPool
  render: (source: string, type: DiagramType, options?: RenderOptions) => Promise<RenderResult>
  renderFile: (filePath: string, options?: RenderOptions) => Promise<RenderResult>
  renderDiagramFileToDisk: (file: DiagramFile, options?: RenderOptions & { config?: DiagramkitConfig; outDir?: string; formats?: OutputFormat[] }) => Promise<string[]>
  renderAll: (options?: BatchOptions) => Promise<RenderAllResult>
  watchDiagrams: (options: WatchOptions) => () => Promise<void>
  warmup: () => Promise<void>
  dispose: () => Promise<void>
}
```

Returned by `createRendererRuntime()`. Provides an isolated runtime with its own `BrowserPool`, separate from the default singleton.

### `StaleReason`

```ts
type StaleReason =
  | { code: 'forced' }
  | { code: 'manifest_disabled' }
  | { code: 'no_manifest_entry' }
  | { code: 'theme_changed'; requestedTheme: Theme; manifestTheme?: Theme }
  | { code: 'missing_outputs'; files: string[] }
  | { code: 'content_changed'; previousHash: string; currentHash: string }
```

Discriminated union returned by `planStaleFiles()`. Each variant includes the reason code and relevant data for diagnostics.
