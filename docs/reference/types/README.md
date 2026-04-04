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

### `StaleFile`

```ts
type StaleFile = DiagramFile & {
  /** SHA-256 content hash (internal) */
  _hash?: string
  /** Effective formats after applying overrides (internal) */
  _effectiveFormats?: OutputFormat[]
}
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
  logger?: { log: (...args: any[]) => void; warn: (...args: any[]) => void }
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
  renderOptions?: RenderOptions
  /** Config overrides */
  config?: Partial<DiagramkitConfig>
  /** Custom logger */
  logger?: { log: (...args: any[]) => void; warn: (...args: any[]) => void }
}
```

---

## Convert Options

### `ConvertOptions`

```ts
interface ConvertOptions {
  /** Target raster format */
  format: 'png' | 'jpeg' | 'webp' | 'avif'
  /** Scale multiplier (x72 DPI). Default: 2 */
  density?: number
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
  theme: Theme
  width?: number
  height?: number
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
