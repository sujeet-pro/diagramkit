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

export { loadConfig, getDefaultConfig } from './config'

/* ── Extensions ── */

export {
  getAllExtensions,
  getDiagramType,
  getExtensionMap,
  getExtensionsForType,
  getMatchedExtension,
} from './extensions'

/* ── Image conversion ── */

export { convertSvg } from './convert'

/* ── File operations ── */

export { filterByType, findDiagramFiles } from './discovery'
export { getDiagramsDir, ensureDiagramsDir, isStale, readManifest } from './manifest'

/* ── Color utilities ── */

export { postProcessDarkSvg } from './color/contrast'

/* ── Output utilities ── */

export { atomicWrite, stripDiagramExtension } from './output'

/* ── Types ── */

export type {
  BatchOptions,
  ConvertOptions,
  DiagramFile,
  DiagramkitConfig,
  DiagramType,
  OutputFormat,
  RenderOptions,
  RenderResult,
  Theme,
  WatchOptions,
} from './types'
export type { Manifest, ManifestEntry } from './manifest'
