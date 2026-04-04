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
  isStale,
  readManifest,
  writeManifest,
  updateManifest,
  hashFile,
  cleanOrphans,
} from './manifest'
export type { Manifest, ManifestEntry, ManifestOutput, StaleFile, OutputMetadata } from './manifest'

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
export type { OutputNamingOptions } from './output'

/* ── Color ── */

export { postProcessDarkSvg } from './color/contrast'
