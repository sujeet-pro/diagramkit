/* ── Diagram types ── */

export type DiagramType = 'mermaid' | 'excalidraw' | 'drawio'
export type OutputFormat = 'svg' | 'png' | 'jpeg' | 'webp'
export type Theme = 'light' | 'dark' | 'both'

/* ── Configuration ── */

export interface DiagramkitConfig {
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

/* ── File types ── */

export interface DiagramFile {
  /** Absolute path to source file */
  path: string
  /** Filename without extension */
  name: string
  /** Directory containing the file */
  dir: string
  /** File extension (e.g. .mermaid, .mmd, .excalidraw, .drawio) */
  ext: string
}

/* ── Render options ── */

export interface RenderOptions {
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
  /** Optional logger for library consumers to control output */
  logger?: { log: (...args: any[]) => void; warn: (...args: any[]) => void }
}

/* ── Watch options ── */

export interface WatchOptions {
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

/* ── Convert options ── */

export interface ConvertOptions {
  /** Output raster format */
  format: 'png' | 'jpeg' | 'webp'
  /** Scale multiplier for SVG rasterization density. Default: 2 */
  density?: number
  /** JPEG/WebP quality (1-100). Default: 90 */
  quality?: number
}
