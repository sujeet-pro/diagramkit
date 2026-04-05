import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
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

  function walk(d: string, rootDir: string, depth = 0) {
    if (depth > 50) return
    if (!existsSync(d)) return
    const outputDirPath = resolve(rootDir, config?.outputDir ?? '.diagramkit')
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      // Symlinks can create infinite loops — skip them before checking isDirectory()
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        const isHiddenDir = entry.name.startsWith('.')
        const isNodeModules = entry.name === 'node_modules'
        const relativeToOutputDir = relative(outputDirPath, full)
        const isOutputDir = relativeToOutputDir === '' || !relativeToOutputDir.startsWith('..')
        if (isHiddenDir || isNodeModules || isOutputDir) continue
        walk(full, rootDir, depth + 1)
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

  const inputDirs = config?.inputDirs
  if (inputDirs && inputDirs.length > 0) {
    for (const inputDir of inputDirs) {
      const resolvedInputDir = join(dir, inputDir)
      if (existsSync(resolvedInputDir)) walk(resolvedInputDir, resolvedInputDir)
    }
    return results
  }

  walk(dir, dir)
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
  return files.filter((f) => exts.includes(f.ext))
}
