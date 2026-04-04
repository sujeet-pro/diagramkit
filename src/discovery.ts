import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import {
  getDiagramType,
  getExtensionMap,
  getExtensionsForType,
  getMatchedExtension,
} from './extensions'
import type { DiagramFile, DiagramkitConfig, DiagramType } from './types'

/**
 * Recursively find all diagram source files under a directory.
 * Skips hidden directories (.diagrams, .git, etc.) and node_modules.
 */
export function findDiagramFiles(dir: string, config?: Partial<DiagramkitConfig>): DiagramFile[] {
  const map = getExtensionMap(config?.extensionMap)
  // Compare against the first path segment so nested outputDirs are excluded during discovery.
  // Trade-off: a multi-segment outputDir like "build/diagrams" will cause the entire "build"
  // directory to be skipped, not just "build/diagrams". This is conservative — it avoids
  // accidentally scanning output directories at the cost of potentially skipping unrelated
  // source files that happen to live under the same top-level directory.
  const outputDirSegment = (config?.outputDir ?? '.diagramkit').split('/')[0]!
  const results: DiagramFile[] = []

  function walk(d: string, depth = 0) {
    if (depth > 50) return
    if (!existsSync(d)) return
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      // Symlinks can create infinite loops — skip them before checking isDirectory()
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        // Skip hidden dirs, node_modules, and the configured output directory
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === outputDirSegment
        )
          continue
        walk(full, depth + 1)
      } else {
        const type = getDiagramType(entry.name, map)
        if (type) {
          const matchedExt = getMatchedExtension(entry.name, map)!
          results.push({
            path: full,
            name: basename(entry.name, matchedExt),
            dir: dirname(full),
            ext: matchedExt,
          })
        }
      }
    }
  }

  walk(dir)
  return results
}

/** Filter diagram files by resolved diagram type. */
export function filterByType(
  files: DiagramFile[],
  type: DiagramType,
  config?: Partial<DiagramkitConfig>,
): DiagramFile[] {
  const map = getExtensionMap(config?.extensionMap)
  const exts = getExtensionsForType(type, map)
  return files.filter((f) => exts.some((ext) => f.path.endsWith(ext)))
}
