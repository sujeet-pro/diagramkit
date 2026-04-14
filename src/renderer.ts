import { randomUUID } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { getEngineProfile } from './engine-profiles'
import { engineRenderers } from './render-engines'
import { getAllExtensions, getDiagramType, getExtensionMap } from './extensions'
import { ensureDiagramsDir } from './manifest'
import { defaultMermaidDarkTheme } from './mermaid-theme'
import { writeRenderResult } from './output'
import { getPool } from './pool'
import {
  DiagramkitError,
  type DiagramFile,
  type DiagramType,
  type DiagramkitConfig,
  type OutputFormat,
  type OutputMetadata,
  type OutputNamingOptions,
  type RenderableFile,
  type RenderOptions,
  type RenderResult,
} from './types'

/**
 * Render a single diagram from source content.
 * This is the low-level API and always produces a single format.
 * The pipeline is SVG-first; raster formats are converted from SVG.
 * For multi-format output, prefer `renderDiagramFileToDisk()`/`renderAll()`.
 */
export async function render(
  source: string,
  type: DiagramType,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const format = options.format ?? 'svg'
  const theme = options.theme ?? 'both'
  const contrastOptimize = options.contrastOptimize ?? true

  const needsBrowser = getEngineProfile(type).requiresBrowserPool
  const pool = needsBrowser ? (options.pool ?? getPool()) : null
  if (pool) await pool.acquire()

  try {
    // Unique prefix avoids mermaid element ID collisions across concurrent renders.
    // Prefix with 'g' so the SVG id (and CSS selectors referencing it) always starts
    // with a letter — CSS identifiers beginning with a digit are invalid per the spec
    // and cause browsers to ignore every rule that references the id.
    const renderId = `g${randomUUID()}`
    const engine = engineRenderers[type]
    const { lightSvg, darkSvg } = await engine({
      source,
      theme,
      contrastOptimize,
      renderId,
      mermaidDarkTheme: options.mermaidDarkTheme ?? defaultMermaidDarkTheme,
      pool: pool ?? undefined,
    })

    // Convert to raster if needed (via sharp, dynamically imported)
    if (format !== 'svg') {
      const { convertSvg } = await import('./convert')
      const convertOpts = {
        format: format as 'png' | 'jpeg' | 'webp' | 'avif',
        scale: options.scale,
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
 * Detects type from file extension using the configured extension map
 * (`.drawio.xml`/`.dio`, `.mmd`, etc).
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
    throw new DiagramkitError(
      'UNKNOWN_TYPE',
      `Unknown diagram type for file: "${name}". Supported extensions: ${supported}. ` +
        'For custom extensions, add them to extensionMap in your diagramkit config.',
    )
  }
  const MAX_SOURCE_SIZE = 10 * 1024 * 1024 // 10 MB
  const fileSize = statSync(filePath).size
  if (fileSize > MAX_SOURCE_SIZE) {
    throw new DiagramkitError(
      'CONFIG_INVALID',
      `Source file "${name}" is ${(fileSize / 1024 / 1024).toFixed(1)} MB, exceeding the 10 MB limit.`,
    )
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

  // Import convertSvg once if any raster formats are requested
  const needsRaster = formats.some((f) => f !== 'svg')
  const doConvert = needsRaster ? (await import('./convert')).convertSvg : undefined
  const rasterScale = options.scale ?? 2
  const rasterWidth =
    svgResult.width !== undefined ? Math.round(svgResult.width * rasterScale) : undefined
  const rasterHeight =
    svgResult.height !== undefined ? Math.round(svgResult.height * rasterScale) : undefined

  for (const fmt of formats) {
    let result: RenderResult
    if (fmt === 'svg') {
      result = svgResult
    } else {
      // Convert SVG buffers to raster format
      const convertOpts = {
        format: fmt as 'png' | 'jpeg' | 'webp' | 'avif',
        scale: options.scale,
        quality: options.quality,
      }
      result = {
        light: svgResult.light ? await doConvert!(svgResult.light, convertOpts) : undefined,
        dark: svgResult.dark ? await doConvert!(svgResult.dark, convertOpts) : undefined,
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
        width: fmt === 'svg' ? svgResult.width : rasterWidth,
        height: fmt === 'svg' ? svgResult.height : rasterHeight,
        quality: fmt !== 'svg' ? (options.quality ?? 90) : undefined,
        scale: fmt !== 'svg' ? rasterScale : undefined,
      })
    }
  }

  // Attach metadata to file for manifest update (used by renderAll/watch to pass to updateManifest)
  ;(file as RenderableFile)._outputMeta = outputMeta

  return allWritten
}

export { defaultMermaidDarkTheme } from './mermaid-theme'
