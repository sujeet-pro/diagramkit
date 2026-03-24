import { readFileSync } from 'fs'
import { join } from 'path'
import { postProcessDarkSvg } from '../color/contrast'
import { ensureDiagramsDir } from '../manifest'
import { atomicWrite } from '../output'
import { getPool } from '../pool'
import type { DiagramFile, DiagramRenderer, RendererOptions } from '../types'

export class DrawioRenderer implements DiagramRenderer {
  name = 'drawio'
  extensions = ['.drawio', '.drawio.xml', '.dio']

  async renderBatch(files: DiagramFile[], options?: RendererOptions): Promise<void> {
    if (files.length === 0) return

    const start = performance.now()
    console.log(`Rendering ${files.length} drawio diagram${files.length > 1 ? 's' : ''}...`)

    const pool = getPool()
    await pool.acquire()

    let page
    try {
      page = await pool.getDrawioPage()
    } catch {
      console.warn('  Draw.io rendering unavailable — bundle failed to load.')
      pool.release()
      return
    }

    let rendered = 0
    let failed = 0

    try {
      for (const file of files) {
        const xml = readFileSync(file.path, 'utf-8')
        const outDir = ensureDiagramsDir(file.dir, options?.config)
        let fileOk = true

        for (const darkMode of [false, true]) {
          const suffix = darkMode ? 'dark' : 'light'
          try {
            let svg: string = await page.evaluate(
              ({ xml, darkMode }) => {
                return (globalThis as any).__renderDrawio(xml, darkMode)
              },
              { xml, darkMode },
            )
            if (darkMode) svg = postProcessDarkSvg(svg)

            atomicWrite(join(outDir, `${file.name}-${suffix}.svg`), Buffer.from(svg))
          } catch (err: any) {
            console.warn(`  FAIL: ${file.name}-${suffix} — ${err.message}`)
            failed++
            fileOk = false
          }
        }
        if (fileOk) rendered++
      }

      const elapsed = (performance.now() - start).toFixed(0)
      console.log(
        `  ${rendered} drawio rendered in ${elapsed}ms` + (failed > 0 ? ` (${failed} failed)` : ''),
      )
    } finally {
      pool.release()
    }
  }

  async renderSingle(file: DiagramFile, options?: RendererOptions): Promise<void> {
    const pool = getPool()
    await pool.acquire()

    let page
    try {
      page = await pool.getDrawioPage()
    } catch {
      console.warn('  Draw.io rendering unavailable — bundle failed to load.')
      pool.release()
      return
    }

    try {
      const xml = readFileSync(file.path, 'utf-8')
      const outDir = ensureDiagramsDir(file.dir, options?.config)

      for (const darkMode of [false, true]) {
        const suffix = darkMode ? 'dark' : 'light'
        try {
          let svg: string = await page.evaluate(
            ({ xml, darkMode }) => {
              return (globalThis as any).__renderDrawio(xml, darkMode)
            },
            { xml, darkMode },
          )
          if (darkMode) svg = postProcessDarkSvg(svg)

          atomicWrite(join(outDir, `${file.name}-${suffix}.svg`), Buffer.from(svg))
        } catch (err: any) {
          console.warn(`  FAIL: ${file.name}-${suffix} — ${err.message}`)
        }
      }

      console.log(`  Rendered: ${file.name}`)
    } finally {
      pool.release()
    }
  }
}
