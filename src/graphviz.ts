import { instance, type Viz } from '@viz-js/viz'
import { postProcessDarkSvg } from './color/contrast'
import { hexToRgb } from './color/convert'
import { relativeLuminance } from './color/luminance'

const GRAPHVIZ_DARK_STROKE = '#94a3b8'
const GRAPHVIZ_DARK_TEXT = '#e5e7eb'

/**
 * Treat anything with WCAG relative luminance below this threshold as
 * "dark text intended for a light background". The graphviz dark adapter
 * promotes such text fills to GRAPHVIZ_DARK_TEXT so they remain readable on
 * dark surfaces. 0.5 is intentionally generous: it catches `#333`, `#444`,
 * and similar mid-greys that would otherwise vanish on `#111111`.
 */
const DARK_TEXT_LUM_THRESHOLD = 0.5

let vizPromise: Promise<Viz> | null = null
let graphvizRenderQueue: Promise<void> = Promise.resolve()

async function getViz(): Promise<Viz> {
  if (!vizPromise) {
    vizPromise = instance().catch((err) => {
      vizPromise = null
      throw err
    })
  }
  return vizPromise
}

async function withGraphvizRenderLock<T>(render: () => Promise<T> | T): Promise<T> {
  const previous = graphvizRenderQueue
  let release: (() => void) | undefined
  graphvizRenderQueue = new Promise<void>((resolve) => {
    release = resolve
  })

  await previous.catch(() => {})
  try {
    return await render()
  } finally {
    release?.()
  }
}

/**
 * Graphviz defaults to a white page background in SVG output.
 * Inject a transparent background so the rendered asset inherits the target surface color.
 */
export function injectGraphvizDefaults(source: string): string {
  const openBraceIndex = source.indexOf('{')
  if (openBraceIndex === -1) return source

  const injection = '\n  graph [bgcolor="transparent"];\n'
  return `${source.slice(0, openBraceIndex + 1)}${injection}${source.slice(openBraceIndex + 1)}`
}

/**
 * Convert Graphviz's default black strokes/text into dark-surface-friendly colors.
 * This keeps explicitly colored elements intact while making unstyled DOT output readable.
 *
 * Beyond literal `black` / `#000`, any `<text>` whose `fill` resolves to a hex
 * color with WCAG luminance below `DARK_TEXT_LUM_THRESHOLD` is also promoted
 * to `GRAPHVIZ_DARK_TEXT`. This catches the common authoring mistake of
 * `fontcolor="#333333"` (great on light, invisible on dark) without forcing
 * authors to manage two color sets in their `.dot` source.
 */
export function adaptGraphvizSvgForDarkMode(svg: string): string {
  let result = svg
    .replace(/<text\b([^>]*?)\bfill="black"([^>]*)>/g, `<text$1 fill="${GRAPHVIZ_DARK_TEXT}"$2>`)
    .replace(/<text\b(?![^>]*\bfill=)([^>]*)>/g, `<text$1 fill="${GRAPHVIZ_DARK_TEXT}">`)
    .replace(/stroke="black"/g, `stroke="${GRAPHVIZ_DARK_STROKE}"`)
    .replace(/stroke="#(?:000|000000)"/gi, `stroke="${GRAPHVIZ_DARK_STROKE}"`)
    .replace(/fill="black"/g, `fill="${GRAPHVIZ_DARK_STROKE}"`)
    .replace(/fill="#(?:000|000000)"/gi, `fill="${GRAPHVIZ_DARK_STROKE}"`)

  // Promote any low-luminance hex text fill to the dark-friendly text color.
  result = result.replace(
    /(<text\b[^>]*?\bfill=")(#(?:[0-9a-fA-F]{3}){1,2})("[^>]*>)/g,
    (match, before: string, hex: string, after: string) => {
      const rgb = hexToRgb(hex)
      if (!rgb) return match
      const lum = relativeLuminance(rgb[0], rgb[1], rgb[2])
      if (lum < DARK_TEXT_LUM_THRESHOLD) {
        return `${before}${GRAPHVIZ_DARK_TEXT}${after}`
      }
      return match
    },
  )

  return result
}

export async function renderGraphviz(
  source: string,
  options: { theme?: 'light' | 'dark' | 'both'; contrastOptimize?: boolean } = {},
): Promise<{ lightSvg?: string; darkSvg?: string }> {
  return withGraphvizRenderLock(async () => {
    const theme = options.theme ?? 'both'
    const contrastOptimize = options.contrastOptimize ?? true
    const viz = await getViz()
    const preparedSource = injectGraphvizDefaults(source.trim())

    let lightSvg: string | undefined
    let darkSvg: string | undefined

    if (theme === 'both') {
      const baseSvg = viz.renderString(preparedSource, { format: 'svg' })
      lightSvg = baseSvg
      darkSvg = baseSvg
    } else if (theme === 'light') {
      lightSvg = viz.renderString(preparedSource, { format: 'svg' })
    } else if (theme === 'dark') {
      darkSvg = viz.renderString(preparedSource, { format: 'svg' })
    }

    if (darkSvg) {
      // postProcessDarkSvg runs first on the raw SVG (mostly black fills → no-op since luminance < 0.4),
      // then adaptGraphvizSvgForDarkMode sets purpose-built dark-friendly text/stroke colors.
      // This order is intentional: the adapted colors (#e5e7eb, #94a3b8) are already optimized
      // for dark backgrounds and must not be further darkened by the contrast optimizer.
      if (contrastOptimize) {
        darkSvg = postProcessDarkSvg(darkSvg)
      }
      darkSvg = adaptGraphvizSvgForDarkMode(darkSvg)
    }

    return { lightSvg, darkSvg }
  })
}
