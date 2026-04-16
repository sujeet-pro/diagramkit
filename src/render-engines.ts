import type { Page } from 'playwright'
import { postProcessDarkSvg } from './color/contrast'
import { renderGraphviz } from './graphviz'
import { defaultMermaidDarkTheme } from './mermaid-theme'
import type { BrowserPool } from './pool'
import { DiagramkitError } from './types'
import type { DiagramType, Theme } from './types'

export interface SvgRenderContext {
  source: string
  theme: Theme
  contrastOptimize: boolean
  renderId: string
  mermaidDarkTheme?: Record<string, string>
  pool?: BrowserPool
}

export interface SvgRenderOutput {
  lightSvg?: string
  darkSvg?: string
}

type EngineRenderer = (ctx: SvgRenderContext) => Promise<SvgRenderOutput>

type MermaidGlobal = {
  mermaid: {
    render: (id: string, diagram: string, container: unknown) => Promise<{ svg: string }>
  }
}

type ExcalidrawGlobal = {
  __renderExcalidraw: (json: string, darkMode: boolean) => Promise<string>
}

type DrawioGlobal = {
  __renderDrawio: (xml: string, darkMode: boolean) => string
}

const pageRenderQueues = new WeakMap<BrowserPool, Map<string, Promise<void>>>()

async function withPageRenderLock<T>(
  pool: BrowserPool,
  key: string,
  run: () => Promise<T>,
): Promise<T> {
  let poolQueues = pageRenderQueues.get(pool)
  if (!poolQueues) {
    poolQueues = new Map()
    pageRenderQueues.set(pool, poolQueues)
  }

  const prev = poolQueues.get(key) ?? Promise.resolve()
  let release: (() => void) | undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const next = prev.catch(() => undefined).then(() => gate)
  poolQueues.set(key, next)

  await prev.catch(() => undefined)
  try {
    return await run()
  } finally {
    release?.()
    if (poolQueues.get(key) === next) {
      poolQueues.delete(key)
      if (poolQueues.size === 0) {
        pageRenderQueues.delete(pool)
      }
    }
  }
}

async function renderMermaidPage(page: Page, diagram: string, id: string): Promise<string> {
  return page.evaluate(
    async ({ input, renderId }) => {
      const globals = globalThis as unknown as MermaidGlobal
      const container = document.getElementById('container') as { innerHTML: string }
      container.innerHTML = ''
      const { svg } = await globals.mermaid.render(renderId, input, container)
      return svg
    },
    { input: diagram, renderId: id },
  )
}

async function renderExcalidrawPage(page: Page, json: string, darkMode: boolean): Promise<string> {
  return page.evaluate(
    async ({ input, isDark }) => {
      const globals = globalThis as unknown as ExcalidrawGlobal
      return globals.__renderExcalidraw(input, isDark)
    },
    { input: json, isDark: darkMode },
  )
}

async function renderDrawioPage(page: Page, xml: string, darkMode: boolean): Promise<string> {
  return page.evaluate(
    ({ input, isDark }) => {
      const globals = globalThis as unknown as DrawioGlobal
      return globals.__renderDrawio(input, isDark)
    },
    { input: xml, isDark: darkMode },
  )
}

const browserEngineRenderers: Record<'mermaid' | 'excalidraw' | 'drawio', EngineRenderer> = {
  mermaid: async (ctx) => {
    if (!ctx.pool)
      throw new DiagramkitError('RENDER_FAILED', 'Browser pool is required for mermaid rendering')
    const trimmed = ctx.source.trim()
    let lightSvg: string | undefined
    let darkSvg: string | undefined

    if (ctx.theme === 'both') {
      const darkTheme = ctx.mermaidDarkTheme ?? defaultMermaidDarkTheme
      const [lightPage, darkPage] = await Promise.all([
        ctx.pool.getMermaidLightPage(),
        ctx.pool.getMermaidDarkPage(darkTheme),
      ])
      const [rawLight, rawDark] = await Promise.all([
        withPageRenderLock(ctx.pool, 'mermaid-light', () =>
          renderMermaidPage(lightPage, trimmed, `${ctx.renderId}-light`),
        ),
        withPageRenderLock(ctx.pool, 'mermaid-dark', () =>
          renderMermaidPage(darkPage, trimmed, `${ctx.renderId}-dark`),
        ),
      ])
      lightSvg = rawLight
      darkSvg = ctx.contrastOptimize ? postProcessDarkSvg(rawDark) : rawDark
      return { lightSvg, darkSvg }
    }

    if (ctx.theme === 'light') {
      const page = await ctx.pool.getMermaidLightPage()
      const raw = await withPageRenderLock(ctx.pool, 'mermaid-light', () =>
        renderMermaidPage(page, trimmed, `${ctx.renderId}-light`),
      )
      lightSvg = raw
      return { lightSvg, darkSvg }
    }

    if (ctx.theme === 'dark') {
      const darkTheme = ctx.mermaidDarkTheme ?? defaultMermaidDarkTheme
      const page = await ctx.pool.getMermaidDarkPage(darkTheme)
      const rawDark = await withPageRenderLock(ctx.pool, 'mermaid-dark', () =>
        renderMermaidPage(page, trimmed, `${ctx.renderId}-dark`),
      )
      darkSvg = ctx.contrastOptimize ? postProcessDarkSvg(rawDark) : rawDark
    }

    return { lightSvg, darkSvg }
  },
  excalidraw: async (ctx) => {
    if (!ctx.pool)
      throw new DiagramkitError(
        'RENDER_FAILED',
        'Browser pool is required for excalidraw rendering',
      )
    const page = await ctx.pool.getExcalidrawPage()
    const lightSvg =
      ctx.theme === 'light' || ctx.theme === 'both'
        ? await withPageRenderLock(ctx.pool, 'excalidraw', () =>
            renderExcalidrawPage(page, ctx.source, false),
          )
        : undefined
    let darkSvg =
      ctx.theme === 'dark' || ctx.theme === 'both'
        ? await withPageRenderLock(ctx.pool, 'excalidraw', () =>
            renderExcalidrawPage(page, ctx.source, true),
          )
        : undefined
    if (darkSvg && ctx.contrastOptimize) {
      darkSvg = postProcessDarkSvg(darkSvg)
    }
    return { lightSvg, darkSvg }
  },
  drawio: async (ctx) => {
    if (!ctx.pool)
      throw new DiagramkitError('RENDER_FAILED', 'Browser pool is required for drawio rendering')
    const page = await ctx.pool.getDrawioPage()
    const lightSvg =
      ctx.theme === 'light' || ctx.theme === 'both'
        ? await withPageRenderLock(ctx.pool, 'drawio', () =>
            renderDrawioPage(page, ctx.source, false),
          )
        : undefined
    let darkSvg =
      ctx.theme === 'dark' || ctx.theme === 'both'
        ? await withPageRenderLock(ctx.pool, 'drawio', () =>
            renderDrawioPage(page, ctx.source, true),
          )
        : undefined
    if (darkSvg && ctx.contrastOptimize) {
      darkSvg = postProcessDarkSvg(darkSvg)
    }
    return { lightSvg, darkSvg }
  },
}

const graphvizRenderer: EngineRenderer = async (ctx) => {
  const rendered = await renderGraphviz(ctx.source, {
    theme: ctx.theme,
    contrastOptimize: ctx.contrastOptimize,
  })
  return { lightSvg: rendered.lightSvg, darkSvg: rendered.darkSvg }
}

export const engineRenderers: Record<DiagramType, EngineRenderer> = {
  mermaid: browserEngineRenderers.mermaid,
  excalidraw: browserEngineRenderers.excalidraw,
  drawio: browserEngineRenderers.drawio,
  graphviz: graphvizRenderer,
}
