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

/* ── Renderers (legacy) ── */

/**
 * @deprecated Class-based renderers are legacy. Use render(), renderFile(), or renderAll() instead.
 * These renderers always produce SVG with both themes and have limited error handling.
 */
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
