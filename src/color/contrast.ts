import { hexToRgb, hslToHex, rgbToHsl } from './convert'
import { relativeLuminance } from './luminance'

/**
 * Elements whose `fill` paints glyphs, not a shape background. Their fills are
 * never *darkened*: in dark mode text must stay light to remain legible, and
 * darkening it (as the shape-background clamp does) destroys contrast — this is
 * exactly what made xychart-beta axis labels unreadable (`#e5e5e5` → `#404040`
 * on a `#111111` canvas).
 *
 * They ARE *lightened* when a glyph fill is near-black: Mermaid hardcodes
 * `fill="#000"` on gantt/timeline axis-tick labels (see the d3 axis emitter in
 * `mermaid.js`), which no theme variable can override, so black tick digits
 * would otherwise vanish on the dark canvas. Lightening near-black glyph fills
 * is the mirror image of the shape-background darken clamp and is safe: after
 * post-processing every shape fill is already dark (luminance ≤ 0.25), so any
 * background a glyph sits on is dark and light text always improves contrast.
 */
const TEXT_FILL_TAGS = new Set(['text', 'tspan'])

/** Luminance above which a fill is treated as "too light for a dark canvas". */
const DARK_FILL_LUMINANCE_THRESHOLD = 0.4

/**
 * Luminance below which a *glyph* fill is treated as "too dark for a dark
 * canvas" and lightened. Kept conservative so it only catches genuinely
 * near-black hardcoded fills (`#000`, `#111`, `#333`), never the injected
 * light theme text (`#cccccc` ≈ 0.60, `#e5e5e5` ≈ 0.79).
 */
const NEAR_BLACK_TEXT_LUMINANCE_THRESHOLD = 0.15

/**
 * Post-process a dark-mode SVG to fix light fill colors that produce poor contrast.
 * Finds fill:#hex values with high luminance and darkens them, preserving the hue
 * so colored nodes retain their visual identity. Handles both `style="fill:#hex"`
 * and `fill="#hex"` attribute forms.
 *
 * The rewrite is scoped per opening tag so that `<text>`/`<tspan>` fills (glyph
 * colors) are never darkened — only shape backgrounds are clamped.
 */
export function postProcessDarkSvg(svg: string): string {
  // Match each opening tag, capturing name + attribute run. The attribute pattern
  // tolerates `>` inside quoted values so we never split a tag mid-attribute.
  return svg.replace(
    /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g,
    (whole, tagName: string, attrs: string, selfClose: string) => {
      if (TEXT_FILL_TAGS.has(tagName.toLowerCase())) {
        return `<${tagName}${adjustAttrFills(attrs, lightenIfDark)}${selfClose}>`
      }
      return `<${tagName}${adjustAttrFills(attrs, darkenIfLight)}${selfClose}>`
    },
  )
}

/** A fill adjuster: returns a replacement hex, or `null` to leave the fill as-is. */
type FillAdjuster = (hex: string) => string | null

/** Apply a fill adjuster to every `fill` in a single tag's attribute run. */
function adjustAttrFills(attrs: string, adjust: FillAdjuster): string {
  // fill colors inside style="..." attributes
  let result = attrs.replace(/style="([^"]*)"/g, (_match, styleContent: string) => {
    return `style="${adjustStyleFills(styleContent, adjust)}"`
  })
  // fill colors inside style='...' attributes (single quotes)
  result = result.replace(/style='([^']*)'/g, (_match, styleContent: string) => {
    return `style='${adjustStyleFills(styleContent, adjust)}'`
  })
  // standalone fill="#hex" attributes (not inside style)
  result = result.replace(/fill="(#(?:[0-9a-fA-F]{3}){1,2})"/g, (match, hex: string) => {
    const adjusted = adjust(hex)
    return adjusted ? `fill="${adjusted}"` : match
  })
  return result
}

function adjustStyleFills(styleContent: string, adjust: FillAdjuster): string {
  return styleContent.replace(
    /fill\s*:\s*(#(?:[0-9a-fA-F]{3}){1,2})/g,
    (fillMatch, hex: string) => {
      const adjusted = adjust(hex)
      return adjusted ? `fill:${adjusted}` : fillMatch
    },
  )
}

/**
 * Return a darkened hue-preserving replacement for a fill that is too light for a
 * dark canvas, or `null` when the color is already dark enough / unparseable.
 */
function darkenIfLight(hex: string): string | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const [r, g, b] = rgb
  const lum = relativeLuminance(r, g, b)
  if (lum > DARK_FILL_LUMINANCE_THRESHOLD) {
    const [h, s] = rgbToHsl(r, g, b)
    return hslToHex(h, Math.min(s, 0.6), 0.25)
  }
  return null
}

/**
 * Return a lightened hue-preserving replacement for a *glyph* fill that is too
 * dark for a dark canvas, or `null` when the color is already light enough /
 * unparseable. Mirror image of {@link darkenIfLight}, applied only to
 * `<text>`/`<tspan>` fills (see {@link TEXT_FILL_TAGS}).
 */
function lightenIfDark(hex: string): string | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const [r, g, b] = rgb
  const lum = relativeLuminance(r, g, b)
  if (lum < NEAR_BLACK_TEXT_LUMINANCE_THRESHOLD) {
    const [h, s] = rgbToHsl(r, g, b)
    return hslToHex(h, Math.min(s, 0.6), 0.85)
  }
  return null
}
