/**
 * Calculate relative luminance of an RGB color per WCAG 2.0 formula.
 * Returns a value between 0 (black) and 1 (white).
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const srgb = [r / 255, g / 255, b / 255]
  const linear = srgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
}
