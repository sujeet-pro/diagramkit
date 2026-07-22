import { describe, expect, it } from 'vite-plus/test'
import { postProcessDarkSvg } from './color/contrast'
import { WCAG_AA_NORMAL, contrastRatioHex } from './color/wcag'
import {
  defaultMermaidDarkTheme,
  defaultMermaidLightTheme,
  mermaidLabelBackdropCSS,
} from './mermaid-theme'

/**
 * These tests PROVE — using the repo's own WCAG luminance/contrast utility — that
 * the injected mermaid theme colors clear WCAG 2.2 AA (>= 4.5:1) against the
 * backgrounds they actually render against, closing the two systematic
 * text-contrast defects found in the consumer audit.
 */

const DARK_CANVAS = '#111111' // defaultMermaidDarkTheme.background
const LIGHT_CANVAS = '#ffffff'
// Participant boxes the autonumber badge can overlap (mermaid `base`/`default`).
const DARK_ACTOR_BOX = '#404040'
const LIGHT_ACTOR_BOX = '#eaeaea'

function ratio(fg: string, bg: string): number {
  const r = contrastRatioHex(fg, bg)
  expect(r).not.toBeNull()
  return r!
}

describe('injected mermaid theme contrast (WCAG 2.2 AA)', () => {
  it('dark sequence-autonumber digit clears AA on the canvas and participant boxes', () => {
    const fg = defaultMermaidDarkTheme.sequenceNumberColor as string
    expect(ratio(fg, DARK_CANVAS)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
    expect(ratio(fg, DARK_ACTOR_BOX)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
  })

  it('light sequence-autonumber digit clears AA on the canvas and participant boxes', () => {
    const fg = defaultMermaidLightTheme.sequenceNumberColor as string
    expect(ratio(fg, LIGHT_CANVAS)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
    expect(ratio(fg, LIGHT_ACTOR_BOX)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
  })

  it('dark xychart axis text clears AA on the chart background', () => {
    const xy = defaultMermaidDarkTheme.xyChart as Record<string, string>
    const bg = xy.backgroundColor
    for (const key of [
      'titleColor',
      'xAxisTitleColor',
      'xAxisLabelColor',
      'xAxisTickColor',
      'yAxisTitleColor',
      'yAxisLabelColor',
      'yAxisTickColor',
    ]) {
      expect(ratio(xy[key]!, bg!)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
    }
  })

  it('dark xychart axis text survives dark post-processing (stays light)', () => {
    const xy = defaultMermaidDarkTheme.xyChart as Record<string, string>
    // Emulate how mermaid emits an axis label and what the dark pipeline does to it.
    const svg = `<g><text fill="${xy.xAxisLabelColor}" font-size="14">jan</text></g>`
    const processed = postProcessDarkSvg(svg)
    expect(processed).toContain(`fill="${xy.xAxisLabelColor}"`)
    // And the resulting (unchanged) color still clears AA on the chart background.
    expect(ratio(xy.xAxisLabelColor!, xy.backgroundColor!)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL)
  })
})

describe('mermaidLabelBackdropCSS', () => {
  it('pins the light edge-label backdrop to white so labels erase the line cleanly', () => {
    const css = mermaidLabelBackdropCSS('light', defaultMermaidLightTheme)
    expect(css).toMatch(/\.edgeLabel[^{]*background[^{]*\{fill:#ffffff/)
  })

  it('uses only a pure-class descendant selector (no tag.class form that would leak scope)', () => {
    // `.edgeLabel rect.background` / `path.background` drop their ancestor scope
    // in the regex CSS resolver and leak fill onto every `.background` element.
    const css = mermaidLabelBackdropCSS('light')
    expect(css).not.toMatch(/(?:rect|path)\.background/)
    expect(css).toMatch(/\.edgeLabel \.background\{/)
  })

  it('pins the dark edge-label backdrop to the theme edgeLabelBackground', () => {
    const css = mermaidLabelBackdropCSS('dark', defaultMermaidDarkTheme)
    // defaultMermaidDarkTheme.edgeLabelBackground === '#1e1e1e'
    expect(css).toMatch(/fill:#1e1e1e/)
  })

  it('falls back to a safe per-variant default when no theme is given', () => {
    expect(mermaidLabelBackdropCSS('light')).toMatch(/fill:#ffffff/)
    expect(mermaidLabelBackdropCSS('dark')).toMatch(/fill:#1e1e1e/)
  })

  it('scopes only to edge labels (never node/cluster backdrops)', () => {
    const css = mermaidLabelBackdropCSS('light')
    expect(css).toMatch(/\.edgeLabel/)
    expect(css).not.toMatch(/\.node\s|\.cluster\s/)
  })
})
