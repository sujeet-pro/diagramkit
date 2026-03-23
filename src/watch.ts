import { watch as chokidarWatch } from 'chokidar'
import { basename, dirname, join } from 'path'
import { loadConfig } from './config'
import { getAllExtensions, getExtensionMap, getMatchedExtension } from './extensions'
import { updateManifest } from './manifest'
import { createRenderers } from './renderers'
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
  const extensionMap = getExtensionMap(config.extensionMap)
  const allExts = getAllExtensions(extensionMap)

  console.log('Watching for diagram changes...\n')

  // Build glob patterns for all known extensions
  const patterns = allExts.map((ext) => join(dir, `**/*${ext}`))
  const outputDirPattern = config.outputDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const watcher = chokidarWatch(patterns, {
    ignoreInitial: true,
    ignored: new RegExp(`node_modules|${outputDirPattern}|dist|dev`),
  })

  const renderers = createRenderers()

  const handle = async (path: string) => {
    const file = toDiagramFile(path, extensionMap)
    if (!file) return

    const renderer = renderers.find((r) => r.extensions.includes(file.ext))
    if (!renderer) return

    try {
      await renderer.renderSingle(file, { format, config })
      if (config.useManifest) {
        updateManifest([file], format, config)
      }
      opts.onChange?.(path)
    } catch (err: any) {
      // Safe mode: render failed, leave output and manifest untouched
      console.error(`  Render failed: ${path} — ${err.message}`)
    }
  }

  watcher.on('change', async (path) => {
    console.log(`Changed: ${path}`)
    await handle(path)
  })

  watcher.on('add', async (path) => {
    console.log(`Added: ${path}`)
    await handle(path)
  })

  return () => {
    void watcher.close()
  }
}
