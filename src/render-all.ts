import { basename } from 'node:path'
import { getFileOverrides, loadConfig } from './config'
import { filterByType, findDiagramFiles } from './discovery'
import { ENGINE_PROFILES } from './engine-profiles'
import { getDiagramType, getExtensionMap } from './extensions'
import { createLeveledLogger } from './logging'
import { cleanOrphans, filterStaleFiles, updateManifest } from './manifest'
import { renderDiagramFileToDisk } from './renderer'
import {
  DiagramkitError,
  type BatchOptions,
  type DiagramkitErrorCode,
  type DiagramType,
  type RenderAllResult,
  type RenderableFile,
} from './types'

function toRenderFailure(
  err: unknown,
  file: string,
): { code?: DiagramkitErrorCode; message: string } {
  if (err instanceof DiagramkitError) {
    return { code: err.code, message: err.message }
  }
  if (err instanceof Error) {
    return { code: 'RENDER_FAILED', message: err.message }
  }
  if (err == null) {
    return { code: 'RENDER_FAILED', message: `Failed to render ${file}` }
  }
  return { code: 'RENDER_FAILED', message: JSON.stringify(err) }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items]
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break
      await worker(item)
    }
  })
  await Promise.all(workers)
}

/**
 * Render all diagrams in a directory tree.
 * Discovers files recursively, skips unchanged files via manifest hashing,
 * updates manifest entries, and cleans orphaned outputs.
 * Returns rendered/skipped/failed source file paths and structured failure details.
 */
export async function renderAll(opts: BatchOptions = {}): Promise<RenderAllResult> {
  const startedAt = Date.now()
  const contentDir = opts.dir ?? process.cwd()
  const config = loadConfig(opts.config, contentDir)
  // Resolve formats: explicit formats > explicit format > config defaults
  const formats = opts.formats ?? (opts.format ? [opts.format] : config.defaultFormats)
  const theme = opts.theme ?? config.defaultTheme
  const logger = createLeveledLogger(opts.logLevel, opts.logger)

  const result: RenderAllResult = { rendered: [], skipped: [], failed: [], failedDetails: [] }
  const countsByType: Partial<Record<DiagramType, { rendered: number; failed: number }>> = {}

  const allFiles = findDiagramFiles(contentDir, config)

  if (allFiles.length === 0) {
    cleanOrphans([], config, [contentDir])
    logger.info('No diagram files found.')
    return result
  }

  let filtered = allFiles
  if (opts.type) {
    filtered = filterByType(filtered, opts.type, config)
  }

  const stale = filterStaleFiles(filtered, opts.force ?? false, formats, config, theme)

  // Track skipped files
  const staleSet = new Set(stale.map((f) => f.path))
  for (const f of filtered) {
    if (!staleSet.has(f.path)) result.skipped.push(f.path)
  }

  if (stale.length === 0) {
    logger.info(`All ${filtered.length} diagrams up-to-date (skipped)`)
  } else {
    if (!opts.force && stale.length < filtered.length) {
      logger.info(
        `${filtered.length - stale.length} diagrams up-to-date, ${stale.length} need rendering`,
      )
    }

    const successful: RenderableFile[] = []
    let progressDone = 0

    // Group by diagram type for concurrent rendering across separate browser pages
    const byType = new Map<string, typeof stale>()
    const extensionMap = getExtensionMap(config.extensionMap)
    for (const file of stale) {
      const type = getDiagramType(basename(file.path), extensionMap)!
      if (!byType.has(type)) byType.set(type, [])
      byType.get(type)!.push(file)
    }

    const laneEntries = [...byType.entries()]
      .sort((a, b) => {
        const aOrder = ENGINE_PROFILES[a[0] as DiagramType]?.laneOrder ?? 99
        const bOrder = ENGINE_PROFILES[b[0] as DiagramType]?.laneOrder ?? 99
        return aOrder - bOrder
      })
      .map(([type, files]) => ({ type: type as DiagramType, files }))
    const laneLimit = Math.max(1, Math.min(4, opts.maxConcurrentLanes ?? 4))

    await runWithConcurrency(laneEntries, laneLimit, async ({ type, files }) => {
      const profile = ENGINE_PROFILES[type]
      const fileConcurrency = profile?.serializedWithinLane ? 1 : files.length

      await runWithConcurrency(files, fileConcurrency, async (file) => {
        if (!countsByType[type]) countsByType[type] = { rendered: 0, failed: 0 }
        progressDone++
        if (opts.progress) {
          logger.verbose(`Rendering ${progressDone}/${stale.length}: ${file.path}`)
        }
        // Apply per-file overrides from config
        const fileOverride = getFileOverrides(file.path, config, contentDir)

        // Use effective formats from staleness check (includes manifest-accumulated formats)
        const effectiveFormats = fileOverride?.formats ?? file._effectiveFormats ?? formats
        const fileTheme = fileOverride?.theme ?? theme
        const renderOpts = {
          formats: effectiveFormats,
          theme: fileTheme,
          quality: fileOverride?.quality ?? opts.quality,
          scale: fileOverride?.scale ?? opts.scale,
          contrastOptimize: fileOverride?.contrastOptimize ?? opts.contrastOptimize,
          mermaidDarkTheme: opts.mermaidDarkTheme,
          mermaidLayout: opts.mermaidLayout,
          config,
          // Funnel non-fatal warnings (e.g. mermaid aspect-ratio rebalance notices) into
          // the batch logger so they appear alongside per-file progress output.
          logger: {
            log: (msg: string) => logger.info(`  ${basename(file.path)}: ${msg}`),
            warn: (msg: string) => logger.warn(`  ${basename(file.path)}: ${msg}`),
            error: (msg: string) => logger.error(`  ${basename(file.path)}: ${msg}`),
          },
          pool: opts.pool,
        }
        try {
          await renderDiagramFileToDisk(file, renderOpts)
          successful.push({ ...file, _outputMeta: file._outputMeta })
          result.rendered.push(file.path)
          countsByType[type]!.rendered++
        } catch (err: unknown) {
          const failure = toRenderFailure(err, file.path)
          logger.warn(`  FAIL: ${basename(file.path)} — ${failure.message}`)
          result.failed.push(file.path)
          result.failedDetails.push({
            file: file.path,
            code: failure.code ?? 'RENDER_FAILED',
            message: failure.message,
          })
          countsByType[type]!.failed++
        }
      })
    })

    if (successful.length > 0) {
      updateManifest(successful, formats, config, theme)
    }

    if (result.failedDetails.length > 0) {
      logger.error(`Failed to render ${result.failedDetails.length} diagram(s).`)
    }

    const fmtLabel = formats.join('+')
    logger.info(
      `Rendered ${successful.length}/${stale.length} diagram${stale.length === 1 ? '' : 's'} to ${fmtLabel}`,
    )
  }

  cleanOrphans(allFiles, config, [contentDir])
  if (opts.includeMetrics) {
    const laneLimit = Math.max(1, Math.min(4, opts.maxConcurrentLanes ?? 4))
    const byTypeCount = new Set(
      stale.map((f) => getDiagramType(basename(f.path), getExtensionMap(config.extensionMap))),
    ).size
    result.metrics = {
      durationMs: Date.now() - startedAt,
      lanesUsed: Math.min(byTypeCount, laneLimit),
      countsByType,
    }
  }

  if (opts.strict && result.failedDetails.length > 0) {
    const summary = result.failedDetails.map((d) => `  ${d.file}: ${d.message}`).join('\n')
    throw new DiagramkitError(
      'RENDER_FAILED',
      `${result.failedDetails.length} diagram(s) failed to render:\n${summary}`,
    )
  }

  return result
}
