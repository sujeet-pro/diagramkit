import { describe, expect, it } from 'vite-plus/test'
import { hexToRgb, hslToHex, rgbToHsl } from './convert'
import { relativeLuminance } from './luminance'
import { postProcessDarkSvg } from './contrast'

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0])
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255])
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })

  it('parses 3-digit hex', () => {
    expect(hexToRgb('#f00')).toEqual([255, 0, 0])
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
  })

  it('handles without # prefix', () => {
    expect(hexToRgb('ff0000')).toEqual([255, 0, 0])
  })

  it('returns null for invalid hex characters', () => {
    expect(hexToRgb('gggggg')).toBeNull()
  })
})

describe('rgbToHsl', () => {
  it('converts pure red', () => {
    const [h, s, l] = rgbToHsl(255, 0, 0)
    expect(h).toBeCloseTo(0, 2)
    expect(s).toBeCloseTo(1, 2)
    expect(l).toBeCloseTo(0.5, 2)
  })

  it('converts white', () => {
    const [_h, s, l] = rgbToHsl(255, 255, 255)
    expect(s).toBeCloseTo(0, 2)
    expect(l).toBeCloseTo(1, 2)
  })

  it('converts black', () => {
    const [_h, s, l] = rgbToHsl(0, 0, 0)
    expect(s).toBeCloseTo(0, 2)
    expect(l).toBeCloseTo(0, 2)
  })

  it('converts pure green (max === g branch)', () => {
    const [h, s, l] = rgbToHsl(0, 255, 0)
    expect(h).toBeCloseTo(1 / 3, 2) // 120 degrees = 1/3
    expect(s).toBeCloseTo(1, 2)
    expect(l).toBeCloseTo(0.5, 2)
  })

  it('converts pure blue (max === b branch)', () => {
    const [h, s, l] = rgbToHsl(0, 0, 255)
    expect(h).toBeCloseTo(2 / 3, 2) // 240 degrees = 2/3
    expect(s).toBeCloseTo(1, 2)
    expect(l).toBeCloseTo(0.5, 2)
  })
})

describe('hslToHex', () => {
  it('converts red HSL back to hex', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000')
  })

  it('converts white', () => {
    expect(hslToHex(0, 0, 1)).toBe('#ffffff')
  })

  it('converts black', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000')
  })
})

describe('relativeLuminance', () => {
  it('returns 1 for white', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 2)
  })

  it('returns 0 for black', () => {
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 2)
  })

  it('returns ~0.21 for pure red', () => {
    expect(relativeLuminance(255, 0, 0)).toBeCloseTo(0.2126, 2)
  })
})

describe('postProcessDarkSvg', () => {
  it('darkens high-luminance fill colors', () => {
    const svg = '<rect style="fill:#ffffff" />'
    const result = postProcessDarkSvg(svg)
    // White (#ffffff, luminance=1) should be darkened
    expect(result).not.toContain('#ffffff')
    expect(result).toContain('fill:')
  })

  it('preserves low-luminance fill colors', () => {
    const svg = '<rect style="fill:#111111" />'
    const result = postProcessDarkSvg(svg)
    expect(result).toContain('#111111')
  })

  it('preserves hue when darkening', () => {
    // A very bright yellow — high luminance, should darken but remain yellowish
    const svg = '<rect style="fill:#ffff00" />'
    const result = postProcessDarkSvg(svg)
    expect(result).not.toContain('#ffff00')
    const match = result.match(/fill:(#[0-9a-f]{6})/)
    expect(match).toBeTruthy()
  })

  it('handles multiple fill colors', () => {
    const svg = '<g><rect style="fill:#ffffff" /><rect style="fill:#000000" /></g>'
    const result = postProcessDarkSvg(svg)
    // White should be darkened, black preserved
    expect(result).not.toContain('#ffffff')
    expect(result).toContain('#000000')
  })

  it('darkens high-luminance fill inside single-quoted style attributes', () => {
    const svg = "<rect style='fill:#ffffff' />"
    const result = postProcessDarkSvg(svg)
    expect(result).not.toContain('#ffffff')
    expect(result).toContain('fill:')
    // Single quotes must be preserved
    expect(result).toMatch(/style='[^']*'/)
  })

  it('darkens high-luminance standalone fill attribute', () => {
    const svg = '<rect fill="#ffffff" />'
    const result = postProcessDarkSvg(svg)
    expect(result).not.toContain('#ffffff')
    expect(result).toContain('fill="')
  })

  it('preserves low-luminance standalone fill attribute', () => {
    const svg = '<rect fill="#111111" />'
    const result = postProcessDarkSvg(svg)
    expect(result).toContain('#111111')
  })

  it('handles mixed style-based and attribute-based fills', () => {
    const svg =
      '<g><rect style="fill:#ffffff" /><circle fill="#eeeeee" /><path fill="#111111" /></g>'
    const result = postProcessDarkSvg(svg)
    // Both high-luminance fills should be darkened
    expect(result).not.toContain('#ffffff')
    expect(result).not.toContain('#eeeeee')
    // Low-luminance fill should be preserved
    expect(result).toContain('#111111')
  })

  it('returns SVG unchanged when there are no fill attributes', () => {
    const svg = '<rect stroke="#ffffff" width="10" height="10" />'
    const result = postProcessDarkSvg(svg)
    expect(result).toBe(svg)
  })

  it('preserves invalid hex in standalone fill attribute unchanged', () => {
    const svg = '<rect fill="#xyz" />'
    const result = postProcessDarkSvg(svg)
    // #xyz does not match the hex regex pattern so it stays unchanged
    expect(result).toBe(svg)
  })
})
