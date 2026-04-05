import { createHash, randomBytes } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { getExpectedOutputNamesMulti } from './output'
import type {
  DiagramFile,
  DiagramkitConfig,
  OutputFormat,
  OutputMetadata,
  OutputNamingOptions,
  RenderableFile,
  Theme,
} from './types'

const DEBUG_LOG_ENABLED = process.env.DIAGRAMKIT_DEBUG === '1'

function debugLog(message: string, err?: unknown): void {
  if (!DEBUG_LOG_ENABLED) return
  const details =
    err instanceof Error
      ? err.message
      : err === undefined
        ? ''
        : typeof err === 'string'
          ? err
          : JSON.stringify(err)
  process.stderr.write(`[diagramkit:manifest] ${message}${details ? `: ${details}` : ''}\n`)
}

/* ── Types ── */

export type ManifestOutput = {
  file: string
  format: OutputFormat
  theme: 'light' | 'dark'
  width?: number
  height?: number
  quality?: number
  scale?: number
}

export type ManifestEntry = {
  hash: string
  generatedAt: string
  outputs: ManifestOutput[]
  formats: OutputFormat[]
  theme?: Theme
}

export type Manifest = {
  version: 2
  diagrams: Record<string, ManifestEntry>
}

/* ── Path helpers ── */

/** Get the output directory for a given source directory. */
export function getDiagramsDir(sourceDir: string, config?: Partial<DiagramkitConfig>): string {
  if (config?.sameFolder) return sourceDir
  const resolved = resolve(sourceDir, config?.outputDir ?? '.diagramkit')
  const resolvedBase = resolve(sourceDir)
  if (!isPathInside(resolvedBase, resolved)) {
    throw new Error(`outputDir "${config?.outputDir}" resolves outside the source directory`)
  }
  return resolved
}

/** Ensure the output directory exists for a given source directory. */
export function ensureDiagramsDir(sourceDir: string, config?: Partial<DiagramkitConfig>): string {
  const dir = getDiagramsDir(sourceDir, config)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/* ── Naming helper ── */

function getNamingOptions(config?: Partial<DiagramkitConfig>): OutputNamingOptions {
  return {
    prefix: config?.outputPrefix ?? '',
    suffix: config?.outputSuffix ?? '',
  }
}

/* ── Manifest I/O ── */

/** Migrate a v1 manifest entry (outputs as string[]) to v2 (outputs as ManifestOutput[]). */
function migrateEntry(raw: unknown): ManifestEntry {
  if (!raw || typeof raw !== 'object')
    return { hash: '', generatedAt: '', outputs: [], formats: ['svg'] }
  const entry = { ...(raw as Record<string, unknown>) } as Record<string, any>

  // Migrate old `format` field (single string) → `formats` (array)
  if (!entry.formats && entry.format) {
    entry.formats = [entry.format]
  }
  if (!entry.formats) entry.formats = ['svg']
  delete entry.format

  // Migrate string[] outputs to ManifestOutput[]
  if (
    Array.isArray(entry.outputs) &&
    entry.outputs.length > 0 &&
    typeof entry.outputs[0] === 'string'
  ) {
    entry.outputs = (entry.outputs as string[]).map((file: string) => {
      const parsed = parseOutputFilename(file)
      return { file, ...parsed }
    })
  }

  return entry as ManifestEntry
}

/** Parse an output filename like "arch-light.svg" into { format, theme }. */
function parseOutputFilename(file: string): { format: OutputFormat; theme: 'light' | 'dark' } {
  const dotIdx = file.lastIndexOf('.')
  const format = (dotIdx >= 0 ? file.slice(dotIdx + 1) : 'svg') as OutputFormat
  const base = dotIdx >= 0 ? file.slice(0, dotIdx) : file
  const theme: 'light' | 'dark' = base.endsWith('-dark') ? 'dark' : 'light'
  return { format, theme }
}

export function readManifest(sourceDir: string, config?: Partial<DiagramkitConfig>): Manifest {
  const manifestFile = config?.manifestFile ?? 'manifest.json'
  const outDir = getDiagramsDir(sourceDir, config)
  const path = join(outDir, manifestFile)

  // Prevent path traversal via manifestFile
  const resolvedPath = resolve(path)
  const resolvedOutDir = resolve(outDir)
  if (!isPathInside(resolvedOutDir, resolvedPath)) {
    throw new Error(`manifestFile "${manifestFile}" resolves outside the output directory`)
  }

  // Try current manifest location first, then legacy locations
  const candidates = [path, join(outDir, 'diagrams.manifest.json'), join(outDir, 'manifest.json')]
  // Also check old .diagrams/ location if we're using .diagramkit/
  const legacyOutDir =
    (config?.outputDir ?? '.diagramkit') === '.diagramkit' ? resolve(sourceDir, '.diagrams') : null
  if (legacyOutDir && existsSync(legacyOutDir)) {
    candidates.push(join(legacyOutDir, 'diagrams.manifest.json'))
    candidates.push(join(legacyOutDir, 'manifest.json'))
  }

  // Deduplicate (resolve to avoid duplicate paths)
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const resolved = resolve(candidate)
    if (seen.has(resolved)) continue
    seen.add(resolved)
    if (!existsSync(candidate)) continue
    try {
      const raw = JSON.parse(readFileSync(candidate, 'utf-8'))
      // Migrate entries
      const diagrams: Record<string, ManifestEntry> = {}
      for (const [key, value] of Object.entries(raw.diagrams ?? {})) {
        diagrams[key] = migrateEntry(value)
      }
      return { version: 2, diagrams }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(
        `Warning: failed to parse manifest ${candidate}: ${message}. Resetting manifest.\n`,
      )
      return { version: 2, diagrams: {} }
    }
  }

  return { version: 2, diagrams: {} }
}

/** Write manifest atomically (.tmp + rename) to prevent corruption on crash. */
export function writeManifest(
  sourceDir: string,
  manifest: Manifest,
  config?: Partial<DiagramkitConfig>,
): void {
  const manifestFile = config?.manifestFile ?? 'manifest.json'
  const dir = ensureDiagramsDir(sourceDir, config)
  const target = join(dir, manifestFile)

  // Prevent path traversal via manifestFile
  const resolved = resolve(target)
  const resolvedDir = resolve(dir)
  if (!isPathInside(resolvedDir, resolved)) {
    throw new Error(`manifestFile "${manifestFile}" resolves outside the output directory`)
  }

  const tmp = target + '.tmp.' + randomBytes(4).toString('hex')
  writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n')
  renameSync(tmp, target)
}

/* ── Hashing ── */

/** Content hash: SHA-256 of file contents, first 16 hex chars. */
export function hashFile(filePath: string): string {
  const content = readFileSync(filePath)
  return 'sha256:' + createHash('sha256').update(content).digest('hex').slice(0, 16)
}

/* ── Staleness checking ── */

export type StaleFile = RenderableFile
export type StaleReasonCode =
  | 'forced'
  | 'manifest_disabled'
  | 'no_manifest_entry'
  | 'theme_changed'
  | 'missing_outputs'
  | 'content_changed'

export type StaleReason =
  | { code: 'forced' }
  | { code: 'manifest_disabled' }
  | { code: 'no_manifest_entry' }
  | { code: 'theme_changed'; requestedTheme: Theme; manifestTheme?: Theme }
  | { code: 'missing_outputs'; files: string[] }
  | { code: 'content_changed'; previousHash: string; currentHash: string }

export interface StalePlanEntry {
  path: string
  effectiveFormats: OutputFormat[]
  reasons: StaleReason[]
}

/** Check if a single diagram file is stale (changed since last render). Uses a pre-read manifest. */
export function isStale(
  file: DiagramFile,
  formats?: OutputFormat[],
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
  manifest?: Manifest,
): boolean {
  // When manifest is disabled, always consider stale
  if (config?.useManifest === false) return true

  const m = manifest ?? readManifest(file.dir, config)
  const name = basename(file.path)
  const entry = m.diagrams[name]

  // Early return for files never rendered — avoids unnecessary hash computation
  if (!entry) return true

  const hash = hashFile(file.path)
  if (entry.hash !== hash) return true

  // Theme change triggers re-render
  if (theme && entry.theme !== theme) return true

  // Compute effective formats (accumulate with manifest)
  const requestedFormats = formats ?? ['svg']
  const effectiveFormats = [...new Set([...requestedFormats, ...entry.formats])]

  // Check that all output files for effective formats exist
  const outDir = getDiagramsDir(file.dir, config)
  const naming = getNamingOptions(config)
  const expectedOutputs = getExpectedOutputNamesMulti(
    file.name,
    effectiveFormats,
    theme ?? entry.theme ?? 'both',
    naming,
  )
  return expectedOutputs.some((output) => !existsSync(join(outDir, output)))
}

/** Filter files to only those that have changed since last render. Caches manifests per directory. */
export function filterStaleFiles(
  files: DiagramFile[],
  force: boolean,
  formats?: OutputFormat[],
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
): StaleFile[] {
  const requestedFormats = formats ?? ['svg']

  // When forced, all files are stale — use only requested formats (reset tracking)
  if (force) return files.map((f) => ({ ...f, _effectiveFormats: requestedFormats }))

  const manifestCache = new Map<string, Manifest>()
  const naming = getNamingOptions(config)

  return files.reduce<StaleFile[]>((result, f) => {
    if (!manifestCache.has(f.dir)) {
      manifestCache.set(f.dir, readManifest(f.dir, config))
    }
    const manifest = manifestCache.get(f.dir)!
    const name = basename(f.path)
    const entry = manifest.diagrams[name]

    // Manifest disabled — always stale
    if (config?.useManifest === false) {
      result.push({ ...f, _effectiveFormats: requestedFormats })
      return result
    }

    // Compute effective formats (accumulate with manifest unless forced)
    const manifestFormats = entry?.formats ?? []
    const effectiveFormats = [...new Set([...requestedFormats, ...manifestFormats])]

    // No manifest entry — file never rendered
    if (!entry) {
      result.push({ ...f, _effectiveFormats: effectiveFormats })
      return result
    }

    // Theme changed — re-render
    if (theme && entry.theme !== theme) {
      result.push({ ...f, _effectiveFormats: effectiveFormats })
      return result
    }

    // Missing output files for effective formats — re-render needed
    const outDir = getDiagramsDir(f.dir, config)
    const expectedOutputs = getExpectedOutputNamesMulti(
      f.name,
      effectiveFormats,
      theme ?? entry.theme ?? 'both',
      naming,
    )
    if (expectedOutputs.some((output) => !existsSync(join(outDir, output)))) {
      result.push({ ...f, _effectiveFormats: effectiveFormats })
      return result
    }

    // Content hash comparison — only case that requires reading the file
    const hash = hashFile(f.path)
    if (entry.hash !== hash) {
      result.push({ ...f, _hash: hash, _effectiveFormats: effectiveFormats })
      return result
    }

    return result
  }, [])
}

/**
 * Plan staleness with machine-readable reasons.
 * Used by CLI `render --plan --json` for agent/CI workflows.
 */
export function planStaleFiles(
  files: DiagramFile[],
  force: boolean,
  formats?: OutputFormat[],
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
): StalePlanEntry[] {
  const requestedFormats = formats ?? ['svg']

  if (force) {
    return files.map((f) => ({
      path: f.path,
      effectiveFormats: requestedFormats,
      reasons: [{ code: 'forced' }],
    }))
  }

  const manifestCache = new Map<string, Manifest>()
  const naming = getNamingOptions(config)
  const plans: StalePlanEntry[] = []

  for (const f of files) {
    if (!manifestCache.has(f.dir)) {
      manifestCache.set(f.dir, readManifest(f.dir, config))
    }
    const manifest = manifestCache.get(f.dir)!
    const name = basename(f.path)
    const entry = manifest.diagrams[name]
    const manifestFormats = entry?.formats ?? []
    const effectiveFormats = [...new Set([...requestedFormats, ...manifestFormats])]
    const reasons: StaleReason[] = []

    if (config?.useManifest === false) {
      reasons.push({ code: 'manifest_disabled' })
      plans.push({ path: f.path, effectiveFormats, reasons })
      continue
    }

    if (!entry) {
      reasons.push({ code: 'no_manifest_entry' })
      plans.push({ path: f.path, effectiveFormats, reasons })
      continue
    }

    if (theme && entry.theme !== theme) {
      reasons.push({ code: 'theme_changed', requestedTheme: theme, manifestTheme: entry.theme })
      plans.push({ path: f.path, effectiveFormats, reasons })
      continue
    }

    const outDir = getDiagramsDir(f.dir, config)
    const expectedOutputs = getExpectedOutputNamesMulti(
      f.name,
      effectiveFormats,
      theme ?? entry.theme ?? 'both',
      naming,
    )
    const missing = expectedOutputs.filter((output) => !existsSync(join(outDir, output)))
    if (missing.length > 0) {
      reasons.push({ code: 'missing_outputs', files: missing })
      plans.push({ path: f.path, effectiveFormats, reasons })
      continue
    }

    const hash = hashFile(f.path)
    if (entry.hash !== hash) {
      reasons.push({ code: 'content_changed', previousHash: entry.hash, currentHash: hash })
      plans.push({ path: f.path, effectiveFormats, reasons })
    }
  }

  return plans
}

/* ── Manifest update ── */

export type { OutputMetadata }

/** Update manifests after successful renders. Groups files by directory. Merges formats with existing entries. */
export function updateManifest(
  files: RenderableFile[],
  formats: OutputFormat[] = ['svg'],
  config?: Partial<DiagramkitConfig>,
  theme: Theme = 'both',
): void {
  // When manifest is disabled, skip writing entirely
  if (config?.useManifest === false) return

  const byDir = new Map<string, RenderableFile[]>()
  for (const f of files) {
    if (!byDir.has(f.dir)) byDir.set(f.dir, [])
    byDir.get(f.dir)!.push(f)
  }

  const naming = getNamingOptions(config)

  for (const [dir, dirFiles] of byDir) {
    const manifest = readManifest(dir, config)
    for (const f of dirFiles) {
      const name = basename(f.path)
      // Use effective formats from staleness check, or fall back to requested formats
      const effectiveFormats = f._effectiveFormats ?? formats
      const expectedNames = getExpectedOutputNamesMulti(f.name, effectiveFormats, theme, naming)

      // Build outputs: use metadata if available, otherwise derive from expected names
      let outputs: ManifestOutput[]
      if (f._outputMeta && f._outputMeta.length > 0) {
        outputs = f._outputMeta
      } else {
        outputs = expectedNames.map((file) => {
          const parsed = parseOutputFilename(file)
          return { file, ...parsed }
        })
      }

      manifest.diagrams[name] = {
        hash: f._hash ?? hashFile(f.path),
        generatedAt: new Date().toISOString(),
        outputs,
        formats: effectiveFormats,
        theme,
      }
    }

    writeManifest(dir, manifest, config)
  }
}

/* ── Orphan cleanup ── */

/**
 * Remove orphaned outputs and manifest entries for diagram sources that no longer exist.
 * Scans each output folder and removes entries whose source file is gone.
 */
export function cleanOrphans(
  files: DiagramFile[],
  config?: Partial<DiagramkitConfig>,
  roots: string[] = [],
): void {
  if (config?.useManifest === false) return

  const manifestFile = config?.manifestFile ?? 'manifest.json'
  const dirs = new Set(files.map((f) => f.dir))
  for (const root of roots) {
    for (const dir of findSourceDirsWithManifest(root, config)) {
      dirs.add(dir)
    }
  }

  for (const dir of dirs) {
    const manifest = readManifest(dir, config)
    let changed = false

    for (const name of Object.keys(manifest.diagrams)) {
      if (!existsSync(join(dir, name))) {
        const entry = manifest.diagrams[name]!
        const outDir = getDiagramsDir(dir, config)
        for (const output of entry.outputs) {
          const outFile = output.file
          const outPath = join(outDir, outFile)
          if (existsSync(outPath)) unlinkSync(outPath)
        }
        delete manifest.diagrams[name]
        changed = true
      }
    }

    if (changed) {
      if (!config?.sameFolder && Object.keys(manifest.diagrams).length === 0) {
        const outDir = getDiagramsDir(dir, config)
        const manifestPath = join(outDir, manifestFile)
        if (existsSync(manifestPath)) unlinkSync(manifestPath)
        // Also clean legacy manifest names
        for (const legacy of ['diagrams.manifest.json', 'manifest.json']) {
          const legacyPath = join(outDir, legacy)
          if (existsSync(legacyPath)) unlinkSync(legacyPath)
        }
        try {
          rmSync(outDir, { recursive: true })
        } catch (err) {
          debugLog('failed to remove empty output directory', err)
        }
        continue
      }

      writeManifest(dir, manifest, config)
    }

    // In same-folder mode we can only safely remove files that were explicitly tracked by the manifest.
    // Sweeping "unknown" files would delete sources and unrelated project files.
    if (config?.sameFolder) continue

    // Empty manifest means corruption or fresh state — skip sweep to avoid deleting all outputs
    if (Object.keys(manifest.diagrams).length === 0) continue

    // Clean outputs not referenced by the manifest
    const outDir = getDiagramsDir(dir, config)
    if (!existsSync(outDir)) continue

    const knownOutputs = new Set(
      Object.values(manifest.diagrams).flatMap((e) => e.outputs.map((o) => o.file)),
    )
    for (const entry of readdirSync(outDir)) {
      if (entry === manifestFile || entry === 'diagrams.manifest.json' || entry === 'manifest.json')
        continue
      // Skip .tmp files from in-progress atomic writes (matches both foo.tmp and foo.svg.tmp.a1b2c3d4)
      if (entry.includes('.tmp')) continue
      if (!knownOutputs.has(entry)) {
        unlinkSync(join(outDir, entry))
      }
    }
  }
}

function isPathInside(parentDir: string, targetPath: string): boolean {
  const rel = relative(parentDir, targetPath)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function getOutputDirDepth(config?: Partial<DiagramkitConfig>): number {
  if (config?.sameFolder) return 0
  return (config?.outputDir ?? '.diagramkit').split(/[\\/]+/).filter(Boolean).length
}

function getSourceDirFromManifestDir(
  manifestDir: string,
  config?: Partial<DiagramkitConfig>,
): string {
  let sourceDir = manifestDir
  for (let i = 0; i < getOutputDirDepth(config); i++) {
    sourceDir = dirname(sourceDir)
  }
  return sourceDir
}

function findSourceDirsWithManifest(rootDir: string, config?: Partial<DiagramkitConfig>): string[] {
  if (!existsSync(rootDir)) return []

  const manifestNames = new Set([
    config?.manifestFile ?? 'manifest.json',
    'diagrams.manifest.json',
    'manifest.json',
  ])
  const results = new Set<string>()
  const visited = new Set<string>()

  function walk(dir: string, depth = 0) {
    if (depth > 50 || visited.has(dir)) return
    visited.add(dir)

    let entries: Array<{
      name: string
      isFile(): boolean
      isDirectory(): boolean
      isSymbolicLink(): boolean
    }>
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    if (entries.some((entry) => entry.isFile() && manifestNames.has(entry.name))) {
      const sourceDir = getSourceDirFromManifestDir(dir, config)
      if (resolve(getDiagramsDir(sourceDir, config)) === resolve(dir)) {
        results.add(sourceDir)
      }
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink() || !entry.isDirectory()) continue
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walk(join(dir, entry.name), depth + 1)
    }
  }

  walk(rootDir)
  return [...results]
}
