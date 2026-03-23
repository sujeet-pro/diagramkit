import { existsSync, readdirSync } from 'fs'
import { basename, dirname, join } from 'path'
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
  const results: DiagramFile[] = []

  function walk(d: string) {
    if (!existsSync(d)) return
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        walk(full)
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
