import { describe, expect, it } from 'vite-plus/test'
import { hexToRgb, hslToHex, rgbToHsl } from './convert'
import { relativeLuminance } from './luminance'
import { postProcessDarkSvg } from './contrast'
import { VISIBILITY_MIN_CONTRAST, findSvgVisibilityIssues } from './wcag'

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

  it('never darkens a light <text> glyph fill (attribute form)', () => {
    // xychart-beta emits axis labels as light inline fills; darkening them would
    // wipe out contrast on the dark canvas.
    const svg = '<g><text fill="#e5e5e5" font-size="14">jan</text></g>'
    const result = postProcessDarkSvg(svg)
    expect(result).toBe(svg)
    expect(result).toContain('fill="#e5e5e5"')
  })

  it('never darkens a light <tspan> glyph fill (style form)', () => {
    const svg = "<text><tspan style='fill:#ffffff'>Label</tspan></text>"
    const result = postProcessDarkSvg(svg)
    expect(result).toContain('#ffffff')
  })

  it('still darkens a light shape fill that sits next to text', () => {
    const svg = '<g><rect fill="#ffffff" /><text fill="#e5e5e5">n</text></g>'
    const result = postProcessDarkSvg(svg)
    // rect background darkened, text glyph preserved
    expect(result).not.toContain('fill="#ffffff"')
    expect(result).toContain('fill="#e5e5e5"')
  })

  it('preserves self-closing shape tags while clamping their fill', () => {
    const svg = '<rect fill="#ffffff"/>'
    const result = postProcessDarkSvg(svg)
    expect(result).not.toContain('#ffffff')
    expect(result).toMatch(/\/>$/)
  })

  it('lightens a near-black <text> glyph fill (attribute form)', () => {
    // Mermaid hardcodes fill="#000" on gantt/timeline axis-tick labels, which no
    // theme variable overrides; black digits would vanish on the dark canvas.
    const svg = '<g><text fill="#000000" font-size="10">0</text></g>'
    const result = postProcessDarkSvg(svg)
    expect(result).not.toContain('fill="#000000"')
    // Lightened to a high-luminance gray that reads on the dark canvas.
    const match = result.match(/fill="(#[0-9a-f]{6})"/)
    expect(match).not.toBeNull()
    const [r, g, b] = hexToRgb(match![1])!
    expect(relativeLuminance(r, g, b)).toBeGreaterThan(0.4)
  })

  it('lightens a near-black <tspan> glyph fill (style form)', () => {
    const svg = "<text><tspan style='fill:#333'>5</tspan></text>"
    const result = postProcessDarkSvg(svg)
    expect(result).not.toContain('#333')
  })

  it('never lightens a near-black shape fill (only glyph fills are lightened)', () => {
    // A dark shape background must stay dark; lightening is glyph-only.
    const svg = '<rect fill="#000000"/>'
    const result = postProcessDarkSvg(svg)
    expect(result).toContain('fill="#000000"')
  })

  it('lightens a near-black stroke (invisible line/connector on the dark canvas)', () => {
    const result = postProcessDarkSvg('<path stroke="#000000" d="M0 0"/>')
    expect(result).not.toContain('stroke="#000000"')
    const [r, g, b] = hexToRgb(result.match(/stroke="(#[0-9a-f]{6})"/)![1])!
    expect(relativeLuminance(r, g, b)).toBeGreaterThan(0.4)
  })

  it('lightens the named color "black" on a stroke (Mermaid timeline connector form)', () => {
    // Mermaid emits `stroke="black"` on timeline droplines; it overrides the
    // theme CSS and SVGO later normalises it to #000 — invisible on dark.
    const result = postProcessDarkSvg('<line stroke="black" x1="0" y1="0" x2="0" y2="9"/>')
    expect(result).toMatch(/stroke="#[0-9a-f]{6}"/)
    expect(result).not.toMatch(/stroke="black"/)
  })

  it('lightens a near-black stroke inside style="" too', () => {
    const result = postProcessDarkSvg('<path style="fill:none;stroke:#000" d="M0 0"/>')
    expect(result).not.toMatch(/stroke:#000\b/)
  })

  it('preserves the dark theme’s own mid-tone strokes (#555 / #333)', () => {
    // These are intentional dark-theme borders/edges — must not be lightened.
    expect(postProcessDarkSvg('<rect stroke="#555555"/>')).toContain('stroke="#555555"')
    expect(postProcessDarkSvg('<path stroke="#333333" d="M0 0"/>')).toContain('stroke="#333333"')
  })

  it('does not touch stroke-width / stroke-dasharray (only the stroke color)', () => {
    const svg = '<path stroke="#000000" stroke-width="2" stroke-dasharray="5,5" d="M0 0"/>'
    const result = postProcessDarkSvg(svg)
    expect(result).toContain('stroke-width="2"')
    expect(result).toContain('stroke-dasharray="5,5"')
  })
})

describe('findSvgVisibilityIssues', () => {
  it('exposes an invisibility floor below the WCAG non-text bar', () => {
    // It is an "invisible" floor, not the 3:1 comfort bar — the accepted dark
    // theme uses subtle boxes, so the gate must sit well below 3:1.
    expect(VISIBILITY_MIN_CONTRAST).toBeLessThan(1.5)
    expect(VISIBILITY_MIN_CONTRAST).toBeGreaterThan(1)
  })

  it('flags an edge whose stroke is the canvas color as a line issue', () => {
    const svg = `<svg><path class="transition" style="fill:none;stroke:#000000" d="M0 0L10 10"/></svg>`
    const issues = findSvgVisibilityIssues(svg, { defaultBackground: '#111111' })
    expect(issues).toHaveLength(1)
    expect(issues[0]?.role).toBe('line')
    expect(issues[0]?.paint).toBe('stroke')
  })

  it('reports a filled box invisible against the canvas as a shape issue', () => {
    const svg = `<svg><rect x="1" y="1" width="8" height="8" fill="#171717"/></svg>`
    const issues = findSvgVisibilityIssues(svg, { defaultBackground: '#111111' })
    expect(issues.map((i) => i.role)).toContain('shape')
  })

  it('treats a fill that exactly matches the canvas as an intentional erase (no issue)', () => {
    const svg = `<svg><rect x="1" y="1" width="8" height="8" fill="#111111"/></svg>`
    expect(findSvgVisibilityIssues(svg, { defaultBackground: '#111111' })).toHaveLength(0)
  })

  it('does not flag a node whose fill is low-contrast but border is visible', () => {
    const svg = `<svg><g class="node"><rect x="1" y="1" width="8" height="8" fill="#2d2d2d" stroke="#cccccc"/></g></svg>`
    expect(findSvgVisibilityIssues(svg, { defaultBackground: '#111111' })).toHaveLength(0)
  })

  it('ignores contents of <defs>/<marker> templates', () => {
    const svg = `<svg><defs><marker><path d="M0 0h4v4H0z" fill="#111111"/></marker></defs></svg>`
    expect(findSvgVisibilityIssues(svg, { defaultBackground: '#111111' })).toHaveLength(0)
  })
})
