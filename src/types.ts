/* ── Diagram types ── */

export type DiagramType = 'mermaid' | 'excalidraw' | 'drawio' | 'graphviz'
export type OutputFormat = 'svg' | 'png' | 'jpeg' | 'webp' | 'avif'
export type Theme = 'light' | 'dark' | 'both'
export type LogLevel =
  | 'silent'
  | 'error'
  | 'errors'
  | 'warn'
  | 'warning'
  | 'warnings'
  | 'info'
  | 'log'
  | 'verbose'

/* ── Errors ── */

export type DiagramkitErrorCode =
  | 'UNKNOWN_TYPE'
  | 'RENDER_FAILED'
  | 'MISSING_DEPENDENCY'
  | 'CONFIG_INVALID'
  | 'BROWSER_LAUNCH_FAILED'
  | 'BUNDLE_FAILED'

export class DiagramkitError extends Error {
  readonly code: DiagramkitErrorCode
  constructor(code: DiagramkitErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DiagramkitError'
    this.code = code
  }
}

/* ── Logger ── */

export interface Logger {
  log: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

/* ── Output naming ── */

export interface OutputNamingOptions {
  prefix?: string
  suffix?: string
}

/* ── Configuration ── */

/** Per-file render overrides */
export interface FileOverride {
  /** Output formats for this file */
  formats?: OutputFormat[]
  /** Theme for this file */
  theme?: Theme
  /** JPEG/WebP/AVIF quality for this file */
  quality?: number
  /** Scale factor for raster output for this file */
  scale?: number
  /** Disable dark SVG contrast optimization for this file */
  contrastOptimize?: boolean
}

export interface DiagramkitConfig {
  /** Output folder name, created next to source files. Default: '.diagramkit' */
  outputDir: string
  /** Manifest filename inside the output folder. Default: 'manifest.json' */
  manifestFile: string
  /** Whether to use manifest for incremental builds. Default: true */
  useManifest: boolean
  /** Place outputs in same folder as source (no subfolder). Default: false */
  sameFolder: boolean
  /** Default output formats. Default: ['svg'] */
  defaultFormats: OutputFormat[]
  /** Default theme. Default: 'both' */
  defaultTheme: Theme
  /** Prefix prepended to output filenames (before the diagram name). Default: '' */
  outputPrefix: string
  /** Suffix appended to output filenames (after the diagram name, before theme). Default: '' */
  outputSuffix: string
  /** Custom extension-to-type mapping overrides (merged with built-in map) */
  extensionMap?: Record<string, DiagramType>
  /** Restrict scanning to these directories (relative to project root). Default: scan entire tree */
  inputDirs?: string[]
  /** Per-file render overrides keyed by filename or glob pattern */
  overrides?: Record<string, FileOverride>
}

/* ── File types ── */

export interface DiagramFile {
  /** Absolute path to source file */
  path: string
  /** Filename without extension */
  name: string
  /** Directory containing the file */
  dir: string
  /** File extension (e.g. .mermaid, .mmd, .excalidraw, .drawio, .dot, .gv) */
  ext: string
}

/** Internal file metadata attached during batch rendering */
export interface RenderableFile extends DiagramFile {
  _hash?: string
  _effectiveFormats?: OutputFormat[]
  _outputMeta?: OutputMetadata[]
}

/** Per-output metadata for manifest entries */
export interface OutputMetadata {
  file: string
  format: OutputFormat
  theme: 'light' | 'dark'
  width?: number
  height?: number
  quality?: number
  scale?: number
}

/* ── Render options ── */

export interface RenderOptions {
  /** Output format (single format for low-level render API). Default: 'svg' */
  format?: OutputFormat
  /** Theme variant(s) to render. Default: 'both' */
  theme?: Theme
  /** JPEG/WebP/AVIF quality (1-100). Default: 90 */
  quality?: number
  /** Scale factor for raster output (PNG/JPEG/WebP/AVIF). Default: 2 */
  scale?: number
  /** Apply dark SVG color contrast optimization. Default: true */
  contrastOptimize?: boolean
  /** Custom dark theme variables for mermaid. Uses built-in palette if omitted. */
  mermaidDarkTheme?: Record<string, string>
  /** Configuration overrides for this render call */
  config?: Partial<DiagramkitConfig>
  /** Optional browser pool instance (advanced/runtime API). */
  pool?: import('./pool').BrowserPool
}

export interface RenderResult {
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

/* ── Batch options ── */

export interface BatchOptions extends RenderOptions {
  /** Root directory to scan. Default: cwd() */
  dir?: string
  /** Force re-render, ignoring manifest. Default: false */
  force?: boolean
  /** Filter to specific diagram type */
  type?: DiagramType
  /** Multiple output formats. Overrides `format` when set. Accumulates with manifest-tracked formats. */
  formats?: OutputFormat[]
  /** Optional logger for library consumers to control output */
  logger?: Logger
  /** Logging verbosity level. Default: 'info'. */
  logLevel?: LogLevel
  /** Show per-file progress logs during batch rendering */
  progress?: boolean
  /** Max number of type lanes running concurrently (1-4). Default: 4. */
  maxConcurrentLanes?: number
  /** Include timing and lane metrics in result. */
  includeMetrics?: boolean
}

export interface RenderFailureDetail {
  file: string
  message: string
  code: DiagramkitErrorCode
}

export interface RenderAllResult {
  /** Files that were successfully rendered */
  rendered: string[]
  /** Files that were skipped (up-to-date) */
  skipped: string[]
  /** Files that failed to render */
  failed: string[]
  /** Structured failure details aligned with `failed` */
  failedDetails: RenderFailureDetail[]
  /** Optional batch timing and lane metrics */
  metrics?: {
    durationMs: number
    lanesUsed: number
    countsByType: Partial<Record<DiagramType, { rendered: number; failed: number }>>
  }
}

/* ── Watch options ── */

export interface WatchOptions {
  /** Root directory to watch */
  dir: string
  /** Callback after a diagram is rendered */
  onChange?: (file: string) => void
  /** Render options for watched files */
  renderOptions?: RenderOptions & { formats?: OutputFormat[] }
  /** Configuration overrides */
  config?: Partial<DiagramkitConfig>
  /** Explicit config file path (skips local auto-discovery) */
  configFile?: string
  /** Optional logger for library consumers to control output */
  logger?: Logger
  /** Logging verbosity level. Default: 'info'. */
  logLevel?: LogLevel
  /** Strict config validation mode for watch startup. */
  strictConfig?: boolean
  /** Optional browser pool instance for isolated runtimes */
  pool?: import('./pool').BrowserPool
  /** Debounce time for file events. Default: 200ms */
  debounceMs?: number
  /** Chokidar polling mode (useful for network volumes/containers). */
  usePolling?: boolean
  /** Chokidar polling interval in ms when usePolling=true. */
  pollingInterval?: number
}

/* ── Convert options ── */

export interface ConvertOptions {
  /** Output raster format */
  format: 'png' | 'jpeg' | 'webp' | 'avif'
  /** Scale multiplier for SVG rasterization (maps to DPI internally). Default: 2 */
  scale?: number
  /** JPEG/WebP/AVIF quality (1-100). Default: 90 */
  quality?: number
}
