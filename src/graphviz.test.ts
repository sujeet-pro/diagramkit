import { describe, expect, it } from 'vite-plus/test'
import { adaptGraphvizSvgForDarkMode, injectGraphvizDefaults } from './graphviz'

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
})
