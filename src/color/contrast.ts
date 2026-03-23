import { hexToRgb, hslToHex, rgbToHsl } from './convert'
import { relativeLuminance } from './luminance'

/**
 * Post-process a dark-mode SVG to fix light fill colors that produce poor contrast.
 * Finds inline fill:#hex values with high luminance and darkens them,
 * preserving the hue so colored nodes retain their visual identity.
 */
export function postProcessDarkSvg(svg: string): string {
  return svg.replace(/style="([^"]*)"/g, (match, styleContent: string) => {
    const newStyle = styleContent.replace(
      /fill\s*:\s*(#[0-9a-fA-F]{3,6})/g,
      (fillMatch, hex: string) => {
        const [r, g, b] = hexToRgb(hex)
        const lum = relativeLuminance(r, g, b)
        if (lum > 0.4) {
          const [h, s] = rgbToHsl(r, g, b)
          return `fill:${hslToHex(h, Math.min(s, 0.6), 0.25)}`
        }
        return fillMatch
      },
    )
    return `style="${newStyle}"`
  })
}
