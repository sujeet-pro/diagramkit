/**
 * Utility exports for advanced use cases (custom pipelines, build tools, etc.).
 * Import from 'diagramkit/utils' — kept separate from the core API.
 */

/* ── Discovery ── */

export { filterByType, findDiagramFiles } from './discovery'

/* ── Manifest ── */

export {
  getDiagramsDir,
  ensureDiagramsDir,
  filterStaleFiles,
  planStaleFiles,
  isStale,
  readManifest,
  writeManifest,
  updateManifest,
  hashFile,
  cleanOrphans,
} from './manifest'
export type {
  Manifest,
  ManifestEntry,
  ManifestOutput,
  StaleFile,
  StalePlanEntry,
  StaleReason,
  StaleReasonCode,
} from './manifest'
export type { OutputMetadata } from './types'

/* ── Extensions ── */

export {
  getAllExtensions,
  getDiagramType,
  getExtensionMap,
  getExtensionsForType,
  getMatchedExtension,
} from './extensions'

/* ── Output ── */

export {
  atomicWrite,
  stripDiagramExtension,
  getExpectedOutputNamesMulti,
  getExpectedOutputNames,
  getOutputFileName,
  getOutputVariants,
  writeRenderResult,
} from './output'
export type { OutputNamingOptions } from './types'

/* ── Graphviz ── */

export { renderGraphviz } from './graphviz'

/* ── Color ── */

export { postProcessDarkSvg } from './color/contrast'

/* ── Validate ── */

export {
  validateSvg,
  validateSvgFile,
  validateSvgDirectory,
  formatValidationResult,
} from './validate'
export type { SvgIssue, SvgIssueCode, SvgIssueSeverity, SvgValidationResult } from './validate'
