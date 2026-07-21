/**
 * User scenario:
 * Rendered SVGs are optimized before they hit disk. Mermaid embeds a large boilerplate
 * stylesheet; most rules match nothing in a given diagram. This trims the dead rules while
 * never breaking accessibility metadata or `url(#…)` references, and produces byte-identical
 * output across runs.
 *
 * What this file verifies:
 * - the Mermaid CSS pruning keeps used rules and drops provably-unused ones, conservatively
 * - accessibility (viewBox / width / height / role / aria-* / <style>) survives optimization
 * - `url(#…)` references and referenced `@keyframes` / `@font-face` are preserved
 * - optimization is a no-op when `svg: false`
 * - the same input always yields byte-identical output (determinism)
 * - the CSS pre-pass is gated to Mermaid diagrams only
 */

import { describe, expect, it } from 'vite-plus/test'
import { optimizeSvg, stripUnusedMermaidCss } from './optimize'

/**
 * A representative Mermaid-shaped SVG: `#id`-prefixed selectors, a mix of used/unused
 * classes, an attribute selector and a functional pseudo (both unconfident → kept),
 * `:root`, referenced and dead `@keyframes` / `@font-face`, an `@media` block, and a
 * `url(#arrow)` marker reference. Present classes: keepA, node, label, marker. Present
 * ids: graph-1, arrow.
 */
const mermaidSvg = `<svg id="graph-1" role="graphics-document document" aria-roledescription="flowchart-v2" width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">\
<style>\
#graph-1 .keepA{fill:#c00;}\
#graph-1 .dropB{fill:#00c;}\
#graph-1 .node .label{color:#000;}\
#graph-1 .ghost .label{color:#f0f;}\
:root{--accent:#333;}\
#graph-1 [data-role]{stroke:#0a0;}\
#graph-1 .keepA:not(.foo){opacity:1;}\
@keyframes usedAnim{to{opacity:1;}}\
@keyframes deadAnim{to{opacity:0;}}\
#graph-1 .keepA{animation:usedAnim 2s linear;}\
@font-face{font-family:"UsedFont";src:url(used.woff);}\
@font-face{font-family:"DeadFont";src:url(dead.woff);}\
#graph-1 .label{font-family:"UsedFont",sans-serif;}\
@media (min-width:10px){#graph-1 .responsive{fill:#008080;}}\
#graph-1 .marker{fill:url(#arrow);}\
</style>\
<defs><marker id="arrow"><path d="M0,0 L4,2 L0,4 z"/></marker></defs>\
<g class="node"><g class="label keepA marker"><text>hi</text></g></g>\
<rect data-role="frame" width="200" height="100" fill="none"/>\
</svg>`

describe('stripUnusedMermaidCss', () => {
  const stripped = stripUnusedMermaidCss(mermaidSvg)

  it('keeps rules whose classes are present in the document', () => {
    expect(stripped).toContain('.keepA')
    expect(stripped).toContain('.node .label')
  })

  it('drops rules whose required class is absent from the document', () => {
    expect(stripped).not.toContain('dropB')
    expect(stripped).not.toContain('ghost')
  })

  it('keeps :root and universal-style rules it cannot treat as absent', () => {
    expect(stripped).toContain(':root')
  })

  it('keeps rules with attribute selectors it cannot confidently evaluate', () => {
    expect(stripped).toContain('[data-role]')
  })

  it('keeps rules with functional pseudo-classes it cannot confidently evaluate', () => {
    expect(stripped).toContain(':not(')
  })

  it('keeps @keyframes referenced by a kept rule and drops unreferenced ones', () => {
    expect(stripped).toContain('usedAnim')
    expect(stripped).not.toContain('deadAnim')
  })

  it('keeps @font-face referenced by a kept rule and drops unreferenced ones', () => {
    expect(stripped).toContain('UsedFont')
    expect(stripped).not.toContain('DeadFont')
  })

  it('keeps @media blocks unconditionally (conservative)', () => {
    expect(stripped).toContain('@media')
  })

  it('preserves url(#…) references inside kept rules', () => {
    expect(stripped).toContain('url(#arrow)')
  })

  it('preserves accessibility metadata and dimensions (only the <style> is touched)', () => {
    expect(stripped).toContain('role="graphics-document document"')
    expect(stripped).toContain('aria-roledescription="flowchart-v2"')
    expect(stripped).toContain('viewBox="0 0 200 100"')
    expect(stripped).toContain('width="200"')
  })

  it('is deterministic (same input → identical output)', () => {
    expect(stripUnusedMermaidCss(mermaidSvg)).toBe(stripped)
  })

  it('produces a smaller <style> than the input', () => {
    expect(Buffer.byteLength(stripped)).toBeLessThan(Buffer.byteLength(mermaidSvg))
  })

  it('returns the input unchanged when there is no <style> block', () => {
    const noStyle = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect/></svg>'
    expect(stripUnusedMermaidCss(noStyle)).toBe(noStyle)
  })

  it('never throws and always returns a string, even on malformed CSS', () => {
    const broken = `<svg xmlns="http://www.w3.org/2000/svg"><style>@@@ not ; css {{{ </style><g/></svg>`
    const result = stripUnusedMermaidCss(broken)
    expect(typeof result).toBe('string')
    expect(result).toContain('<g/>')
  })
})

describe('optimizeSvg', () => {
  it('returns the input unchanged when svg optimization is disabled', () => {
    expect(optimizeSvg(mermaidSvg, { svg: false, type: 'mermaid' })).toBe(mermaidSvg)
  })

  it('is deterministic (same input → byte-identical output)', () => {
    const a = optimizeSvg(mermaidSvg, { svg: true, type: 'mermaid' })
    const b = optimizeSvg(mermaidSvg, { svg: true, type: 'mermaid' })
    expect(a).toBe(b)
  })

  it('preserves viewBox, dimensions, role, aria, and the <style> element', () => {
    const out = optimizeSvg(mermaidSvg, { svg: true, type: 'mermaid' })
    expect(out).toContain('viewBox="0 0 200 100"')
    expect(out).toMatch(/<svg[^>]*width="200"/)
    expect(out).toMatch(/<svg[^>]*height="100"/)
    expect(out).toContain('role="graphics-document document"')
    expect(out).toContain('aria-roledescription="flowchart-v2"')
    expect(out).toContain('<style')
  })

  it('keeps the marker id referenced by url(#arrow)', () => {
    const out = optimizeSvg(mermaidSvg, { svg: true, type: 'mermaid' })
    expect(out).toContain('id="arrow"')
    expect(out).toContain('url(#arrow)')
  })

  it('prunes unused Mermaid CSS for mermaid diagrams', () => {
    const out = optimizeSvg(mermaidSvg, { svg: true, type: 'mermaid' })
    expect(out).toContain('.keepA')
    expect(out).not.toContain('dropB')
    expect(Buffer.byteLength(out)).toBeLessThan(Buffer.byteLength(mermaidSvg))
  })

  it('does not run the Mermaid CSS pre-pass for non-mermaid diagrams', () => {
    // The same document optimized as a non-mermaid diagram still runs SVGO, but the
    // unused-rule pruning must not fire — dropB survives.
    const out = optimizeSvg(mermaidSvg, { svg: true, type: 'excalidraw' })
    expect(out).toContain('dropB')
  })
})
