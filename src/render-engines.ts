import type { Page } from 'playwright'
import { postProcessDarkSvg } from './color/contrast'
import { renderGraphviz } from './graphviz'
import {
  flipFlowchartDirection,
  getFlowchartDirective,
  injectElkInit,
  isRatioInBand,
  parseSvgViewBoxRatio,
  pickClosestToTarget,
} from './mermaid-layout'
import { defaultMermaidDarkTheme } from './mermaid-theme'
import type { BrowserPool } from './pool'
import { DiagramkitError } from './types'
import type { DiagramType, MermaidLayoutOptions, Theme } from './types'

export interface SvgRenderContext {
  source: string
  theme: Theme
  contrastOptimize: boolean
  renderId: string
  mermaidDarkTheme?: Record<string, string>
  /** Resolved mermaid layout options. The renderer treats `undefined` as `{ mode: 'off' }`. */
  mermaidLayout?: Required<MermaidLayoutOptions>
  /** Optional warn callback used for non-fatal layout messages (e.g. ratio out of band). */
  warn?: (message: string) => void
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

type MermaidThemeKind = 'light' | 'dark'

async function renderMermaidForTheme(
  ctx: SvgRenderContext,
  themeKind: MermaidThemeKind,
  source: string,
  idSuffix: string,
): Promise<string> {
  const pool = ctx.pool!
  if (themeKind === 'light') {
    const page = await pool.getMermaidLightPage()
    return withPageRenderLock(pool, 'mermaid-light', () =>
      renderMermaidPage(page, source, `${ctx.renderId}-${idSuffix}`),
    )
  }
  const darkTheme = ctx.mermaidDarkTheme ?? defaultMermaidDarkTheme
  const page = await pool.getMermaidDarkPage(darkTheme)
  return withPageRenderLock(pool, 'mermaid-dark', () =>
    renderMermaidPage(page, source, `${ctx.renderId}-${idSuffix}`),
  )
}

interface RebalanceAttempt {
  label: 'original' | 'flip' | 'elk' | 'flip+elk'
  source: string
  svg: string
  ratio: number | null
}

/**
 * Apply the configured aspect-ratio rebalance strategy. The first render is
 * the caller's already-rendered SVG; we may produce additional renders against
 * the probe theme and pick the best source variant.
 *
 * Returns the chosen source string plus the rendered SVG for the probe theme.
 * Callers that need the other theme should re-render with the chosen source.
 */
async function rebalanceMermaidSource(
  ctx: SvgRenderContext,
  probeTheme: MermaidThemeKind,
  trimmedSource: string,
  initialSvg: string,
): Promise<{ source: string; svg: string; ratio: number | null }> {
  const layout = ctx.mermaidLayout
  const initialRatio = parseSvgViewBoxRatio(initialSvg)

  // No layout config or 'off' mode: short-circuit. We always return the original render untouched.
  if (!layout || layout.mode === 'off') {
    return { source: trimmedSource, svg: initialSvg, ratio: initialRatio }
  }

  // Ratio could not be measured (degenerate SVG) — nothing to rebalance against.
  if (initialRatio === null) {
    return { source: trimmedSource, svg: initialSvg, ratio: null }
  }

  // Already inside the tolerance band: keep the original.
  if (isRatioInBand(initialRatio, layout.targetAspectRatio, layout.tolerance)) {
    return { source: trimmedSource, svg: initialSvg, ratio: initialRatio }
  }

  // Build the human-readable warning once; emitted for warn-only mode and as the
  // baseline for rebalance modes that fall back to the original.
  const warnMessage = formatRatioWarning(initialRatio, layout.targetAspectRatio, layout.tolerance)

  if (layout.mode === 'warn') {
    ctx.warn?.(warnMessage)
    return { source: trimmedSource, svg: initialSvg, ratio: initialRatio }
  }

  // For flip/elk/auto we need a flowchart directive to be present. Other diagram
  // kinds degrade to warn-only (we cannot safely rewrite their layout).
  const directive = getFlowchartDirective(trimmedSource)
  if (!directive) {
    ctx.warn?.(`${warnMessage} (rebalance skipped: not a flowchart)`)
    return { source: trimmedSource, svg: initialSvg, ratio: initialRatio }
  }

  const attempts: RebalanceAttempt[] = [
    { label: 'original', source: trimmedSource, svg: initialSvg, ratio: initialRatio },
  ]

  // Helper that renders a candidate source for the probe theme and records the result.
  const tryCandidate = async (
    label: RebalanceAttempt['label'],
    source: string,
  ): Promise<RebalanceAttempt | null> => {
    if (source === trimmedSource) return null
    try {
      const svg = await renderMermaidForTheme(ctx, probeTheme, source, label)
      const ratio = parseSvgViewBoxRatio(svg)
      const attempt: RebalanceAttempt = { label, source, svg, ratio }
      attempts.push(attempt)
      return attempt
    } catch (err: unknown) {
      // Never let a rebalance attempt break a successful initial render.
      const detail = err instanceof Error ? err.message : String(err)
      ctx.warn?.(`mermaid layout rebalance attempt "${label}" failed: ${detail}`)
      return null
    }
  }

  if (layout.mode === 'flip' || layout.mode === 'auto') {
    const flipped = flipFlowchartDirection(trimmedSource)
    if (flipped) await tryCandidate('flip', flipped)
  }

  // For 'auto', only fall through to ELK if the flipped attempt did not bring us inside the band.
  const flipAttempt = attempts.find((a) => a.label === 'flip')
  const flipInBand =
    flipAttempt &&
    flipAttempt.ratio !== null &&
    isRatioInBand(flipAttempt.ratio, layout.targetAspectRatio, layout.tolerance)

  if (layout.mode === 'elk' || (layout.mode === 'auto' && !flipInBand)) {
    const elkSource = injectElkInit(trimmedSource, layout.targetAspectRatio)
    await tryCandidate('elk', elkSource)
    // 'auto' may also try flipped+ELK as a last resort when neither alone helped.
    if (layout.mode === 'auto') {
      const flipped = flipFlowchartDirection(trimmedSource)
      if (flipped) {
        const elkFlipped = injectElkInit(flipped, layout.targetAspectRatio)
        await tryCandidate('flip+elk', elkFlipped)
      }
    }
  }

  const measurable = attempts
    .filter((a): a is RebalanceAttempt & { ratio: number } => a.ratio !== null)
    .map((a) => ({ ratio: a.ratio, payload: a }))
  const best = pickClosestToTarget(layout.targetAspectRatio, measurable)
  const chosen = best?.payload ?? attempts[0]!

  if (chosen.label !== 'original') {
    ctx.warn?.(
      `${warnMessage} — rebalanced via "${chosen.label}" to ratio ${formatRatio(chosen.ratio)}.`,
    )
  } else {
    // Rebalance was attempted but the original was still the closest match; surface that fact.
    ctx.warn?.(`${warnMessage} (rebalance attempted but original layout was closest to target)`)
  }

  return { source: chosen.source, svg: chosen.svg, ratio: chosen.ratio }
}

function formatRatio(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return 'unknown'
  return ratio >= 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`
}

function formatRatioWarning(ratio: number, target: number, tolerance: number): string {
  const lower = target / tolerance
  const upper = target * tolerance
  return (
    `mermaid render aspect ratio ${formatRatio(ratio)} is outside the configured band ` +
    `[${formatRatio(lower)}, ${formatRatio(upper)}] (target ${formatRatio(target)}).`
  )
}

const browserEngineRenderers: Record<'mermaid' | 'excalidraw' | 'drawio', EngineRenderer> = {
  mermaid: async (ctx) => {
    if (!ctx.pool)
      throw new DiagramkitError('RENDER_FAILED', 'Browser pool is required for mermaid rendering')
    const trimmed = ctx.source.trim()
    let lightSvg: string | undefined
    let darkSvg: string | undefined

    const needsLight = ctx.theme === 'light' || ctx.theme === 'both'
    const needsDark = ctx.theme === 'dark' || ctx.theme === 'both'

    // Fast path: 'off' and 'warn' modes never rewrite the source, so we can render both
    // themes in parallel exactly like before. 'warn' just measures and emits a notice.
    const mode = ctx.mermaidLayout?.mode ?? 'off'
    const isFastPath = mode === 'off' || mode === 'warn'

    if (isFastPath) {
      const [rawLight, rawDark] = await Promise.all([
        needsLight
          ? renderMermaidForTheme(ctx, 'light', trimmed, 'light')
          : Promise.resolve(undefined),
        needsDark
          ? renderMermaidForTheme(ctx, 'dark', trimmed, 'dark')
          : Promise.resolve(undefined),
      ])
      if (rawLight !== undefined) lightSvg = rawLight
      if (rawDark !== undefined) {
        darkSvg = ctx.contrastOptimize ? postProcessDarkSvg(rawDark) : rawDark
      }

      if (mode === 'warn' && ctx.mermaidLayout) {
        const probe = rawLight ?? rawDark
        if (probe) {
          const ratio = parseSvgViewBoxRatio(probe)
          if (
            ratio !== null &&
            !isRatioInBand(ratio, ctx.mermaidLayout.targetAspectRatio, ctx.mermaidLayout.tolerance)
          ) {
            ctx.warn?.(
              formatRatioWarning(
                ratio,
                ctx.mermaidLayout.targetAspectRatio,
                ctx.mermaidLayout.tolerance,
              ),
            )
          }
        }
      }

      return { lightSvg, darkSvg }
    }

    // Rebalance path: measure one probe theme, pick the best source variant once,
    // then re-render the other theme with the same source so light and dark match.
    const probeTheme: MermaidThemeKind = needsLight ? 'light' : 'dark'
    const initialProbeSvg = await renderMermaidForTheme(ctx, probeTheme, trimmed, probeTheme)
    const rebalanced = await rebalanceMermaidSource(ctx, probeTheme, trimmed, initialProbeSvg)
    const finalSource = rebalanced.source
    const probeSvg = rebalanced.svg

    if (probeTheme === 'light') {
      lightSvg = probeSvg
      if (needsDark) {
        const rawDark = await renderMermaidForTheme(ctx, 'dark', finalSource, 'dark')
        darkSvg = ctx.contrastOptimize ? postProcessDarkSvg(rawDark) : rawDark
      }
    } else {
      darkSvg = ctx.contrastOptimize ? postProcessDarkSvg(probeSvg) : probeSvg
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
