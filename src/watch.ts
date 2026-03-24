import { watch as chokidarWatch } from 'chokidar'
import { basename, dirname, join } from 'path'
import { loadConfig } from './config'
import { getAllExtensions, getExtensionMap, getMatchedExtension } from './extensions'
import { updateManifest } from './manifest'
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
export function watchDiagrams(opts: WatchOptions): () => void {
  const dir = opts.dir
  const config = loadConfig(opts.config, dir)
  const format = opts.renderOptions?.format ?? config.defaultFormat
  const theme = opts.renderOptions?.theme ?? config.defaultTheme
  const extensionMap = getExtensionMap(config.extensionMap)
  const allExts = getAllExtensions(extensionMap)

  console.log('Watching for diagram changes...\n')

  // Build glob patterns for all known extensions
  const patterns = allExts.map((ext) => join(dir, `**/*${ext}`))
  const outputDirPattern = config.outputDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const watcher = chokidarWatch(patterns, {
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
      await renderDiagramFileToDisk(file, {
        format,
        theme,
        scale: opts.renderOptions?.scale,
        quality: opts.renderOptions?.quality,
        contrastOptimize: opts.renderOptions?.contrastOptimize,
        mermaidDarkTheme: opts.renderOptions?.mermaidDarkTheme,
        config,
      })
      if (config.useManifest) {
        updateManifest([file], format, config, theme)
      }
      opts.onChange?.(path)
    } catch (err: any) {
      // Safe mode: render failed, leave output and manifest untouched
      console.error(`  Render failed: ${path} — ${err.message}`)
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

  watcher.on('change', (path) => {
    console.log(`Changed: ${path}`)
    debouncedHandle(path)
  })

  watcher.on('add', (path) => {
    console.log(`Added: ${path}`)
    debouncedHandle(path)
  })

  return () => {
    for (const timer of pending.values()) clearTimeout(timer)
    pending.clear()
    void watcher.close()
  }
}
