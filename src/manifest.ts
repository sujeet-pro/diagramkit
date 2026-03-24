import { createHash } from 'node:crypto'
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
import { getExpectedOutputNames } from './output'
import type { DiagramFile, DiagramkitConfig, OutputFormat, Theme } from './types'

/* ── Constants ── */

/** @deprecated Use getDiagramsDir(sourceDir, config) instead. Kept for backward compat. */
export const DIAGRAMS_DIR = '.diagrams'

/* ── Types ── */

export type ManifestEntry = {
  hash: string
  generatedAt: string
  outputs: string[]
  format?: OutputFormat
  theme?: Theme
}

export type Manifest = {
  version: 1
  diagrams: Record<string, ManifestEntry>
}

/* ── Path helpers ── */

/** Get the output directory for a given source directory. */
export function getDiagramsDir(sourceDir: string, config?: Partial<DiagramkitConfig>): string {
  if (config?.sameFolder) return sourceDir
  const resolved = resolve(sourceDir, config?.outputDir ?? '.diagrams')
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

/* ── Manifest I/O ── */

export function readManifest(sourceDir: string, config?: Partial<DiagramkitConfig>): Manifest {
  const manifestFile = config?.manifestFile ?? 'diagrams.manifest.json'
  const outDir = getDiagramsDir(sourceDir, config)
  const path = join(outDir, manifestFile)

  // Prevent path traversal via manifestFile
  const resolvedPath = resolve(path)
  const resolvedOutDir = resolve(outDir)
  if (!isPathInside(resolvedOutDir, resolvedPath)) {
    throw new Error(`manifestFile "${manifestFile}" resolves outside the output directory`)
  }

  if (!existsSync(path)) {
    // Migration fallback: check for old 'manifest.json'
    const oldPath = join(outDir, 'manifest.json')
    if (existsSync(oldPath)) {
      try {
        return JSON.parse(readFileSync(oldPath, 'utf-8'))
      } catch {
        return { version: 1, diagrams: {} }
      }
    }
    return { version: 1, diagrams: {} }
  }

  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return { version: 1, diagrams: {} }
  }
}

/** Write manifest atomically (.tmp + rename) to prevent corruption on crash. */
export function writeManifest(
  sourceDir: string,
  manifest: Manifest,
  config?: Partial<DiagramkitConfig>,
): void {
  const manifestFile = config?.manifestFile ?? 'diagrams.manifest.json'
  const dir = ensureDiagramsDir(sourceDir, config)
  const target = join(dir, manifestFile)

  // Prevent path traversal via manifestFile
  const resolved = resolve(target)
  const resolvedDir = resolve(dir)
  if (!isPathInside(resolvedDir, resolved)) {
    throw new Error(`manifestFile "${manifestFile}" resolves outside the output directory`)
  }

  const tmp = target + '.tmp'
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

export type StaleFile = DiagramFile & { _hash: string }

/** Check if a single diagram file is stale (changed since last render). Uses a pre-read manifest. */
export function isStale(
  file: DiagramFile,
  format?: OutputFormat,
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

  // Format change triggers re-render
  if (format && entry.format !== format) return true
  if (theme && entry.theme !== theme) return true

  // Check that output files exist
  const outDir = getDiagramsDir(file.dir, config)
  return entry.outputs.some((output) => !existsSync(join(outDir, output)))
}

/** Filter files to only those that have changed since last render. Caches manifests per directory. */
export function filterStaleFiles(
  files: DiagramFile[],
  force: boolean,
  format?: OutputFormat,
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
): StaleFile[] {
  if (force) return files.map((f) => ({ ...f, _hash: hashFile(f.path) }))

  const manifestCache = new Map<string, Manifest>()

  return files.reduce<StaleFile[]>((result, f) => {
    if (!manifestCache.has(f.dir)) {
      manifestCache.set(f.dir, readManifest(f.dir, config))
    }
    const manifest = manifestCache.get(f.dir)!
    const hash = hashFile(f.path)
    const name = basename(f.path)
    const entry = manifest.diagrams[name]

    if (config?.useManifest === false) {
      result.push({ ...f, _hash: hash })
      return result
    }

    if (!entry || entry.hash !== hash) {
      result.push({ ...f, _hash: hash })
      return result
    }
    if (format && entry.format !== format) {
      result.push({ ...f, _hash: hash })
      return result
    }
    if (theme && entry.theme !== theme) {
      result.push({ ...f, _hash: hash })
      return result
    }
    const outDir = getDiagramsDir(f.dir, config)
    if (entry.outputs.some((output) => !existsSync(join(outDir, output)))) {
      result.push({ ...f, _hash: hash })
      return result
    }
    return result
  }, [])
}

/* ── Manifest update ── */

/** Update manifests after successful renders. Groups files by directory. */
export function updateManifest(
  files: (DiagramFile & { _hash?: string })[],
  format: OutputFormat = 'svg',
  config?: Partial<DiagramkitConfig>,
  theme: Theme = 'both',
): void {
  // When manifest is disabled, skip writing entirely
  if (config?.useManifest === false) return

  type FileWithHash = DiagramFile & { _hash?: string }
  const byDir = new Map<string, FileWithHash[]>()
  for (const f of files) {
    if (!byDir.has(f.dir)) byDir.set(f.dir, [])
    byDir.get(f.dir)!.push(f)
  }

  for (const [dir, dirFiles] of byDir) {
    const manifest = readManifest(dir, config)
    for (const f of dirFiles) {
      const name = basename(f.path)
      manifest.diagrams[name] = {
        hash: f._hash ?? hashFile(f.path),
        generatedAt: new Date().toISOString(),
        outputs: getExpectedOutputNames(f.name, format, theme),
        format,
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

  const manifestFile = config?.manifestFile ?? 'diagrams.manifest.json'
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
          const outPath = join(outDir, output)
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
        const oldManifestPath = join(outDir, 'manifest.json')
        if (existsSync(oldManifestPath)) unlinkSync(oldManifestPath)
        try {
          rmSync(outDir, { recursive: true })
        } catch {}
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

    const knownOutputs = new Set(Object.values(manifest.diagrams).flatMap((e) => e.outputs))
    for (const entry of readdirSync(outDir)) {
      if (entry === manifestFile || entry === 'manifest.json') continue
      // Skip .tmp files from in-progress atomic writes
      if (entry.endsWith('.tmp')) continue
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
  return (config?.outputDir ?? '.diagrams').split(/[\\/]+/).filter(Boolean).length
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

  const manifestNames = new Set([config?.manifestFile ?? 'diagrams.manifest.json', 'manifest.json'])
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
