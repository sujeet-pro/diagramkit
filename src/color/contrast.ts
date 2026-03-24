import { hexToRgb, hslToHex, rgbToHsl } from './convert'
import { relativeLuminance } from './luminance'

/**
 * Post-process a dark-mode SVG to fix light fill colors that produce poor contrast.
 * Finds inline fill:#hex values with high luminance and darkens them,
 * preserving the hue so colored nodes retain their visual identity.
 * Handles both style="fill:#hex" and fill="#hex" attribute forms.
 */
export function postProcessDarkSvg(svg: string): string {
  // Process fill colors inside style="..." attributes
  let result = svg.replace(/style="([^"]*)"/g, (match, styleContent: string) => {
    const newStyle = styleContent.replace(
      /fill\s*:\s*(#(?:[0-9a-fA-F]{3}){1,2})/g,
      (fillMatch, hex: string) => {
        return adjustFillIfNeeded(fillMatch, hex)
      },
    )
    return `style="${newStyle}"`
  })

  // Also process style='...' attributes (single quotes)
  result = result.replace(/style='([^']*)'/g, (match, styleContent: string) => {
    const newStyle = styleContent.replace(
      /fill\s*:\s*(#(?:[0-9a-fA-F]{3}){1,2})/g,
      (fillMatch, hex: string) => {
        return adjustFillIfNeeded(fillMatch, hex)
      },
    )
    return `style='${newStyle}'`
  })

  // Process standalone fill="#hex" attributes (not inside style)
  result = result.replace(/fill="(#(?:[0-9a-fA-F]{3}){1,2})"/g, (match, hex: string) => {
    const rgb = hexToRgb(hex)
    if (!rgb) return match
    const [r, g, b] = rgb
    const lum = relativeLuminance(r, g, b)
    if (lum > 0.4) {
      const [h, s] = rgbToHsl(r, g, b)
      return `fill="${hslToHex(h, Math.min(s, 0.6), 0.25)}"`
    }
    return match
  })

  return result
}

function adjustFillIfNeeded(fillMatch: string, hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return fillMatch
  const [r, g, b] = rgb
  const lum = relativeLuminance(r, g, b)
  if (lum > 0.4) {
    const [h, s] = rgbToHsl(r, g, b)
    return `fill:${hslToHex(h, Math.min(s, 0.6), 0.25)}`
  }
  return fillMatch
}
