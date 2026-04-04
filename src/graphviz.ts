import { instance, type Viz } from '@viz-js/viz'
import { postProcessDarkSvg } from './color/contrast'

const GRAPHVIZ_DARK_STROKE = '#94a3b8'
const GRAPHVIZ_DARK_TEXT = '#e5e7eb'

let vizPromise: Promise<Viz> | null = null

async function getViz(): Promise<Viz> {
  if (!vizPromise) vizPromise = instance()
  return vizPromise
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
 */
export function adaptGraphvizSvgForDarkMode(svg: string): string {
  return svg
    .replace(/<text\b([^>]*?)\bfill="black"([^>]*)>/g, `<text$1 fill="${GRAPHVIZ_DARK_TEXT}"$2>`)
    .replace(
      /<text\b([^>]*?)\bfill="#(?:000|000000)"([^>]*)>/gi,
      `<text$1 fill="${GRAPHVIZ_DARK_TEXT}"$2>`,
    )
    .replace(/<text\b(?![^>]*\bfill=)([^>]*)>/g, `<text$1 fill="${GRAPHVIZ_DARK_TEXT}">`)
    .replace(/stroke="black"/g, `stroke="${GRAPHVIZ_DARK_STROKE}"`)
    .replace(/stroke="#(?:000|000000)"/gi, `stroke="${GRAPHVIZ_DARK_STROKE}"`)
    .replace(/fill="black"/g, `fill="${GRAPHVIZ_DARK_STROKE}"`)
    .replace(/fill="#(?:000|000000)"/gi, `fill="${GRAPHVIZ_DARK_STROKE}"`)
}

export async function renderGraphviz(
  source: string,
  options: { theme?: 'light' | 'dark' | 'both'; contrastOptimize?: boolean } = {},
): Promise<{ lightSvg?: string; darkSvg?: string }> {
  const theme = options.theme ?? 'both'
  const contrastOptimize = options.contrastOptimize ?? true
  const viz = await getViz()
  const preparedSource = injectGraphvizDefaults(source.trim())

  let lightSvg: string | undefined
  let darkSvg: string | undefined

  if (theme === 'light' || theme === 'both') {
    lightSvg = viz.renderString(preparedSource, { format: 'svg' })
  }

  if (theme === 'dark' || theme === 'both') {
    darkSvg = viz.renderString(preparedSource, { format: 'svg' })
    if (contrastOptimize) {
      darkSvg = postProcessDarkSvg(darkSvg)
    }
    darkSvg = adaptGraphvizSvgForDarkMode(darkSvg)
  }

  return { lightSvg, darkSvg }
}
