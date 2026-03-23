/* ── Core API ── */

export { render, renderAll, renderFile, defaultMermaidDarkTheme } from './renderer'
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
export {
  cleanOrphans,
  DIAGRAMS_DIR,
  ensureDiagramsDir,
  filterStaleFiles,
  getDiagramsDir,
  hashFile,
  isStale,
  readManifest,
  updateManifest,
  writeManifest,
} from './manifest'

/* ── Color utilities ── */

export { postProcessDarkSvg } from './color/contrast'

/* ── Renderers ── */

export { createRenderers, ExcalidrawRenderer, MermaidRenderer, DrawioRenderer } from './renderers'

/* ── Types ── */

export type {
  BatchOptions,
  ConvertOptions,
  DiagramFile,
  DiagramkitConfig,
  DiagramRenderer,
  DiagramType,
  OutputFormat,
  RenderOptions,
  RendererOptions,
  RenderResult,
  Theme,
  WatchOptions,
} from './types'
export type { Manifest, ManifestEntry } from './manifest'
