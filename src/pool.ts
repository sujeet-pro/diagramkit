import { createHash, randomBytes } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser, BrowserContext, Page } from 'playwright'
import { DiagramkitError, type Logger } from './types'

const IDLE_TIMEOUT_MS = 5_000
const DEBUG_LOG_ENABLED = process.env.DIAGRAMKIT_DEBUG === '1'

function debugLog(message: string, err?: unknown): void {
  if (!DEBUG_LOG_ENABLED) return
  const details =
    err instanceof Error
      ? err.message
      : err === undefined
        ? ''
        : typeof err === 'string'
          ? err
          : JSON.stringify(err)
  process.stderr.write(`[diagramkit:pool] ${message}${details ? `: ${details}` : ''}\n`)
}

function createPoolStateError(): DiagramkitError {
  return new DiagramkitError(
    'RENDER_FAILED',
    'BrowserPool not acquired. Call acquire() before requesting a renderer page.',
  )
}

/**
 * Shared browser pool for diagram rendering.
 * Manages a single Chromium instance with reusable pages for
 * mermaid (light + dark), excalidraw, and draw.io rendering.
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
  private excalidrawPageInit: Promise<Page> | null = null
  private drawioPageInit: Promise<Page> | null = null

  async acquire(): Promise<void> {
    this.refCount++
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    // Wait for an in-flight idle disposal to finish before re-launching
    if (this.disposing && this.launching) {
      try {
        await this.launching
      } catch {
        /* disposal cleanup — ignored */
      }
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

  private disposing = false

  async dispose(force = false): Promise<void> {
    // Idle timer can fire while a new acquire() is in progress — bail unless forced
    if (!force && this.refCount > 0) return
    this.disposing = true
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    // Wait for any in-flight launch so we don't leak a browser that resolves after nulling
    if (this.launching) {
      try {
        await this.launching
      } catch (err) {
        debugLog('launch wait failed during dispose', err)
      }
      this.launching = null
    }
    // Close open pages explicitly before dropping references
    try {
      await Promise.allSettled([
        this.mermaidLightPage?.close(),
        this.mermaidDarkPage?.close(),
        this.excalidrawPage?.close(),
        this.drawioPage?.close(),
      ])
    } catch (err) {
      debugLog('page close failed during dispose', err)
    }
    this.mermaidLightPage = null
    this.mermaidDarkPage = null
    this.excalidrawPage = null
    this.drawioPage = null
    this.excalidrawPageInit = null
    this.drawioPageInit = null
    this.mermaidDarkThemeVars = null
    this.context = null
    if (this.browser) {
      const b = this.browser
      this.browser = null
      await b.close()
    }
    this.disposing = false
  }

  private async launch(): Promise<void> {
    try {
      const { chromium } = await import('playwright')
      this.browser = await chromium.launch()
      // Required to inject IIFE bundles and mermaid scripts. Pages must never navigate to external URLs.
      this.context = await this.browser.newContext({ bypassCSP: true })
      // Defense-in-depth: block all external network requests from browser pages
      await this.context.route('**', (route) => route.abort())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Executable doesn't exist") || msg.includes('browserType.launch')) {
        throw new DiagramkitError(
          'BROWSER_LAUNCH_FAILED',
          'Chromium browser not found. Run "diagramkit warmup" to install it.\n' +
            '  Original error: ' +
            msg,
        )
      }
      throw new DiagramkitError('BROWSER_LAUNCH_FAILED', `Failed to launch browser: ${msg}`, {
        cause: err instanceof Error ? err : undefined,
      })
    }
  }

  /* ── Mermaid pages ── */

  async getMermaidLightPage(): Promise<Page> {
    if (!this.context) throw createPoolStateError()
    if (!this.mermaidLightPage || this.mermaidLightPage.isClosed()) {
      this.mermaidLightPage = await this.createMermaidPage('default')
    }
    return this.mermaidLightPage
  }

  async getMermaidDarkPage(themeVariables: Record<string, string>): Promise<Page> {
    if (!this.context) throw createPoolStateError()
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

  async getExcalidrawPage(warn?: Logger['warn']): Promise<Page> {
    if (!this.context) throw createPoolStateError()
    if (this.excalidrawPage && !this.excalidrawPage.isClosed()) {
      return this.excalidrawPage
    }
    if (this.excalidrawPageInit) return this.excalidrawPageInit
    this.excalidrawPageInit = (async () => {
      const bundle = await this.getExcalidrawBundle(warn)
      const page = await this.createExcalidrawPage(bundle)
      this.excalidrawPage = page
      return page
    })()
    try {
      return await this.excalidrawPageInit
    } finally {
      this.excalidrawPageInit = null
    }
  }

  private async getExcalidrawBundle(warn: Logger['warn'] = console.warn): Promise<string> {
    if (this.excalidrawBundle) return this.excalidrawBundle

    try {
      const entryPath = await resolveRendererEntryPath('excalidraw-entry')

      this.excalidrawBundle = await buildOrReadCachedBundle('excalidraw-entry', entryPath)
      return this.excalidrawBundle
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      warn('Failed to build excalidraw bundle:', message)
      throw new DiagramkitError('BUNDLE_FAILED', `Failed to build excalidraw bundle: ${message}`, {
        cause: err instanceof Error ? err : undefined,
      })
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

  async getDrawioPage(warn?: Logger['warn']): Promise<Page> {
    if (!this.context) throw createPoolStateError()
    if (this.drawioPage && !this.drawioPage.isClosed()) {
      return this.drawioPage
    }
    if (this.drawioPageInit) return this.drawioPageInit
    this.drawioPageInit = (async () => {
      const bundle = await this.getDrawioBundle(warn)
      const page = await this.createDrawioPage(bundle)
      this.drawioPage = page
      return page
    })()
    try {
      return await this.drawioPageInit
    } finally {
      this.drawioPageInit = null
    }
  }

  private async getDrawioBundle(warn: Logger['warn'] = console.warn): Promise<string> {
    if (this.drawioBundle) return this.drawioBundle

    try {
      const entryPath = await resolveRendererEntryPath('drawio-entry')

      this.drawioBundle = await buildOrReadCachedBundle('drawio-entry', entryPath)
      return this.drawioBundle
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      warn('Failed to build draw.io bundle:', message)
      throw new DiagramkitError('BUNDLE_FAILED', `Failed to build draw.io bundle: ${message}`, {
        cause: err instanceof Error ? err : undefined,
      })
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

/* ── IIFE bundle disk cache ── */

const CACHE_DIR = 'node_modules/.cache/diagramkit'
const bundleBuilds = new Map<string, Promise<string>>()

function canUseDiskBundleCache(): boolean {
  if (process.env.DIAGRAMKIT_DISABLE_BUNDLE_CACHE === '1') return false
  if (process.env.VITEST === 'true') return false
  if (process.env.NODE_ENV === 'test') return false
  return true
}

function appendLockfileMtimes(hasher: ReturnType<typeof createHash>): void {
  for (const lockfileName of ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'] as const) {
    try {
      const lockfilePath = fileURLToPath(new URL(`../${lockfileName}`, import.meta.url))
      const lockMtime = statSync(lockfilePath).mtimeMs.toString()
      hasher.update(`${lockfileName}:${lockMtime}`)
    } catch {}
  }
}

async function buildOrReadCachedBundle(name: string, entryPath: string): Promise<string> {
  if (!canUseDiskBundleCache()) {
    const { rolldown } = await import('rolldown')
    const bundle = await rolldown({ input: entryPath, logLevel: 'silent' })
    const { output } = await bundle.generate({ format: 'iife' })
    const code = output[0]?.code
    if (!code) throw new Error(`Failed to generate ${name} IIFE bundle`)
    return code
  }

  // Cache key = SHA-256 of entry file content + lockfile mtimes so dependency updates invalidate cache
  const entryContent = readFileSync(entryPath)
  const hasher = createHash('sha256').update(entryContent)
  appendLockfileMtimes(hasher)
  const hash = hasher.digest('hex').slice(0, 12)
  const cacheFile = join(CACHE_DIR, `${name}-${hash}.iife.js`)

  if (existsSync(cacheFile)) return readFileSync(cacheFile, 'utf-8')

  if (bundleBuilds.has(cacheFile)) return bundleBuilds.get(cacheFile)!

  const buildPromise = (async () => {
    if (existsSync(cacheFile)) return readFileSync(cacheFile, 'utf-8')

    // Build with rolldown
    const { rolldown } = await import('rolldown')
    const bundle = await rolldown({ input: entryPath, logLevel: 'silent' })
    const { output } = await bundle.generate({ format: 'iife' })
    const code = output[0]?.code
    if (!code) throw new Error(`Failed to generate ${name} IIFE bundle`)

    // Write atomically to cache
    try {
      mkdirSync(CACHE_DIR, { recursive: true })

      // Remove stale cache files for this entry before writing the new one
      const prefix = `${name}-`
      const suffix = '.iife.js'
      for (const entry of readdirSync(CACHE_DIR)) {
        if (
          entry.startsWith(prefix) &&
          entry.endsWith(suffix) &&
          entry !== `${name}-${hash}${suffix}`
        ) {
          try {
            unlinkSync(join(CACHE_DIR, entry))
          } catch {}
        }
      }

      const tmp = cacheFile + '.tmp.' + randomBytes(4).toString('hex')
      writeFileSync(tmp, code)
      renameSync(tmp, cacheFile)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(`Warning: failed to write ${name} bundle cache: ${message}\n`)
    }

    return code
  })()

  bundleBuilds.set(cacheFile, buildPromise)
  try {
    return await buildPromise
  } finally {
    bundleBuilds.delete(cacheFile)
  }
}

async function resolveRendererEntryPath(
  entryName: 'drawio-entry' | 'excalidraw-entry',
): Promise<string> {
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

  throw new DiagramkitError(
    'BUNDLE_FAILED',
    `Renderer entry "${entryName}" not found in expected locations.`,
  )
}

// Singleton pool instance
let pool: BrowserPool | null = null
let signalHandlersRegistered = false

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

function registerSignalHandlers() {
  if (signalHandlersRegistered) return
  signalHandlersRegistered = true
  process.once('SIGINT', () => handleSignal('SIGINT'))
  process.once('SIGTERM', () => handleSignal('SIGTERM'))
  // 'exit' handler is synchronous — just null the reference, browser dies with parent
  process.on('exit', () => {
    pool = null
  })
}

export function getPool(): BrowserPool {
  if (!pool) {
    pool = new BrowserPool()
    registerSignalHandlers()
  }
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
