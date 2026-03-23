import { readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { ensureDiagramsDir } from '../manifest'
import { getPool } from '../pool'
import type { DiagramFile, DiagramRenderer, RendererOptions } from '../types'

/** Atomic write: write to .tmp then rename. */
function atomicWrite(path: string, content: string): void {
  const tmp = path + '.tmp'
  writeFileSync(tmp, content)
  renameSync(tmp, path)
}

export class ExcalidrawRenderer implements DiagramRenderer {
  name = 'excalidraw'
  extensions = ['.excalidraw']

  async renderBatch(files: DiagramFile[], options?: RendererOptions): Promise<void> {
    if (files.length === 0) return

    const start = performance.now()
    console.log(`Rendering ${files.length} excalidraw diagram${files.length > 1 ? 's' : ''}...`)

    const pool = getPool()
    await pool.acquire()

    let page
    try {
      page = await pool.getExcalidrawPage()
    } catch {
      console.warn(
        '  Excalidraw rendering unavailable.\n' +
          '  Install: npm add -D @excalidraw/excalidraw react react-dom',
      )
      pool.release()
      return
    }

    let rendered = 0
    let failed = 0

    try {
      for (const file of files) {
        const json = readFileSync(file.path, 'utf-8')
        const outDir = ensureDiagramsDir(file.dir, options?.config)

        for (const darkMode of [false, true]) {
          const suffix = darkMode ? 'dark' : 'light'
          try {
            const svg: string = await page.evaluate(
              async ({ json, darkMode }) => {
                return await (globalThis as any).__renderExcalidraw(json, darkMode)
              },
              { json, darkMode },
            )
            atomicWrite(join(outDir, `${file.name}-${suffix}.svg`), svg)
          } catch (err: any) {
            console.warn(`  FAIL: ${file.name}-${suffix} — ${err.message}`)
            failed++
          }
        }
        rendered++
      }

      const elapsed = (performance.now() - start).toFixed(0)
      console.log(
        `  ${rendered} excalidraw rendered in ${elapsed}ms` +
          (failed > 0 ? ` (${failed} failed)` : ''),
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
      page = await pool.getExcalidrawPage()
    } catch {
      pool.release()
      return
    }

    try {
      const json = readFileSync(file.path, 'utf-8')
      const outDir = ensureDiagramsDir(file.dir, options?.config)

      for (const darkMode of [false, true]) {
        const suffix = darkMode ? 'dark' : 'light'
        try {
          const svg: string = await page.evaluate(
            async ({ json, darkMode }) => {
              return await (globalThis as any).__renderExcalidraw(json, darkMode)
            },
            { json, darkMode },
          )
          atomicWrite(join(outDir, `${file.name}-${suffix}.svg`), svg)
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
