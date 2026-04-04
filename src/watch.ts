import { watch as chokidarWatch } from 'chokidar'
import { basename, dirname } from 'node:path'
import { loadConfig } from './config'
import { getExtensionMap, getMatchedExtension } from './extensions'
import { hashFile, readManifest, updateManifest } from './manifest'
import { renderDiagramFileToDisk } from './renderer'
import type { DiagramFile, DiagramType, WatchOptions } from './types'

function toDiagramFile(
  path: string,
  extensionMap: Record<string, DiagramType>,
): DiagramFile | null {
  const ext = getMatchedExtension(basename(path), extensionMap)
  if (!ext) return null
  return {
    path,
    name: basename(path, ext),
    dir: dirname(path),
    ext,
  }
}

/**
 * Watch for diagram file changes and re-render on change/add.
 * Safe mode: if render fails, output and manifest are left untouched.
 * Returns a cleanup function to stop watching.
 */
export function watchDiagrams(opts: WatchOptions): () => Promise<void> {
  const dir = opts.dir
  const config = loadConfig(opts.config, dir)
  const requestedFormats =
    opts.renderOptions?.formats ??
    (opts.renderOptions?.format ? [opts.renderOptions.format] : config.defaultFormats)
  const theme = opts.renderOptions?.theme ?? config.defaultTheme
  const extensionMap = getExtensionMap(config.extensionMap)
  const log = opts.logger?.log ?? console.log
  const warn = opts.logger?.warn ?? console.warn

  log('Watching for diagram changes...\n')

  const outputDirPattern = config.outputDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Watch the directory (not globs) — chokidar v5 does not fire events for glob patterns
  const watcher = chokidarWatch(dir, {
    ignoreInitial: true,
    ignored: [/node_modules/, /\/dist\//, new RegExp(`(^|/)${outputDirPattern}(/|$)`)],
  })

  // Per-file debounce to prevent concurrent renders on rapid saves
  const pending = new Map<string, ReturnType<typeof setTimeout>>()
  // Render mutex to prevent concurrent manifest writes
  let rendering = false
  const queue: string[] = []
  const queueSet = new Set<string>()

  const handle = async (path: string) => {
    const file = toDiagramFile(path, extensionMap)
    if (!file) return

    try {
      // Accumulate formats from manifest so previously generated formats are re-rendered
      let effectiveFormats = requestedFormats
      if (config.useManifest) {
        const manifest = readManifest(file.dir, config)
        const entry = manifest.diagrams[basename(file.path)]
        if (entry?.formats) {
          effectiveFormats = [...new Set([...requestedFormats, ...entry.formats])]
        }
      }

      await renderDiagramFileToDisk(file, {
        formats: effectiveFormats,
        theme,
        scale: opts.renderOptions?.scale,
        quality: opts.renderOptions?.quality,
        contrastOptimize: opts.renderOptions?.contrastOptimize,
        mermaidDarkTheme: opts.renderOptions?.mermaidDarkTheme,
        config,
      })
      if (config.useManifest) {
        // Pre-compute hash so updateManifest does not re-read and re-hash the file
        const fileWithHash = {
          ...file,
          _hash: hashFile(file.path),
          _effectiveFormats: effectiveFormats,
        }
        updateManifest([fileWithHash], requestedFormats, config, theme)
      }
      opts.onChange?.(path)
    } catch (err: any) {
      // Safe mode: render failed, leave output and manifest untouched
      warn(`  Render failed: ${path} — ${err.message}`)
    }
  }

  const processQueue = async () => {
    if (rendering) return
    rendering = true
    try {
      while (queue.length > 0) {
        const path = queue.shift()!
        queueSet.delete(path)
        await handle(path)
      }
    } finally {
      rendering = false
    }
  }

  const debouncedHandle = (path: string) => {
    const existing = pending.get(path)
    if (existing) clearTimeout(existing)
    pending.set(
      path,
      setTimeout(() => {
        pending.delete(path)
        if (!queueSet.has(path)) {
          queue.push(path)
          queueSet.add(path)
        }
        void processQueue()
      }, 200),
    )
  }

  const isDiagramFile = (path: string) => {
    const ext = getMatchedExtension(basename(path), extensionMap)
    return ext != null
  }

  watcher.on('change', (path) => {
    if (!isDiagramFile(path)) return
    log(`Changed: ${path}`)
    debouncedHandle(path)
  })

  watcher.on('add', (path) => {
    if (!isDiagramFile(path)) return
    log(`Added: ${path}`)
    debouncedHandle(path)
  })

  return async () => {
    for (const timer of pending.values()) clearTimeout(timer)
    pending.clear()
    await watcher.close()
  }
}
