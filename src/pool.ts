import type { Browser, BrowserContext, Page } from 'playwright'

const IDLE_TIMEOUT_MS = 5_000

/**
 * Shared browser pool for diagram rendering.
 * Manages a single Chromium instance with reusable pages for
 * mermaid (light + dark) and excalidraw rendering.
 *
 * Uses reference counting with idle timeout for lifecycle management:
 * - acquire() launches browser if needed, increments refCount
 * - release() decrements refCount, starts idle timer if zero
 * - dispose() force-closes everything
 */
export class BrowserPool {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private mermaidLightPage: Page | null = null
  private mermaidDarkPage: Page | null = null
  private excalidrawPage: Page | null = null
  private drawioPage: Page | null = null
  private refCount = 0
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private launching: Promise<void> | null = null

  private mermaidDarkThemeVars: string | null = null

  // Cached IIFE bundles
  private excalidrawBundle: string | null = null
  private drawioBundle: string | null = null

  async acquire(): Promise<void> {
    this.refCount++
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    if (!this.browser) {
      // Coalesce concurrent launches — only the caller that created the promise should clear it
      let isOwner = false
      if (!this.launching) {
        this.launching = this.launch()
        isOwner = true
      }
      try {
        await this.launching
      } catch (err) {
        this.refCount = Math.max(0, this.refCount - 1)
        throw err
      } finally {
        if (isOwner) this.launching = null
      }
    }
  }

  release(): void {
    this.refCount = Math.max(0, this.refCount - 1)
    if (this.refCount === 0) {
      this.idleTimer = setTimeout(() => {
        void this.dispose()
      }, IDLE_TIMEOUT_MS)
    }
  }

  async dispose(force = false): Promise<void> {
    // Idle timer can fire while a new acquire() is in progress — bail unless forced
    if (!force && this.refCount > 0) return
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    // Wait for any in-flight launch so we don't leak a browser that resolves after nulling
    if (this.launching) {
      try {
        await this.launching
      } catch {}
      this.launching = null
    }
    this.mermaidLightPage = null
    this.mermaidDarkPage = null
    this.excalidrawPage = null
    this.drawioPage = null
    this.mermaidDarkThemeVars = null
    this.context = null
    if (this.browser) {
      const b = this.browser
      this.browser = null
      await b.close()
    }
  }

  private async launch(): Promise<void> {
    try {
      const { chromium } = await import('playwright')
      this.browser = await chromium.launch()
      this.context = await this.browser.newContext({ bypassCSP: true })
    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes("Executable doesn't exist") || msg.includes('browserType.launch')) {
        throw new Error(
          'Chromium browser not found. Run "diagramkit warmup" to install it.\n' +
            '  Original error: ' +
            msg,
        )
      }
      throw err
    }
  }

  /* ── Mermaid pages ── */

  async getMermaidLightPage(): Promise<Page> {
    if (!this.context) throw new Error('BrowserPool not acquired')
    if (!this.mermaidLightPage || this.mermaidLightPage.isClosed()) {
      this.mermaidLightPage = await this.createMermaidPage('default')
    }
    return this.mermaidLightPage
  }

  async getMermaidDarkPage(themeVariables: Record<string, string>): Promise<Page> {
    if (!this.context) throw new Error('BrowserPool not acquired')
    const varsKey = JSON.stringify(themeVariables)
    if (
      !this.mermaidDarkPage ||
      this.mermaidDarkPage.isClosed() ||
      this.mermaidDarkThemeVars !== varsKey
    ) {
      if (this.mermaidDarkPage && !this.mermaidDarkPage.isClosed()) {
        await this.mermaidDarkPage.close()
      }
      this.mermaidDarkPage = await this.createMermaidPage('base', themeVariables)
      this.mermaidDarkThemeVars = varsKey
    }
    return this.mermaidDarkPage
  }

  private async createMermaidPage(
    theme: string,
    themeVariables?: Record<string, string>,
  ): Promise<Page> {
    const page = await this.context!.newPage()
    await page.setContent(
      '<!DOCTYPE html><html><head></head><body><div id="container"></div></body></html>',
    )

    // Load mermaid from node_modules
    const { fileURLToPath } = await import('url')
    const mermaidPath = fileURLToPath(import.meta.resolve('mermaid/dist/mermaid.js'))
    await page.addScriptTag({ path: mermaidPath })

    // Wait for mermaid to be available
    await page.waitForFunction(() => typeof (globalThis as any).mermaid !== 'undefined', null, {
      timeout: 15_000,
    })

    // Initialize with theme — securityLevel prevents crafted diagrams from executing JS
    const config = themeVariables
      ? { theme, themeVariables, startOnLoad: false, securityLevel: 'strict' }
      : { theme, startOnLoad: false, securityLevel: 'strict' }

    await page.evaluate((cfg) => {
      ;(globalThis as any).mermaid.initialize(cfg)
    }, config)

    return page
  }

  /* ── Excalidraw page ── */

  async getExcalidrawPage(): Promise<Page> {
    if (!this.context) throw new Error('BrowserPool not acquired')
    if (!this.excalidrawPage || this.excalidrawPage.isClosed()) {
      const bundle = await this.getExcalidrawBundle()
      if (!bundle) throw new Error('Excalidraw bundle unavailable')
      this.excalidrawPage = await this.createExcalidrawPage(bundle)
    }
    return this.excalidrawPage
  }

  private async getExcalidrawBundle(): Promise<string | null> {
    if (this.excalidrawBundle) return this.excalidrawBundle

    try {
      const entryPath = await resolveRendererEntryPath('excalidraw-entry')
      if (!entryPath) return null

      const { rolldown } = await import('rolldown')
      const bundle = await rolldown({ input: entryPath, logLevel: 'silent' })
      const { output } = await bundle.generate({ format: 'iife' })
      this.excalidrawBundle = output[0].code
      return this.excalidrawBundle
    } catch (err) {
      console.warn('Failed to build excalidraw bundle:', (err as Error).message)
      return null
    }
  }

  private async createExcalidrawPage(bundleCode: string): Promise<Page> {
    const page = await this.context!.newPage()
    await page.setContent('<!DOCTYPE html><html><body></body></html>')
    await page.addScriptTag({ content: bundleCode })
    await page.waitForFunction(() => (globalThis as any).__excalidrawReady === true, null, {
      timeout: 30_000,
    })
    return page
  }

  /* ── Draw.io page ── */

  async getDrawioPage(): Promise<Page> {
    if (!this.context) throw new Error('BrowserPool not acquired')
    if (!this.drawioPage || this.drawioPage.isClosed()) {
      const bundle = await this.getDrawioBundle()
      if (!bundle) throw new Error('Draw.io bundle unavailable')
      this.drawioPage = await this.createDrawioPage(bundle)
    }
    return this.drawioPage
  }

  private async getDrawioBundle(): Promise<string | null> {
    if (this.drawioBundle) return this.drawioBundle

    try {
      const entryPath = await resolveRendererEntryPath('drawio-entry')
      if (!entryPath) return null

      const { rolldown } = await import('rolldown')
      const bundle = await rolldown({ input: entryPath, logLevel: 'silent' })
      const { output } = await bundle.generate({ format: 'iife' })
      this.drawioBundle = output[0].code
      return this.drawioBundle
    } catch (err) {
      console.warn('Failed to build draw.io bundle:', (err as Error).message)
      return null
    }
  }

  private async createDrawioPage(bundleCode: string): Promise<Page> {
    const page = await this.context!.newPage()
    await page.setContent('<!DOCTYPE html><html><body></body></html>')
    await page.addScriptTag({ content: bundleCode })
    await page.waitForFunction(() => (globalThis as any).__drawioReady === true, null, {
      timeout: 30_000,
    })
    return page
  }
}

async function resolveRendererEntryPath(
  entryName: 'drawio-entry' | 'excalidraw-entry',
): Promise<string | null> {
  const { existsSync } = await import('fs')
  const { fileURLToPath } = await import('url')

  const candidates = [
    new URL(`./renderers/${entryName}.ts`, import.meta.url),
    new URL(`./renderers/${entryName}.mjs`, import.meta.url),
    new URL(`../src/renderers/${entryName}.ts`, import.meta.url),
    new URL(`../src/renderers/${entryName}.mjs`, import.meta.url),
  ]

  for (const candidate of candidates) {
    const path = fileURLToPath(candidate)
    if (existsSync(path)) return path
  }

  return null
}

// Singleton pool instance
let pool: BrowserPool | null = null

export function getPool(): BrowserPool {
  if (!pool) pool = new BrowserPool()
  return pool
}

/** Pre-warm the browser pool. */
export async function warmup(): Promise<void> {
  const p = getPool()
  await p.acquire()
  p.release()
}

/** Explicitly dispose the browser pool. */
export async function dispose(): Promise<void> {
  if (pool) {
    await pool.dispose(true)
    pool = null
  }
}

// Force-dispose on signals, then re-raise so the process exits with correct status
const signalCleanup = async () => {
  if (pool) {
    const p = pool
    pool = null
    await p.dispose(true)
  }
}

const handleSignal = (signal: NodeJS.Signals) => {
  void signalCleanup().finally(() => {
    process.kill(process.pid, signal)
  })
}
process.once('SIGINT', () => handleSignal('SIGINT'))
process.once('SIGTERM', () => handleSignal('SIGTERM'))
// 'exit' handler is synchronous — just null the reference, browser dies with parent
process.on('exit', () => {
  pool = null
})
