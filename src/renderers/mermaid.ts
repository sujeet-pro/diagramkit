import { readFileSync } from 'fs'
import { basename, join } from 'path'
import type { Page } from 'playwright'
import { postProcessDarkSvg } from '../color/contrast'
import { ensureDiagramsDir } from '../manifest'
import { atomicWrite } from '../output'
import { getPool } from '../pool'
import { defaultMermaidDarkTheme } from '../renderer'
import type { DiagramFile, DiagramRenderer, RendererOptions } from '../types'

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
        pool.getMermaidDarkPage(defaultMermaidDarkTheme),
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
          atomicWrite(join(outDir, `${file.name}-light.svg`), Buffer.from(lightSvg))
          atomicWrite(
            join(outDir, `${file.name}-dark.svg`),
            Buffer.from(postProcessDarkSvg(darkSvg)),
          )
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
        pool.getMermaidDarkPage(defaultMermaidDarkTheme),
      ])

      const diagram = readFileSync(file.path, 'utf-8').trim()
      const id = `single-${file.name}`

      const [lightSvg, darkSvg] = await Promise.all([
        renderMermaidInPage(lightPage, diagram, `${id}-light`),
        renderMermaidInPage(darkPage, diagram, `${id}-dark`),
      ])

      const outDir = ensureDiagramsDir(file.dir, options?.config)
      atomicWrite(join(outDir, `${file.name}-light.svg`), Buffer.from(lightSvg))
      atomicWrite(join(outDir, `${file.name}-dark.svg`), Buffer.from(postProcessDarkSvg(darkSvg)))
      console.log(`  Rendered: ${file.name}`)
    } finally {
      pool.release()
    }
  }
}
