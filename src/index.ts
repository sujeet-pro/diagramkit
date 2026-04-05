/**
 * diagramkit core module.
 *
 * Quick usage:
 *   import { renderAll, dispose } from 'diagramkit'
 *   await renderAll({ dir: '.', formats: ['svg', 'png'] })
 *   await dispose()
 */

/* ── Core API ── */

export { render, renderFile, renderDiagramFileToDisk, defaultMermaidDarkTheme } from './renderer'
export { renderAll } from './render-all'
export { dispose, warmup } from './pool'
export { createRendererRuntime } from './runtime'
export { watchDiagrams } from './watch'
export { ENGINE_PROFILES, getEngineProfile } from './engine-profiles'

/* ── Configuration ── */

export { defineConfig, loadConfig, getDefaultConfig, getFileOverrides } from './config'

/* ── Image conversion ── */

export { convertSvg } from './convert'

/* ── Types ── */

export { DiagramkitError } from './types'
export type {
  BatchOptions,
  ConvertOptions,
  DiagramFile,
  DiagramkitErrorCode,
  DiagramkitConfig,
  DiagramType,
  FileOverride,
  Logger,
  LogLevel,
  OutputFormat,
  OutputNamingOptions,
  OutputMetadata,
  RenderableFile,
  RenderAllResult,
  RenderFailureDetail,
  RenderOptions,
  RenderResult,
  Theme,
  WatchOptions,
} from './types'
export type {
  Manifest,
  ManifestEntry,
  ManifestOutput,
  StaleFile,
  StalePlanEntry,
  StaleReason,
  StaleReasonCode,
} from './manifest'
export type { RendererRuntime } from './runtime'
