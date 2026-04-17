import { describe, expect, it } from 'vite-plus/test'
import { adaptGraphvizSvgForDarkMode, injectGraphvizDefaults, renderGraphviz } from './graphviz'

describe('injectGraphvizDefaults', () => {
  it('injects a transparent graph background after the opening brace', () => {
    const source = 'digraph Example {\n  A -> B\n}\n'
    const result = injectGraphvizDefaults(source)

    expect(result).toContain('graph [bgcolor="transparent"];')
    expect(result.indexOf('graph [bgcolor="transparent"];')).toBeGreaterThan(result.indexOf('{'))
  })

  it('leaves sources without an opening brace unchanged', () => {
    const source = 'not actually dot'
    expect(injectGraphvizDefaults(source)).toBe(source)
  })
})

describe('adaptGraphvizSvgForDarkMode', () => {
  it('rewrites default black text, fills, and strokes for dark mode', () => {
    const svg = `
      <svg>
        <ellipse fill="none" stroke="black" />
        <polygon fill="black" stroke="#000000" />
        <text x="0" y="0">A</text>
        <text x="0" y="0" fill="black">B</text>
      </svg>
    `

    const result = adaptGraphvizSvgForDarkMode(svg)

    expect(result).toContain('stroke="#94a3b8"')
    expect(result).toContain('fill="#94a3b8"')
    expect(result).toContain('fill="#e5e7eb">A</text>')
    expect(result).toContain('fill="#e5e7eb">B</text>')
  })

  it('preserves fill="none" without rewriting', () => {
    const svg = '<svg><ellipse fill="none" stroke="black" /></svg>'
    const result = adaptGraphvizSvgForDarkMode(svg)
    expect(result).toContain('fill="none"')
  })

  it('promotes low-luminance hex text fills (e.g. #333333) to the dark text color', () => {
    const svg = '<svg><text fill="#333333">label</text><text fill="#444">other</text></svg>'
    const result = adaptGraphvizSvgForDarkMode(svg)
    // Both dark-grey fills get promoted; #333 → #e5e7eb, #444 → #e5e7eb
    expect(result).toContain('fill="#e5e7eb">label</text>')
    expect(result).toContain('fill="#e5e7eb">other</text>')
  })

  it('preserves text fills with sufficient luminance for dark mode', () => {
    // #ffffff already readable on dark; should stay untouched.
    const svg = '<svg><text fill="#ffffff">already light</text></svg>'
    const result = adaptGraphvizSvgForDarkMode(svg)
    expect(result).toContain('fill="#ffffff">already light</text>')
  })
})

describe('renderGraphviz', () => {
  const validDot = 'digraph { A -> B }'

  it('returns only lightSvg when theme is light', async () => {
    const result = await renderGraphviz(validDot, { theme: 'light' })
    expect(result.lightSvg).toBeDefined()
    expect(result.lightSvg).toContain('<svg')
    expect(result.darkSvg).toBeUndefined()
  })

  it('returns only darkSvg when theme is dark', async () => {
    const result = await renderGraphviz(validDot, { theme: 'dark' })
    expect(result.darkSvg).toBeDefined()
    expect(result.darkSvg).toContain('<svg')
    expect(result.lightSvg).toBeUndefined()
  })

  it('returns both variants when theme is both', async () => {
    const result = await renderGraphviz(validDot, { theme: 'both' })
    expect(result.lightSvg).toBeDefined()
    expect(result.darkSvg).toBeDefined()
  })

  it('applies dark mode adaptation to darkSvg', async () => {
    const result = await renderGraphviz(validDot, { theme: 'dark' })
    expect(result.darkSvg).toContain('#e5e7eb')
  })

  it('skips contrast optimization when contrastOptimize is false', async () => {
    const withContrast = await renderGraphviz(validDot, {
      theme: 'dark',
      contrastOptimize: true,
    })
    const without = await renderGraphviz(validDot, {
      theme: 'dark',
      contrastOptimize: false,
    })
    expect(withContrast.darkSvg).toContain('#e5e7eb')
    expect(without.darkSvg).toContain('#e5e7eb')
  })

  it('throws a descriptive error for invalid DOT syntax', async () => {
    await expect(renderGraphviz('not valid dot {')).rejects.toThrow()
  })

  it('supports concurrent programmatic renders safely', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        renderGraphviz(`digraph { A${index} -> B${index} }`, {
          theme: index % 2 === 0 ? 'both' : 'dark',
        }),
      ),
    )

    expect(results).toHaveLength(6)
    expect(results[0].lightSvg).toContain('<svg')
    expect(results[0].darkSvg).toContain('<svg')
    expect(results[1].lightSvg).toBeUndefined()
    expect(results[1].darkSvg).toContain('<svg')
  })
})
