/* ── Core API ── */

export {
  render,
  renderAll,
  renderFile,
  renderDiagramFileToDisk,
  defaultMermaidDarkTheme,
} from './renderer'
export type { RenderAllResult } from './renderer'
export { dispose, warmup } from './pool'
export { watchDiagrams } from './watch'

/* ── Configuration ── */

export { defineConfig, loadConfig, getDefaultConfig, getFileOverrides } from './config'

/* ── Image conversion ── */

export { convertSvg } from './convert'

/* ── Types ── */

export type {
  BatchOptions,
  ConvertOptions,
  DiagramFile,
  DiagramkitConfig,
  DiagramType,
  FileOverride,
  OutputFormat,
  RenderOptions,
  RenderResult,
  Theme,
  WatchOptions,
} from './types'
export type { Manifest, ManifestEntry, ManifestOutput, StaleFile } from './manifest'
