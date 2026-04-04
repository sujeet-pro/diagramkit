import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { postProcessDarkSvg } from './color/contrast'
import { getFileOverrides, loadConfig } from './config'
import { filterByType, findDiagramFiles } from './discovery'
import { getAllExtensions, getDiagramType, getExtensionMap } from './extensions'
import { renderGraphviz } from './graphviz'
import {
  cleanOrphans,
  ensureDiagramsDir,
  filterStaleFiles,
  updateManifest,
  type OutputMetadata,
} from './manifest'
import { writeRenderResult, type OutputNamingOptions } from './output'
import { getPool } from './pool'
import type {
  BatchOptions,
  DiagramFile,
  DiagramType,
  DiagramkitConfig,
  OutputFormat,
  RenderOptions,
  RenderResult,
} from './types'

/* ── Batch result ── */

export interface RenderAllResult {
  /** Files that were successfully rendered */
  rendered: string[]
  /** Files that were skipped (up-to-date) */
  skipped: string[]
  /** Files that failed to render */
  failed: string[]
}

/**
 * Render a single diagram from source content.
 * This is the low-level API — always produces a single format.
 */
export async function render(
  source: string,
  type: DiagramType,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const format = options.format ?? 'svg'
  const theme = options.theme ?? 'both'
  const contrastOptimize = options.contrastOptimize ?? true

  const needsBrowser = type !== 'graphviz'
  const pool = needsBrowser ? getPool() : null
  if (pool) await pool.acquire()

  try {
    let lightSvg: string | undefined
    let darkSvg: string | undefined

    // Unique prefix avoids mermaid element ID collisions across concurrent renders
    const renderId = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

    if (type === 'mermaid') {
      if (theme === 'light' || theme === 'both') {
        const page = await pool!.getMermaidLightPage()
        lightSvg = await page.evaluate(
          async ({ diagram, id }: { diagram: string; id: string }) => {
            const container = (document as any).getElementById('container')!
            container.innerHTML = ''
            const { svg } = await (globalThis as any).mermaid.render(id, diagram, container)
            return svg as string
          },
          { diagram: source.trim(), id: `${renderId}-light` },
        )
      }

      if (theme === 'dark' || theme === 'both') {
        const darkTheme = options.mermaidDarkTheme ?? defaultMermaidDarkTheme
        const page = await pool!.getMermaidDarkPage(darkTheme)
        darkSvg = await page.evaluate(
          async ({ diagram, id }: { diagram: string; id: string }) => {
            const container = (document as any).getElementById('container')!
            container.innerHTML = ''
            const { svg } = await (globalThis as any).mermaid.render(id, diagram, container)
            return svg as string
          },
          { diagram: source.trim(), id: `${renderId}-dark` },
        )
        if (contrastOptimize && darkSvg) {
          darkSvg = postProcessDarkSvg(darkSvg)
        }
      }
    } else if (type === 'excalidraw') {
      const page = await pool!.getExcalidrawPage()

      if (theme === 'light' || theme === 'both') {
        lightSvg = await page.evaluate(
          async ({ json, darkMode }) => {
            return await (globalThis as any).__renderExcalidraw(json, darkMode)
          },
          { json: source, darkMode: false },
        )
      }

      if (theme === 'dark' || theme === 'both') {
        darkSvg = await page.evaluate(
          async ({ json, darkMode }) => {
            return await (globalThis as any).__renderExcalidraw(json, darkMode)
          },
          { json: source, darkMode: true },
        )
      }
    } else if (type === 'drawio') {
      const page = await pool!.getDrawioPage()

      if (theme === 'light' || theme === 'both') {
        lightSvg = await page.evaluate(
          async ({ xml, darkMode }) => {
            return (globalThis as any).__renderDrawio(xml, darkMode)
          },
          { xml: source, darkMode: false },
        )
      }

      if (theme === 'dark' || theme === 'both') {
        darkSvg = await page.evaluate(
          async ({ xml, darkMode }) => {
            return (globalThis as any).__renderDrawio(xml, darkMode)
          },
          { xml: source, darkMode: true },
        )
        // draw.io entry handles dark mode color adjustments in the browser
        // via adjustColorForDark() — skip Node-side postProcessDarkSvg to avoid double-darkening
      }
    } else if (type === 'graphviz') {
      const rendered = await renderGraphviz(source, { theme, contrastOptimize })
      lightSvg = rendered.lightSvg
      darkSvg = rendered.darkSvg
    } else {
      const _exhaustive: never = type
      throw new Error(`Unsupported diagram type: ${String(_exhaustive)}`)
    }

    // Convert to raster if needed (via sharp, dynamically imported)
    if (format !== 'svg') {
      const { convertSvg } = await import('./convert')
      const convertOpts = {
        format: format as 'png' | 'jpeg' | 'webp' | 'avif',
        density: options.scale,
        quality: options.quality,
      }

      const light = lightSvg ? await convertSvg(lightSvg, convertOpts) : undefined
      const dark = darkSvg ? await convertSvg(darkSvg, convertOpts) : undefined

      return { light, dark, format }
    }

    // SVG output — parse dimensions, with px-suffix tolerance and viewBox fallback
    const refSvg = lightSvg ?? darkSvg
    let width: number | undefined
    let height: number | undefined
    if (refSvg) {
      const svgTag = refSvg.match(/<svg[^>]*>/)
      if (svgTag) {
        const tag = svgTag[0]
        const wMatch = tag.match(/width="(\d+(?:\.\d+)?)\s*(?:px)?"/)
        const hMatch = tag.match(/height="(\d+(?:\.\d+)?)\s*(?:px)?"/)
        if (wMatch) width = parseFloat(wMatch[1]!)
        if (hMatch) height = parseFloat(hMatch[1]!)
        if (!wMatch || !hMatch) {
          const vbMatch = tag.match(/viewBox="[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)"/)
          if (vbMatch) {
            if (!wMatch) width = parseFloat(vbMatch[1]!)
            if (!hMatch) height = parseFloat(vbMatch[2]!)
          }
        }
      }
    }

    return {
      light: lightSvg ? Buffer.from(lightSvg) : undefined,
      dark: darkSvg ? Buffer.from(darkSvg) : undefined,
      format,
      width,
      height,
    }
  } finally {
    pool?.release()
  }
}

/**
 * Render a diagram file from disk.
 * Detects type from file extension using the extension alias map.
 */
export async function renderFile(
  filePath: string,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const name = basename(filePath)
  const extensionMap = getExtensionMap(options.config?.extensionMap)
  const type = getDiagramType(name, extensionMap)
  if (!type) {
    const supported = getAllExtensions(extensionMap).join(', ')
    throw new Error(`Unknown diagram type for file: "${name}". Supported extensions: ${supported}`)
  }
  const source = readFileSync(filePath, 'utf-8')
  return render(source, type, options)
}

/**
 * Render one discovered diagram file and persist all format variants to disk.
 * Always renders SVG first, then converts to each additional requested format.
 * This is shared by batch rendering, watch mode, and CLI single-file flows.
 */
export async function renderDiagramFileToDisk(
  file: DiagramFile,
  options: RenderOptions & {
    config?: DiagramkitConfig
    outDir?: string
    formats?: OutputFormat[]
  } = {},
): Promise<string[]> {
  const formats = options.formats ?? (options.format ? [options.format] : ['svg'])
  const outDir = options.outDir ?? ensureDiagramsDir(file.dir, options.config)
  const naming: OutputNamingOptions = {
    prefix: options.config?.outputPrefix ?? '',
    suffix: options.config?.outputSuffix ?? '',
  }

  // Always render SVG first (the core pipeline produces SVG)
  const svgResult = await renderFile(file.path, { ...options, format: 'svg' })

  const allWritten: string[] = []
  const outputMeta: OutputMetadata[] = []

  for (const fmt of formats) {
    let result: RenderResult
    if (fmt === 'svg') {
      result = svgResult
    } else {
      // Convert SVG buffers to raster format
      const { convertSvg } = await import('./convert')
      const convertOpts = {
        format: fmt as 'png' | 'jpeg' | 'webp' | 'avif',
        density: options.scale,
        quality: options.quality,
      }
      result = {
        light: svgResult.light ? await convertSvg(svgResult.light, convertOpts) : undefined,
        dark: svgResult.dark ? await convertSvg(svgResult.dark, convertOpts) : undefined,
        format: fmt,
      }
    }

    const written = writeRenderResult(file.name, outDir, result, naming)
    allWritten.push(...written)

    // Collect per-output metadata for manifest
    for (const fileName of written) {
      const theme: 'light' | 'dark' = fileName.includes('-dark.') ? 'dark' : 'light'
      outputMeta.push({
        file: fileName,
        format: fmt,
        theme,
        width: svgResult.width,
        height: svgResult.height,
        quality: fmt !== 'svg' ? (options.quality ?? 90) : undefined,
        scale: fmt !== 'svg' ? (options.scale ?? 2) : undefined,
      })
    }
  }

  // Attach metadata to file for manifest update
  ;(file as any)._outputMeta = outputMeta

  return allWritten
}

/**
 * Render all diagrams in a directory tree.
 * Outputs go to sibling .diagramkit/ hidden folders (configurable via config).
 * Returns a result object listing rendered, skipped, and failed files.
 */
export async function renderAll(opts: BatchOptions = {}): Promise<RenderAllResult> {
  const contentDir = opts.dir ?? process.cwd()
  const config = loadConfig(opts.config, contentDir)
  // Resolve formats: explicit formats > explicit format > config defaults
  const formats = opts.formats ?? (opts.format ? [opts.format] : config.defaultFormats)
  const theme = opts.theme ?? config.defaultTheme
  const log = opts.logger?.log ?? console.log
  const warn = opts.logger?.warn ?? console.warn

  const result: RenderAllResult = { rendered: [], skipped: [], failed: [] }

  const allFiles = findDiagramFiles(contentDir, config)

  if (allFiles.length === 0) {
    cleanOrphans([], config, [contentDir])
    log('No diagram files found.')
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
    log(`All ${filtered.length} diagrams up-to-date (skipped)`)
  } else {
    if (!opts.force && stale.length < filtered.length) {
      log(`${filtered.length - stale.length} diagrams up-to-date, ${stale.length} need rendering`)
    }

    const successful: (DiagramFile & {
      _hash?: string
      _effectiveFormats?: OutputFormat[]
      _outputMeta?: OutputMetadata[]
    })[] = []

    // Group by diagram type for concurrent rendering across separate browser pages
    const byType = new Map<string, typeof stale>()
    const extensionMap = getExtensionMap(config.extensionMap)
    for (const file of stale) {
      const type = getDiagramType(basename(file.path), extensionMap)!
      if (!byType.has(type)) byType.set(type, [])
      byType.get(type)!.push(file)
    }

    await Promise.all(
      [...byType.values()].map(async (files) => {
        for (const file of files) {
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
            config,
          }
          try {
            await renderDiagramFileToDisk(file, renderOpts)
            successful.push({ ...file, _outputMeta: (file as any)._outputMeta })
            result.rendered.push(file.path)
          } catch (err: any) {
            warn(`  FAIL: ${basename(file.path)} — ${err.message}`)
            result.failed.push(file.path)
          }
        }
      }),
    )

    if (successful.length > 0) {
      updateManifest(successful, formats, config, theme)
    }

    const fmtLabel = formats.join('+')
    log(
      `Rendered ${successful.length}/${stale.length} diagram${stale.length === 1 ? '' : 's'} to ${fmtLabel}`,
    )
  }

  cleanOrphans(allFiles, config, [contentDir])
  return result
}

/* ── Default dark theme (exported for custom overrides) ── */

export const defaultMermaidDarkTheme: Record<string, string> = {
  background: '#111111',
  primaryColor: '#2d2d2d',
  primaryTextColor: '#e5e5e5',
  primaryBorderColor: '#555555',
  secondaryColor: '#333333',
  secondaryTextColor: '#cccccc',
  secondaryBorderColor: '#555555',
  tertiaryColor: '#252525',
  tertiaryTextColor: '#cccccc',
  tertiaryBorderColor: '#555555',
  lineColor: '#cccccc',
  textColor: '#e5e5e5',
  mainBkg: '#2d2d2d',
  nodeBkg: '#2d2d2d',
  nodeBorder: '#555555',
  clusterBkg: '#1e1e1e',
  clusterBorder: '#555555',
  titleColor: '#e5e5e5',
  edgeLabelBackground: '#1e1e1e',
  actorBorder: '#555555',
  actorBkg: '#2d2d2d',
  actorTextColor: '#e5e5e5',
  actorLineColor: '#888888',
  signalColor: '#cccccc',
  signalTextColor: '#e5e5e5',
  labelBoxBkgColor: '#2d2d2d',
  labelBoxBorderColor: '#555555',
  labelTextColor: '#e5e5e5',
  loopTextColor: '#e5e5e5',
  noteBorderColor: '#555555',
  noteBkgColor: '#333333',
  noteTextColor: '#e5e5e5',
  activationBorderColor: '#555555',
  activationBkgColor: '#333333',
  defaultLinkColor: '#cccccc',
  arrowheadColor: '#cccccc',
}
