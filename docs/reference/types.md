# Types Reference

All public TypeScript types exported by `diagramkit`.

## Basic Types

### `DiagramType`

```typescript
type DiagramType = 'mermaid' | 'excalidraw' | 'drawio'
```

Identifies which rendering engine to use.

---

### `OutputFormat`

```typescript
type OutputFormat = 'svg' | 'png' | 'jpeg' | 'webp'
```

Supported output image formats.

---

### `Theme`

```typescript
type Theme = 'light' | 'dark' | 'both'
```

Which theme variant(s) to render. `'both'` produces two output files per diagram.

---

## Configuration

### `DiagramkitConfig`

Full configuration object. See [Configuration Reference](/reference/config) for details on each field.

```typescript
interface DiagramkitConfig {
  /** Output folder name, created next to source files. Default: '.diagrams' */
  outputDir: string

  /** Manifest filename inside the output folder. Default: 'diagrams.manifest.json' */
  manifestFile: string

  /** Whether to use manifest for incremental builds. Default: true */
  useManifest: boolean

  /** Place outputs in same folder as source (no subfolder). Default: false */
  sameFolder: boolean

  /** Default output format. Default: 'svg' */
  defaultFormat: OutputFormat

  /** Default theme. Default: 'both' */
  defaultTheme: Theme

  /** Custom extension-to-type mapping overrides (merged with built-in map) */
  extensionMap?: Record<string, DiagramType>
}
```

---

## File Types

### `DiagramFile`

Represents a discovered diagram source file.

```typescript
interface DiagramFile {
  /** Absolute path to source file */
  path: string

  /** Filename without extension */
  name: string

  /** Directory containing the file */
  dir: string

  /** File extension (e.g. .mermaid, .mmd, .excalidraw, .drawio) */
  ext: string
}
```

**Example value:**

```typescript
{
  path: '/project/docs/flow.mermaid',
  name: 'flow',
  dir: '/project/docs',
  ext: '.mermaid',
}
```

---

### `StaleFile`

A `DiagramFile` that has been identified as needing re-rendering. Returned by `filterStaleFiles()`. Extends `DiagramFile` with an internal content hash used by the manifest system.

```typescript
type StaleFile = DiagramFile & {
  /** SHA-256 content hash of the source file */
  _hash?: string
}
```

| Field | Type | Description |
|-------|------|-------------|
| *(inherited)* | | All fields from `DiagramFile` |
| `_hash` | `string \| undefined` | SHA-256 content hash, used internally by the manifest. Optional — only present when the hash was computed during the staleness check. |

---

## Render Options

### `RenderOptions`

Options for the `render()` and `renderFile()` functions.

```typescript
interface RenderOptions {
  /** Output format. Default: 'svg' */
  format?: OutputFormat

  /** Theme variant(s) to render. Default: 'both' */
  theme?: Theme

  /** JPEG/WebP quality (1-100). Default: 90 */
  quality?: number

  /** Scale factor for raster output (PNG/JPEG/WebP). Default: 2 */
  scale?: number

  /** Apply dark SVG color contrast optimization. Default: true */
  contrastOptimize?: boolean

  /** Custom dark theme variables for mermaid. Uses built-in palette if omitted. */
  mermaidDarkTheme?: Record<string, string>

  /** Configuration overrides for this render call */
  config?: Partial<DiagramkitConfig>
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | `OutputFormat` | `'svg'` | Output image format |
| `theme` | `Theme` | `'both'` | Theme variant(s) |
| `quality` | `number` | `90` | JPEG/WebP quality (1-100) |
| `scale` | `number` | `2` | Raster scale factor |
| `contrastOptimize` | `boolean` | `true` | WCAG contrast fix for dark SVGs |
| `mermaidDarkTheme` | `Record<string, string>` | built-in | Custom Mermaid dark theme variables |
| `config` | `Partial<DiagramkitConfig>` | -- | Config overrides |

---

### `RenderResult`

Returned by `render()` and `renderFile()`.

```typescript
interface RenderResult {
  /** Light theme output (SVG string as Buffer, or raster binary) */
  light?: Buffer

  /** Dark theme output */
  dark?: Buffer

  /** The output format used */
  format: OutputFormat

  /** SVG width in pixels (available for SVG output) */
  width?: number

  /** SVG height in pixels (available for SVG output) */
  height?: number
}
```

| Field | Type | Description |
|-------|------|-------------|
| `light` | `Buffer \| undefined` | Light theme image data. `undefined` if `theme` is `'dark'`. |
| `dark` | `Buffer \| undefined` | Dark theme image data. `undefined` if `theme` is `'light'`. |
| `format` | `OutputFormat` | The format that was used |
| `width` | `number \| undefined` | SVG pixel width (SVG output only) |
| `height` | `number \| undefined` | SVG pixel height (SVG output only) |

---

### `RenderAllResult`

Returned by `renderAll()`.

```typescript
interface RenderAllResult {
  /** Files that were rendered */
  rendered: string[]

  /** Files skipped (unchanged, manifest cache hit) */
  skipped: string[]

  /** Files that failed to render */
  failed: string[]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `rendered` | `string[]` | File paths that were rendered |
| `skipped` | `string[]` | File paths skipped due to manifest cache hit |
| `failed` | `string[]` | File paths that failed to render |

---

## Batch Options

### `BatchOptions`

Options for `renderAll()`. Extends `RenderOptions`.

```typescript
interface BatchOptions extends RenderOptions {
  /** Root directory to scan. Default: cwd() */
  dir?: string

  /** Force re-render, ignoring manifest. Default: false */
  force?: boolean

  /** Filter to specific diagram type */
  type?: DiagramType

  /** Optional logger for library consumers to control output */
  logger?: { log: (...args: any[]) => void; warn: (...args: any[]) => void }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dir` | `string` | `process.cwd()` | Root directory to scan |
| `force` | `boolean` | `false` | Ignore manifest, re-render everything |
| `type` | `DiagramType` | all types | Filter to a specific engine |
| `logger` | `{ log, warn }` | `console` | Custom logger for controlling output |
| *(inherited)* | | | All fields from `RenderOptions` |

---

## Watch Options

### `WatchOptions`

Options for `watchDiagrams()`.

```typescript
interface WatchOptions {
  /** Root directory to watch */
  dir: string

  /** Callback after a diagram is rendered */
  onChange?: (file: string) => void

  /** Render options for watched files */
  renderOptions?: RenderOptions

  /** Configuration overrides */
  config?: Partial<DiagramkitConfig>

  /** Optional logger for library consumers to control output */
  logger?: { log: (...args: any[]) => void; warn: (...args: any[]) => void }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dir` | `string` | Yes | Root directory to watch |
| `onChange` | `(file: string) => void` | No | Called with the file path after each re-render |
| `renderOptions` | `RenderOptions` | No | Options passed to the renderer |
| `config` | `Partial<DiagramkitConfig>` | No | Config overrides |
| `logger` | `{ log, warn }` | No | Custom logger for controlling output |

---

## Convert Options

### `ConvertOptions`

Options for the `convertSvg()` function (standalone SVG-to-raster conversion).

```typescript
interface ConvertOptions {
  /** Output raster format */
  format: 'png' | 'jpeg' | 'webp'

  /** Scale multiplier for SVG rasterization density. Default: 2 */
  density?: number

  /** JPEG/WebP quality (1-100). Default: 90 */
  quality?: number
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | `'png' \| 'jpeg' \| 'webp'` | required | Target raster format |
| `density` | `number` | `2` | Scale multiplier (multiplied by 72 DPI internally) |
| `quality` | `number` | `90` | JPEG/WebP compression quality |

---

## Manifest Types

### `Manifest`

The full manifest structure.

```typescript
type Manifest = {
  version: 1
  diagrams: Record<string, ManifestEntry>
}
```

---

### `ManifestEntry`

A single entry in the manifest, keyed by source filename.

```typescript
type ManifestEntry = {
  hash: string
  generatedAt: string
  outputs: string[]
  format?: OutputFormat
  theme?: Theme
}
```

| Field | Type | Description |
|-------|------|-------------|
| `hash` | `string` | SHA-256 content hash, e.g. `'sha256:a1b2c3d4e5f67890'` |
| `generatedAt` | `string` | ISO 8601 timestamp |
| `outputs` | `string[]` | Output filenames, e.g. `['flow-light.svg', 'flow-dark.svg']` |
| `format` | `OutputFormat` | Output format used for this render |
| `theme` | `Theme` | Theme variant used for this render |

