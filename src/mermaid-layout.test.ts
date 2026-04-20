/**
 * Unit tests for the pure mermaid layout helpers. These power the aspect-ratio
 * rebalance pipeline in `src/render-engines.ts` but stand alone so they run
 * without a browser pool.
 */

import { describe, expect, it } from 'vite-plus/test'
import {
  flipFlowchartDirection,
  getFlowchartDirective,
  injectElkInit,
  isRatioInBand,
  parseSvgViewBoxDimensions,
  parseSvgViewBoxRatio,
  pickClosestToTarget,
} from './mermaid-layout'

describe('parseSvgViewBoxRatio', () => {
  it('reads viewBox width/height from a typical mermaid SVG tag', () => {
    const svg = '<svg id="m" viewBox="0 0 800 600" width="100%">...</svg>'
    expect(parseSvgViewBoxRatio(svg)).toBeCloseTo(800 / 600, 6)
  })

  it('falls back to width/height attributes when viewBox is absent', () => {
    const svg = '<svg width="200px" height="50">...</svg>'
    expect(parseSvgViewBoxRatio(svg)).toBeCloseTo(200 / 50, 6)
  })

  it('handles negative viewBox origins (mermaid sometimes emits them)', () => {
    const svg = '<svg viewBox="-10 -5 400 200">...</svg>'
    expect(parseSvgViewBoxRatio(svg)).toBeCloseTo(400 / 200, 6)
  })

  it('returns null when the SVG tag is missing', () => {
    expect(parseSvgViewBoxRatio('<div>no svg</div>')).toBeNull()
    expect(parseSvgViewBoxRatio('')).toBeNull()
  })

  it('returns null when no usable dimensions are present', () => {
    expect(parseSvgViewBoxRatio('<svg width="100%">...</svg>')).toBeNull()
    expect(parseSvgViewBoxRatio('<svg viewBox="0 0 0 100">...</svg>')).toBeNull()
  })
})

describe('parseSvgViewBoxDimensions', () => {
  it('reads width and height from a viewBox', () => {
    const svg = '<svg viewBox="0 0 1234 567" width="100%">...</svg>'
    expect(parseSvgViewBoxDimensions(svg)).toEqual({ width: 1234, height: 567 })
  })

  it('reads negative-origin viewBox correctly (mermaid emits these)', () => {
    const svg = '<svg viewBox="-50 -25 800 600">...</svg>'
    expect(parseSvgViewBoxDimensions(svg)).toEqual({ width: 800, height: 600 })
  })

  it('falls back to width/height attributes when viewBox is missing', () => {
    const svg = '<svg width="500px" height="375">...</svg>'
    expect(parseSvgViewBoxDimensions(svg)).toEqual({ width: 500, height: 375 })
  })

  it('returns null when no usable dimensions are present', () => {
    expect(parseSvgViewBoxDimensions('<svg width="100%">...</svg>')).toBeNull()
    expect(parseSvgViewBoxDimensions('<div>not svg</div>')).toBeNull()
    expect(parseSvgViewBoxDimensions('')).toBeNull()
  })
})

describe('getFlowchartDirective', () => {
  it('matches a leading flowchart directive', () => {
    const result = getFlowchartDirective('flowchart LR\n  A --> B')
    expect(result?.kind).toBe('flowchart')
    expect(result?.dir).toBe('LR')
    expect(result?.index).toBe(0)
    expect(result?.endIndex).toBe('flowchart LR'.length)
  })

  it('matches the legacy `graph` keyword and is case-insensitive', () => {
    const result = getFlowchartDirective('Graph td\n  A --> B')
    expect(result?.kind).toBe('graph')
    expect(result?.dir).toBe('TD')
  })

  it('skips blank lines, comments, and %%{init}%% blocks', () => {
    const src = '\n  \n%% a comment\n%%{init: {"theme":"base"}}%%\nflowchart RL\n  A --> B\n'
    const result = getFlowchartDirective(src)
    expect(result?.kind).toBe('flowchart')
    expect(result?.dir).toBe('RL')
    expect(src.slice(result!.index, result!.endIndex)).toBe('flowchart RL')
  })

  it('returns null for non-flowchart diagram types', () => {
    expect(getFlowchartDirective('sequenceDiagram\nA->>B: hi')).toBeNull()
    expect(getFlowchartDirective('gantt\ntitle X')).toBeNull()
    expect(getFlowchartDirective('classDiagram\nclass A')).toBeNull()
    expect(getFlowchartDirective('erDiagram\nA ||--o{ B : has')).toBeNull()
    expect(getFlowchartDirective('stateDiagram-v2\n[*] --> A')).toBeNull()
    expect(getFlowchartDirective('journey\ntitle X')).toBeNull()
    expect(getFlowchartDirective('pie title X')).toBeNull()
    expect(getFlowchartDirective('mindmap\nroot((x))')).toBeNull()
    expect(getFlowchartDirective('gitGraph\ncommit')).toBeNull()
  })

  it('returns null on empty input', () => {
    expect(getFlowchartDirective('')).toBeNull()
  })
})

describe('flipFlowchartDirection', () => {
  it('swaps LR to TB and preserves the rest of the source', () => {
    const src = 'flowchart LR\n  A --> B\n  B --> C'
    expect(flipFlowchartDirection(src)).toBe('flowchart TB\n  A --> B\n  B --> C')
  })

  it('swaps TB to LR', () => {
    expect(flipFlowchartDirection('flowchart TB\nA --> B')).toBe('flowchart LR\nA --> B')
  })

  it('treats TD as TB and flips it to LR', () => {
    expect(flipFlowchartDirection('flowchart TD\nA --> B')).toBe('flowchart LR\nA --> B')
  })

  it('swaps RL to BT and BT to RL', () => {
    expect(flipFlowchartDirection('graph RL\nA --> B')).toBe('graph BT\nA --> B')
    expect(flipFlowchartDirection('graph BT\nA --> B')).toBe('graph RL\nA --> B')
  })

  it('preserves leading comments and init blocks above the directive', () => {
    const src = '%% header\n%%{init: {"theme":"base"}}%%\nflowchart LR\n  A --> B'
    expect(flipFlowchartDirection(src)).toBe(
      '%% header\n%%{init: {"theme":"base"}}%%\nflowchart TB\n  A --> B',
    )
  })

  it('returns null for non-flowchart sources', () => {
    expect(flipFlowchartDirection('sequenceDiagram\nA->>B: hi')).toBeNull()
    expect(flipFlowchartDirection('')).toBeNull()
  })
})

describe('injectElkInit', () => {
  it('prepends an ELK init directive with the given aspect ratio', () => {
    const out = injectElkInit('flowchart LR\nA --> B', 1.5)
    expect(out.startsWith('%%{init:')).toBe(true)
    expect(out).toContain('"layout":"elk"')
    expect(out).toContain('"aspectRatio":1.5')
    expect(out).toContain('flowchart LR\nA --> B')
  })

  it('is idempotent when the source already declares a layout init block', () => {
    const src = '%%{init: {"layout":"elk","elk":{"aspectRatio":2}}}%%\nflowchart LR\nA --> B'
    expect(injectElkInit(src, 1.5)).toBe(src)
  })

  it('skips injection when the source already sets flowchart.defaultRenderer', () => {
    const src = '%%{init: {"flowchart":{"defaultRenderer":"elk"}}}%%\nflowchart LR\nA --> B'
    expect(injectElkInit(src, 1.5)).toBe(src)
  })

  it('returns the source unchanged when given a non-positive aspect ratio', () => {
    const src = 'flowchart LR\nA --> B'
    expect(injectElkInit(src, 0)).toBe(src)
    expect(injectElkInit(src, -1)).toBe(src)
    expect(injectElkInit(src, Number.NaN)).toBe(src)
  })
})

describe('pickClosestToTarget', () => {
  it('picks the candidate closest to the target on a log scale', () => {
    const result = pickClosestToTarget(1, [
      { ratio: 4, payload: 'wide' },
      { ratio: 0.25, payload: 'tall' },
      { ratio: 1.2, payload: 'good' },
    ])
    expect(result?.payload).toBe('good')
  })

  it('treats inverse ratios symmetrically (4:1 vs 1:4 against 1:1)', () => {
    const wide = pickClosestToTarget(1, [
      { ratio: 4, payload: 'wide' },
      { ratio: 0.25, payload: 'tall' },
    ])
    expect(['wide', 'tall']).toContain(wide?.payload)
    // both are exactly equidistant on log scale, so the first wins (stable)
    expect(wide?.payload).toBe('wide')
  })

  it('skips non-positive or non-finite candidate ratios', () => {
    const result = pickClosestToTarget(1.33, [
      { ratio: Number.NaN, payload: 'bad' },
      { ratio: -1, payload: 'worse' },
      { ratio: 1.4, payload: 'good' },
    ])
    expect(result?.payload).toBe('good')
  })

  it('returns null for an empty candidate list', () => {
    expect(pickClosestToTarget(1, [])).toBeNull()
  })
})

describe('isRatioInBand', () => {
  it('returns true when ratio is inside [target/tolerance, target*tolerance]', () => {
    expect(isRatioInBand(1.0, 4 / 3, 2.5)).toBe(true)
    expect(isRatioInBand(2.5, 4 / 3, 2.5)).toBe(true) // upper edge ~3.33
    expect(isRatioInBand(0.6, 4 / 3, 2.5)).toBe(true) // lower edge ~0.53
  })

  it('returns false when ratio is outside the band', () => {
    expect(isRatioInBand(10, 4 / 3, 2.5)).toBe(false)
    expect(isRatioInBand(0.05, 4 / 3, 2.5)).toBe(false)
  })

  it('treats non-positive or non-finite inputs as in-band (graceful no-op)', () => {
    expect(isRatioInBand(Number.NaN, 4 / 3, 2.5)).toBe(true)
    expect(isRatioInBand(1, 0, 2.5)).toBe(true)
    expect(isRatioInBand(1, 4 / 3, 0.5)).toBe(true)
  })
})
