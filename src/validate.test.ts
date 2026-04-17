import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  formatValidationResult,
  validateSvg,
  validateSvgDirectory,
  validateSvgFile,
} from './validate'

// White text on the primary-stroke blue (#2E5A88) — passes WCAG 2.2 AA against
// the SVG's own rect ancestor, so the GOOD_SVG remains contrast-clean.
const GOOD_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="80" fill="#2E5A88"/>
  <text x="50" y="55" text-anchor="middle" fill="#ffffff">Hi</text>
</svg>`

describe('validateSvg', () => {
  it('passes a well-formed SVG with no issues', () => {
    const r = validateSvg(GOOD_SVG, 'ok.svg')
    expect(r.valid).toBe(true)
    expect(r.issues).toEqual([])
  })

  it('flags empty content as error', () => {
    const r = validateSvg('', 'empty.svg')
    expect(r.valid).toBe(false)
    expect(r.issues[0]?.code).toBe('EMPTY_FILE')
  })

  it('flags missing <svg> tag as error and stops further checks', () => {
    const r = validateSvg('<html>not svg</html>')
    expect(r.valid).toBe(false)
    expect(r.issues.map((i) => i.code)).toContain('MISSING_SVG_TAG')
  })

  it('flags missing </svg> as error', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect/>`
    const r = validateSvg(svg)
    expect(r.issues.map((i) => i.code)).toContain('MISSING_SVG_CLOSE')
  })

  it('flags missing width/height when no viewBox', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0"/></svg>`
    const codes = validateSvg(svg).issues.map((i) => i.code)
    expect(codes).toContain('MISSING_WIDTH')
    expect(codes).toContain('MISSING_HEIGHT')
  })

  it('accepts viewBox-only SVG as sized', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect/></svg>`
    const r = validateSvg(svg)
    expect(r.issues.some((i) => i.code === 'MISSING_WIDTH')).toBe(false)
    expect(r.issues.some((i) => i.code === 'MISSING_HEIGHT')).toBe(false)
  })

  it('flags <script> as error', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect/><script>alert(1)</script></svg>`
    const codes = validateSvg(svg).issues.map((i) => i.code)
    expect(codes).toContain('CONTAINS_SCRIPT')
  })

  it('warns about <foreignObject>', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect/><foreignObject></foreignObject></svg>`
    const issue = validateSvg(svg).issues.find((i) => i.code === 'CONTAINS_FOREIGN_OBJECT')
    expect(issue?.severity).toBe('warning')
  })

  it('warns about external href resources', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image xlink:href="https://example.com/x.png"/><rect/></svg>`
    const issue = validateSvg(svg).issues.find((i) => i.code === 'EXTERNAL_RESOURCE')
    expect(issue?.severity).toBe('warning')
  })
})

describe('formatValidationResult', () => {
  it('prints PASS when valid and no issues', () => {
    const r = validateSvg(GOOD_SVG, 'ok.svg')
    const out = formatValidationResult(r)
    expect(out).toMatch(/\[PASS\]/)
    expect(out).toMatch(/All checks passed/)
  })

  it('prints FAIL with error and suggestion', () => {
    const r = validateSvg('')
    const out = formatValidationResult(r)
    expect(out).toMatch(/\[FAIL\]/)
    expect(out).toMatch(/EMPTY_FILE/)
    expect(out).toMatch(/→ /)
  })

  it('prints WARN entries with code and suggestion when present', () => {
    // foreign object → warning, no errors → still valid=true
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect/><foreignObject></foreignObject></svg>`
    const r = validateSvg(svg, 'warn.svg')
    const out = formatValidationResult(r)
    expect(out).toMatch(/\[PASS\]/)
    expect(out).toMatch(/WARN.*CONTAINS_FOREIGN_OBJECT/)
  })

  it('uses fallback "SVG" label when no file path supplied', () => {
    const r = validateSvg('')
    const out = formatValidationResult(r)
    // First line uses the missing path falling back to "SVG"
    expect(out.split('\n')[0]).toMatch(/\[FAIL\] SVG$/)
  })
})

describe('validateSvg — WCAG contrast checks', () => {
  function svgWithText(textColor: string, bgColor: string, fontSize = 16) {
    return `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g>
    <rect x="0" y="0" width="100" height="100" fill="${bgColor}"/>
    <text x="50" y="50" fill="${textColor}" style="font-size:${fontSize}px">Hello</text>
  </g>
</svg>`
  }

  it('flags black-on-near-black as low-contrast warning', () => {
    const svg = svgWithText('#222222', '#111111')
    const r = validateSvg(svg, 'flow-dark.svg')
    const issue = r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')
    expect(issue?.severity).toBe('warning')
    expect(issue?.message).toMatch(/below WCAG 2\.2 AA/)
  })

  it('passes white text on dark mid-tone background (AA compliant)', () => {
    const svg = svgWithText('#ffffff', '#4C78A8')
    const r = validateSvg(svg, 'flow-light.svg')
    expect(r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')).toBeUndefined()
  })

  it('flags dark grey text on white (Mermaid default text on light bg failure)', () => {
    const svg = svgWithText('#bbbbbb', '#ffffff')
    const r = validateSvg(svg, 'flow-light.svg')
    expect(r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')).toBeDefined()
  })

  it('uses default light background when no rect ancestor and -light filename', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text fill="#dddddd">x</text></svg>`
    const r = validateSvg(svg, 'flow-light.svg')
    expect(r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')).toBeDefined()
  })

  it('uses default dark background when no rect ancestor and -dark filename', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text fill="#222222">x</text></svg>`
    const r = validateSvg(svg, 'flow-dark.svg')
    expect(r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')).toBeDefined()
  })

  it('groups identical color combos into one issue with sample count', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <rect width="10" height="10" fill="#ffffff"/>
      <text fill="#dddddd">one</text>
      <text fill="#dddddd">two</text>
      <text fill="#dddddd">three</text>
    </svg>`
    const r = validateSvg(svg, 'flow-light.svg')
    const issues = r.issues.filter((i) => i.code === 'LOW_CONTRAST_TEXT')
    expect(issues.length).toBe(1)
    expect(issues[0]?.message).toMatch(/3 text elements/)
  })

  it('respects checkContrast: false to skip the scan entirely', () => {
    const svg = svgWithText('#cccccc', '#ffffff')
    const r = validateSvg(svg, 'flow-light.svg', { checkContrast: false })
    expect(r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')).toBeUndefined()
  })

  it('uses backgroundOverride when provided', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text fill="#222222">x</text></svg>`
    const r = validateSvg(svg, 'unknown.svg', { backgroundOverride: '#222222' })
    expect(r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')).toBeDefined()
  })

  it('uses the larger AA threshold (3:1) for large text', () => {
    // #777 on #fff is contrast ~4.48 — passes large (3:1) but borderline normal (4.5:1)
    const svg = svgWithText('#777777', '#ffffff', 24)
    const r = validateSvg(svg, 'flow-light.svg')
    expect(r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')).toBeUndefined()
  })

  it('LOW_CONTRAST_TEXT is a warning, not an error (does not fail validation)', () => {
    const svg = svgWithText('#cccccc', '#ffffff')
    const r = validateSvg(svg, 'flow-light.svg')
    expect(r.valid).toBe(true)
    expect(r.issues.find((i) => i.code === 'LOW_CONTRAST_TEXT')?.severity).toBe('warning')
  })
})

describe('validateSvg — additional edge cases', () => {
  it('warns about missing xmlns', () => {
    const svg = `<svg width="10" height="10"><rect/></svg>`
    const codes = validateSvg(svg).issues.map((i) => i.code)
    expect(codes).toContain('MISSING_XMLNS')
    // Missing xmlns is a warning, not an error — overall result stays valid
    expect(validateSvg(svg).valid).toBe(true)
  })

  it('warns about invalid viewBox value', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="not numbers" width="10" height="10"><rect/></svg>`
    const issue = validateSvg(svg).issues.find((i) => i.code === 'INVALID_VIEWBOX')
    expect(issue?.severity).toBe('warning')
  })

  it('flags missing visual elements as error even with sized svg', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>`
    const r = validateSvg(svg)
    expect(r.valid).toBe(false)
    expect(r.issues.map((i) => i.code)).toContain('NO_VISUAL_ELEMENTS')
  })

  it('treats whitespace-only content as empty', () => {
    const r = validateSvg('   \n\t  ')
    expect(r.valid).toBe(false)
    expect(r.issues[0]?.code).toBe('EMPTY_FILE')
  })

  it('still passes when external href appears as a warning only', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="https://example.com/x.png"/><rect/></svg>`
    const r = validateSvg(svg)
    expect(r.valid).toBe(true)
    expect(r.issues.find((i) => i.code === 'EXTERNAL_RESOURCE')).toBeDefined()
  })

  it('lists multiple external URLs (truncated to 3 in message) when many exist', () => {
    const links = Array.from(
      { length: 5 },
      (_, i) => `<image href="https://e.com/${i}.png"/>`,
    ).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${links}<rect/></svg>`
    const issue = validateSvg(svg).issues.find((i) => i.code === 'EXTERNAL_RESOURCE')
    expect(issue?.message).toMatch(/external resource\(s\): https:\/\/e\.com\/0\.png/)
    expect(issue?.message).toContain('...')
  })
})

describe('validateSvgFile / validateSvgDirectory', () => {
  const tempDirs: string[] = []

  function mkdir(name: string) {
    const dir = mkdtempSync(join(tmpdir(), `validate-${name}-`))
    tempDirs.push(dir)
    return dir
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns EMPTY_FILE error for non-existent file', () => {
    const dir = mkdir('missing')
    const r = validateSvgFile(join(dir, 'does-not-exist.svg'))
    expect(r.valid).toBe(false)
    expect(r.issues[0]?.code).toBe('EMPTY_FILE')
    expect(r.issues[0]?.message).toMatch(/File does not exist/)
  })

  it('reads and validates an SVG file from disk', () => {
    const dir = mkdir('disk')
    const path = join(dir, 'ok.svg')
    writeFileSync(path, GOOD_SVG)
    const r = validateSvgFile(path)
    expect(r.valid).toBe(true)
    expect(r.file).toBe(path)
  })

  it('non-recursive directory scan returns only top-level SVGs', () => {
    const dir = mkdir('top')
    writeFileSync(join(dir, 'a.svg'), GOOD_SVG)
    writeFileSync(join(dir, 'b.svg'), '')
    mkdirSync(join(dir, 'nested'), { recursive: true })
    writeFileSync(join(dir, 'nested', 'c.svg'), GOOD_SVG)

    const results = validateSvgDirectory(dir)
    expect(results).toHaveLength(2)
    const valid = results.filter((r) => r.valid)
    expect(valid).toHaveLength(1)
  })

  it('recursive directory scan includes nested SVGs', () => {
    const dir = mkdir('recursive')
    mkdirSync(join(dir, 'deep', 'deeper'), { recursive: true })
    writeFileSync(join(dir, 'a.svg'), GOOD_SVG)
    writeFileSync(join(dir, 'deep', 'b.svg'), GOOD_SVG)
    writeFileSync(join(dir, 'deep', 'deeper', 'c.svg'), GOOD_SVG)

    const results = validateSvgDirectory(dir, { recursive: true })
    expect(results).toHaveLength(3)
    expect(results.every((r) => r.valid)).toBe(true)
  })

  it('returns empty array for missing directory', () => {
    const dir = mkdir('missing-dir')
    rmSync(dir, { recursive: true })
    expect(validateSvgDirectory(dir, { recursive: true })).toHaveLength(0)
  })

  it('skips non-SVG files in directory scan', () => {
    const dir = mkdir('mixed')
    writeFileSync(join(dir, 'a.svg'), GOOD_SVG)
    writeFileSync(join(dir, 'b.png'), 'fake png')
    writeFileSync(join(dir, 'c.txt'), 'not svg')
    expect(validateSvgDirectory(dir)).toHaveLength(1)
  })
})
