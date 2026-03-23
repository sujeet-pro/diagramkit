import { readFileSync, renameSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import type { Page } from 'playwright'
import { postProcessDarkSvg } from '../color/contrast'
import { ensureDiagramsDir } from '../manifest'
import { getPool } from '../pool'
import type { DiagramFile, DiagramRenderer, RendererOptions } from '../types'

/* ── Dark theme variables (matches typical dark mode palette) ── */

const mermaidDarkTheme: Record<string, string> = {
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

/** Render a mermaid diagram string to SVG using a Playwright page. */
async function renderMermaidInPage(page: Page, diagram: string, id: string): Promise<string> {
  return page.evaluate(
    async ({ diagram, id }: { diagram: string; id: string }) => {
      const container = (document as any).getElementById('container')!
      container.innerHTML = ''
      const { svg } = await (globalThis as any).mermaid.render(id, diagram, container)
      return svg as string
    },
    { diagram, id },
  )
}

/** Atomic write: write to .tmp then rename. */
function atomicWrite(path: string, content: string): void {
  const tmp = path + '.tmp'
  writeFileSync(tmp, content)
  renameSync(tmp, path)
}

export class MermaidRenderer implements DiagramRenderer {
  name = 'mermaid'
  extensions = ['.mermaid', '.mmd', '.mmdc']

  async renderBatch(files: DiagramFile[], options?: RendererOptions): Promise<void> {
    if (files.length === 0) return

    const start = performance.now()
    console.log(`Rendering ${files.length} mermaid diagram${files.length > 1 ? 's' : ''}...`)

    const pool = getPool()
    await pool.acquire()

    try {
      const [lightPage, darkPage] = await Promise.all([
        pool.getMermaidLightPage(),
        pool.getMermaidDarkPage(mermaidDarkTheme),
      ])

      let rendered = 0
      let failed = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        const diagram = readFileSync(file.path, 'utf-8').trim()
        const id = `diagram-${i}`

        try {
          const [lightSvg, darkSvg] = await Promise.all([
            renderMermaidInPage(lightPage, diagram, `${id}-light`),
            renderMermaidInPage(darkPage, diagram, `${id}-dark`),
          ])

          const outDir = ensureDiagramsDir(file.dir, options?.config)
          atomicWrite(join(outDir, `${file.name}-light.svg`), lightSvg)
          atomicWrite(join(outDir, `${file.name}-dark.svg`), postProcessDarkSvg(darkSvg))
          rendered++
        } catch (err: any) {
          console.warn(`  FAIL: ${basename(file.path)} — ${err.message}`)
          failed++
        }
      }

      const elapsed = (performance.now() - start).toFixed(0)
      console.log(
        `  ${rendered} mermaid rendered in ${elapsed}ms` +
          (failed > 0 ? ` (${failed} failed)` : ''),
      )
    } finally {
      pool.release()
    }
  }

  async renderSingle(file: DiagramFile, options?: RendererOptions): Promise<void> {
    const pool = getPool()
    await pool.acquire()

    try {
      const [lightPage, darkPage] = await Promise.all([
        pool.getMermaidLightPage(),
        pool.getMermaidDarkPage(mermaidDarkTheme),
      ])

      const diagram = readFileSync(file.path, 'utf-8').trim()
      const id = `single-${file.name}`

      const [lightSvg, darkSvg] = await Promise.all([
        renderMermaidInPage(lightPage, diagram, `${id}-light`),
        renderMermaidInPage(darkPage, diagram, `${id}-dark`),
      ])

      const outDir = ensureDiagramsDir(file.dir, options?.config)
      atomicWrite(join(outDir, `${file.name}-light.svg`), lightSvg)
      atomicWrite(join(outDir, `${file.name}-dark.svg`), postProcessDarkSvg(darkSvg))
      console.log(`  Rendered: ${file.name}`)
    } finally {
      pool.release()
    }
  }
}
