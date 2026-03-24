import { createHash } from 'crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs'
import { basename, join } from 'path'
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
  return join(sourceDir, config?.outputDir ?? '.diagrams')
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
  const hash = hashFile(file.path)
  const entry = m.diagrams[name]

  if (!entry || entry.hash !== hash) return true

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
): DiagramFile[] {
  if (force) return files

  // Cache manifests by directory to avoid re-reading per file
  const manifestCache = new Map<string, Manifest>()

  return files.filter((f) => {
    if (!manifestCache.has(f.dir)) {
      manifestCache.set(f.dir, readManifest(f.dir, config))
    }
    return isStale(f, format, config, theme, manifestCache.get(f.dir)!)
  })
}

/* ── Manifest update ── */

/** Update manifests after successful renders. Groups files by directory. */
export function updateManifest(
  files: DiagramFile[],
  format: OutputFormat = 'svg',
  config?: Partial<DiagramkitConfig>,
  theme: Theme = 'both',
): void {
  // When manifest is disabled, skip writing entirely
  if (config?.useManifest === false) return

  const byDir = new Map<string, DiagramFile[]>()
  for (const f of files) {
    if (!byDir.has(f.dir)) byDir.set(f.dir, [])
    byDir.get(f.dir)!.push(f)
  }

  for (const [dir, dirFiles] of byDir) {
    const manifest = readManifest(dir, config)
    for (const f of dirFiles) {
      const name = basename(f.path)
      manifest.diagrams[name] = {
        hash: hashFile(f.path),
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
export function cleanOrphans(files: DiagramFile[], config?: Partial<DiagramkitConfig>): void {
  if (config?.useManifest === false) return

  const manifestFile = config?.manifestFile ?? 'diagrams.manifest.json'
  const dirs = new Set(files.map((f) => f.dir))

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

    if (changed) writeManifest(dir, manifest, config)

    // In same-folder mode we can only safely remove files that were explicitly tracked by the manifest.
    // Sweeping "unknown" files would delete sources and unrelated project files.
    if (config?.sameFolder) continue

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
