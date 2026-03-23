import { readFileSync } from 'fs'
import { basename } from 'path'
import { postProcessDarkSvg } from './color/contrast'
import { loadConfig } from './config'
import { filterByType, findDiagramFiles } from './discovery'
import { getDiagramType } from './extensions'
import { cleanOrphans, ensureDiagramsDir, filterStaleFiles, updateManifest } from './manifest'
import { writeRenderResult } from './output'
import { getPool } from './pool'
import type {
  BatchOptions,
  DiagramFile,
  DiagramType,
  DiagramkitConfig,
  RenderOptions,
  RenderResult,
} from './types'

/**
 * Render a single diagram from source content.
 */
export async function render(
  source: string,
  type: DiagramType,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const format = options.format ?? 'svg'
  const theme = options.theme ?? 'both'
  const contrastOptimize = options.contrastOptimize ?? true

  const pool = getPool()
  await pool.acquire()

  try {
    let lightSvg: string | undefined
    let darkSvg: string | undefined

    if (type === 'mermaid') {
      if (theme === 'light' || theme === 'both') {
        const page = await pool.getMermaidLightPage()
        lightSvg = await page.evaluate(
          async ({ diagram, id }: { diagram: string; id: string }) => {
            const container = (document as any).getElementById('container')!
            container.innerHTML = ''
            const { svg } = await (globalThis as any).mermaid.render(id, diagram, container)
            return svg as string
          },
          { diagram: source.trim(), id: 'render-light' },
        )
      }

      if (theme === 'dark' || theme === 'both') {
        const darkTheme = options.mermaidDarkTheme ?? defaultMermaidDarkTheme
        const page = await pool.getMermaidDarkPage(darkTheme)
        darkSvg = await page.evaluate(
          async ({ diagram, id }: { diagram: string; id: string }) => {
            const container = (document as any).getElementById('container')!
            container.innerHTML = ''
            const { svg } = await (globalThis as any).mermaid.render(id, diagram, container)
            return svg as string
          },
          { diagram: source.trim(), id: 'render-dark' },
        )
        if (contrastOptimize && darkSvg) {
          darkSvg = postProcessDarkSvg(darkSvg)
        }
      }
    } else if (type === 'excalidraw') {
      const page = await pool.getExcalidrawPage()

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
      const page = await pool.getDrawioPage()

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
        if (contrastOptimize && darkSvg) {
          darkSvg = postProcessDarkSvg(darkSvg)
        }
      }
    }

    // Convert to raster if needed (via sharp, dynamically imported)
    if (format !== 'svg') {
      const { convertSvg } = await import('./convert')
      const convertOpts = {
        format: format as 'png' | 'jpeg' | 'webp',
        density: options.scale,
        quality: options.quality,
      }

      const light = lightSvg ? await convertSvg(lightSvg, convertOpts) : undefined
      const dark = darkSvg ? await convertSvg(darkSvg, convertOpts) : undefined

      return { light, dark, format }
    }

    // SVG output — parse dimensions
    const refSvg = lightSvg ?? darkSvg
    let width: number | undefined
    let height: number | undefined
    if (refSvg) {
      const wMatch = refSvg.match(/width="(\d+(?:\.\d+)?)"/)
      const hMatch = refSvg.match(/height="(\d+(?:\.\d+)?)"/)
      if (wMatch) width = parseFloat(wMatch[1]!)
      if (hMatch) height = parseFloat(hMatch[1]!)
    }

    return {
      light: lightSvg ? Buffer.from(lightSvg) : undefined,
      dark: darkSvg ? Buffer.from(darkSvg) : undefined,
      format,
      width,
      height,
    }
  } finally {
    pool.release()
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
  const type = getDiagramType(name)
  if (!type) {
    throw new Error(`Unknown diagram type for file: ${name}`)
  }
  const source = readFileSync(filePath, 'utf-8')
  return render(source, type, options)
}

/**
 * Render one discovered diagram file and persist the variants to disk.
 * This is shared by batch rendering, watch mode, and CLI single-file flows.
 */
export async function renderDiagramFileToDisk(
  file: DiagramFile,
  options: RenderOptions & { config?: DiagramkitConfig; outDir?: string } = {},
): Promise<string[]> {
  const result = await renderFile(file.path, options)
  const outDir = options.outDir ?? ensureDiagramsDir(file.dir, options.config)
  return writeRenderResult(file.name, outDir, result)
}

/**
 * Render all diagrams in a directory tree.
 * Outputs go to sibling .diagrams/ hidden folders (configurable via config).
 */
export async function renderAll(opts: BatchOptions = {}): Promise<void> {
  const contentDir = opts.dir ?? process.cwd()
  const config = loadConfig(opts.config, contentDir)
  const format = opts.format ?? config.defaultFormat
  const theme = opts.theme ?? config.defaultTheme

  const allFiles = findDiagramFiles(contentDir, config)

  if (allFiles.length === 0) {
    console.log('No diagram files found.')
    return
  }

  let filtered = allFiles
  if (opts.type) {
    filtered = filterByType(filtered, opts.type, config)
  }

  const stale = filterStaleFiles(filtered, opts.force ?? false, format, config, theme)

  if (stale.length === 0) {
    console.log(`All ${filtered.length} diagrams up-to-date (skipped)`)
  } else {
    if (!opts.force && stale.length < filtered.length) {
      console.log(
        `${filtered.length - stale.length} diagrams up-to-date, ${stale.length} need rendering`,
      )
    }

    let rendered = 0
    const successful: DiagramFile[] = []

    for (const file of stale) {
      try {
        await renderDiagramFileToDisk(file, {
          format,
          theme,
          quality: opts.quality,
          scale: opts.scale,
          contrastOptimize: opts.contrastOptimize,
          mermaidDarkTheme: opts.mermaidDarkTheme,
          config,
        })
        successful.push(file)
        rendered++
      } catch (err: any) {
        console.warn(`  FAIL: ${basename(file.path)} — ${err.message}`)
      }
    }

    if (successful.length > 0) {
      updateManifest(successful, format, config, theme)
    }

    console.log(
      `Rendered ${rendered}/${stale.length} diagram${stale.length === 1 ? '' : 's'} to ${format}`,
    )
  }

  cleanOrphans(allFiles, config)
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
