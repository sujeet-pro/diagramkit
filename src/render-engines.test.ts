import { describe, expect, it, vi } from 'vite-plus/test'
import { engineRenderers } from './render-engines'
import { DiagramkitError } from './types'
import type { BrowserPool } from './pool'

describe('engineRenderers browser-page locking', () => {
  it('serializes concurrent mermaid renders on the shared light page', async () => {
    let inFlight = 0
    let maxInFlight = 0
    let callCount = 0

    const page = {
      evaluate: async () => {
        callCount += 1
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, 20))
        inFlight -= 1
        return `<svg id="${callCount}"></svg>`
      },
    }

    const pool = {
      getMermaidLightPage: async () => page,
    } as unknown as BrowserPool

    await Promise.all([
      engineRenderers.mermaid({
        source: 'graph TD; A-->B',
        theme: 'light',
        contrastOptimize: true,
        renderId: 'r1',
        pool,
      }),
      engineRenderers.mermaid({
        source: 'graph TD; B-->C',
        theme: 'light',
        contrastOptimize: true,
        renderId: 'r2',
        pool,
      }),
    ])

    expect(maxInFlight).toBe(1)
  })

  it('renders mermaid light and dark concurrently for theme=both', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const timedEvaluate = async (id: string) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 20))
      inFlight -= 1
      return `<svg>${id}</svg>`
    }

    const pool = {
      getMermaidLightPage: async () => ({ evaluate: async () => timedEvaluate('light') }),
      getMermaidDarkPage: async () => ({ evaluate: async () => timedEvaluate('dark') }),
    } as unknown as BrowserPool

    await engineRenderers.mermaid({
      source: 'graph TD; A-->B',
      theme: 'both',
      contrastOptimize: false,
      renderId: 'concurrent',
      pool,
    })

    expect(maxInFlight).toBeGreaterThan(1)
  })
})

describe('engineRenderers — pool requirement', () => {
  it('mermaid throws DiagramkitError when pool is missing', async () => {
    await expect(
      engineRenderers.mermaid({
        source: 'graph TD; A-->B',
        theme: 'light',
        contrastOptimize: true,
        renderId: 'r1',
      }),
    ).rejects.toThrow(DiagramkitError)
  })

  it('excalidraw throws DiagramkitError when pool is missing', async () => {
    await expect(
      engineRenderers.excalidraw({
        source: '{}',
        theme: 'light',
        contrastOptimize: true,
        renderId: 'r1',
      }),
    ).rejects.toThrow(DiagramkitError)
  })

  it('drawio throws DiagramkitError when pool is missing', async () => {
    await expect(
      engineRenderers.drawio({
        source: '<mxGraphModel></mxGraphModel>',
        theme: 'light',
        contrastOptimize: true,
        renderId: 'r1',
      }),
    ).rejects.toThrow(DiagramkitError)
  })
})

describe('engineRenderers — theme selection', () => {
  it('mermaid light-only returns lightSvg and no darkSvg', async () => {
    const page = { evaluate: async () => '<svg>light</svg>' }
    const pool = { getMermaidLightPage: async () => page } as unknown as BrowserPool

    const result = await engineRenderers.mermaid({
      source: 'graph TD; A-->B',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'r1',
      pool,
    })

    expect(result.lightSvg).toBeDefined()
    expect(result.darkSvg).toBeUndefined()
  })

  it('lock is released after error so next render proceeds', async () => {
    let callCount = 0
    const page = {
      evaluate: async () => {
        callCount++
        if (callCount === 1) throw new Error('page crashed')
        return '<svg>ok</svg>'
      },
    }
    const pool = { getMermaidLightPage: async () => page } as unknown as BrowserPool
    const ctx = {
      source: 'graph TD; A-->B',
      theme: 'light' as const,
      contrastOptimize: false,
      renderId: 'r1',
      pool,
    }

    await expect(engineRenderers.mermaid(ctx)).rejects.toThrow('page crashed')

    const result = await engineRenderers.mermaid({ ...ctx, renderId: 'r2' })
    expect(result.lightSvg).toBe('<svg>ok</svg>')
  })
})

describe('engineRenderers — graphviz delegation', () => {
  it('graphviz renders without pool', async () => {
    const result = await engineRenderers.graphviz({
      source: 'digraph { A -> B }',
      theme: 'both',
      contrastOptimize: true,
      renderId: 'r1',
    })

    expect(result.lightSvg).toContain('<svg')
    expect(result.darkSvg).toContain('<svg')
  })
})

/**
 * The aspect-ratio rebalance pipeline is a pure-ish controller around the mermaid page.
 * We drive it by feeding scripted SVGs from a fake `evaluate` that inspects the source it
 * is asked to render and returns a SVG with a viewBox that mirrors what mermaid would do
 * given that direction (LR ⇒ very wide, TB ⇒ tall, ELK ⇒ near-square).
 */
describe('mermaid aspect-ratio rebalance', () => {
  type ScriptedEvaluate = (args: { input: string; renderId: string }) => Promise<string>

  /**
   * Build a fake mermaid page whose `evaluate` mirrors playwright's invocation pattern
   * (`page.evaluate(fn, { input, renderId })`) and returns the SVG produced by `script`.
   */
  function makeScriptedPage(script: ScriptedEvaluate) {
    return {
      evaluate: (_fn: unknown, args: { input: string; renderId: string }) => script(args),
    }
  }

  function makePool(script: ScriptedEvaluate, captureSources: string[]): BrowserPool {
    return {
      getMermaidLightPage: async () =>
        makeScriptedPage(async (args) => {
          captureSources.push(args.input)
          return script(args)
        }),
      getMermaidDarkPage: async () => makeScriptedPage(async (args) => script(args)),
    } as unknown as BrowserPool
  }

  /**
   * Default heuristic used by the scripted evaluate: returns wide for LR/RL, tall for TB/TD/BT,
   * and near-square when the source contains an ELK init directive.
   */
  function svgForSource(source: string): string {
    if (/%%\{init:.*"layout":"elk"/.test(source)) {
      return '<svg viewBox="0 0 600 450"></svg>' // 4:3-ish
    }
    if (/^(flowchart|graph)\s+(LR|RL)/im.test(source)) {
      return '<svg viewBox="0 0 1200 100"></svg>' // 12:1
    }
    return '<svg viewBox="0 0 100 1200"></svg>' // 1:12
  }

  it('"off" mode never rewrites the source and never warns', async () => {
    const sources: string[] = []
    const warn = vi.fn()
    const pool = makePool(async ({ input }) => svgForSource(input), sources)

    const result = await engineRenderers.mermaid({
      source: 'flowchart LR\nA --> B',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'off-1',
      pool,
      mermaidLayout: { mode: 'off', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn,
    })

    expect(sources).toEqual(['flowchart LR\nA --> B'])
    expect(warn).not.toHaveBeenCalled()
    expect(result.lightSvg).toContain('1200 100')
  })

  it('"warn" mode keeps the original SVG but emits a notice when the ratio is out of band', async () => {
    const sources: string[] = []
    const warn = vi.fn()
    const pool = makePool(async ({ input }) => svgForSource(input), sources)

    const result = await engineRenderers.mermaid({
      source: 'flowchart LR\nA --> B',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'warn-1',
      pool,
      mermaidLayout: { mode: 'warn', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn,
    })

    expect(sources).toEqual(['flowchart LR\nA --> B'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toMatch(/aspect ratio/)
    expect(result.lightSvg).toContain('1200 100')
  })

  it('"warn" mode is silent when the rendered ratio is already inside the band', async () => {
    const warn = vi.fn()
    const pool = makePool(async () => '<svg viewBox="0 0 600 450"></svg>', [])

    await engineRenderers.mermaid({
      source: 'flowchart LR\nA --> B',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'warn-2',
      pool,
      mermaidLayout: { mode: 'warn', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn,
    })

    expect(warn).not.toHaveBeenCalled()
  })

  it('"flip" mode swaps LR to TB and picks the better-aspect rendering', async () => {
    const sources: string[] = []
    const warn = vi.fn()
    const pool = makePool(async ({ input }) => {
      // LR is 12:1 wide; TB (after flip) we treat as 6:5 to ensure flip wins.
      if (/^flowchart\s+TB/im.test(input)) return '<svg viewBox="0 0 600 500"></svg>'
      return '<svg viewBox="0 0 1200 100"></svg>'
    }, sources)

    const result = await engineRenderers.mermaid({
      source: 'flowchart LR\nA --> B',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'flip-1',
      pool,
      mermaidLayout: { mode: 'flip', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn,
    })

    // First the original LR render, then the flipped TB retry.
    expect(sources[0]).toBe('flowchart LR\nA --> B')
    expect(sources[1]).toBe('flowchart TB\nA --> B')
    expect(result.lightSvg).toContain('600 500')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('rebalanced via "flip"'))
  })

  it('"elk" mode injects an ELK init directive and prefers the near-square render', async () => {
    const sources: string[] = []
    const warn = vi.fn()
    const pool = makePool(async ({ input }) => svgForSource(input), sources)

    const result = await engineRenderers.mermaid({
      source: 'flowchart LR\nA --> B',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'elk-1',
      pool,
      mermaidLayout: { mode: 'elk', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn,
    })

    expect(sources[0]).toBe('flowchart LR\nA --> B')
    expect(sources[1]).toContain('"layout":"elk"')
    expect(sources[1]).toContain('flowchart LR')
    expect(result.lightSvg).toContain('600 450')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('rebalanced via "elk"'))
  })

  it('"auto" mode falls through to ELK when flip alone does not bring the ratio in band', async () => {
    const sources: string[] = []
    const warn = vi.fn()
    const pool = makePool(async ({ input }) => {
      // LR -> 12:1 wide, flipped TB -> still very tall, ELK -> 4:3-ish, flip+elk also 4:3-ish.
      if (/%%\{init:.*"layout":"elk"/.test(input)) return '<svg viewBox="0 0 600 450"></svg>'
      if (/^flowchart\s+TB/im.test(input)) return '<svg viewBox="0 0 100 1200"></svg>'
      return '<svg viewBox="0 0 1200 100"></svg>'
    }, sources)

    const result = await engineRenderers.mermaid({
      source: 'flowchart LR\nA --> B',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'auto-1',
      pool,
      mermaidLayout: { mode: 'auto', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn,
    })

    expect(sources[0]).toBe('flowchart LR\nA --> B')
    expect(sources[1]).toBe('flowchart TB\nA --> B')
    // After flip is still out of band, auto adds an ELK retry (and possibly flip+elk).
    expect(sources.some((s) => s.includes('"layout":"elk"'))).toBe(true)
    expect(result.lightSvg).toContain('600 450')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('rebalanced via'))
  })

  it('non-flowchart diagrams are never rewritten, only warned about', async () => {
    const sources: string[] = []
    const warn = vi.fn()
    const pool = makePool(async () => '<svg viewBox="0 0 1200 100"></svg>', sources)

    await engineRenderers.mermaid({
      source: 'sequenceDiagram\nA->>B: hi',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'seq-1',
      pool,
      mermaidLayout: { mode: 'auto', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn,
    })

    expect(sources).toEqual(['sequenceDiagram\nA->>B: hi'])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not a flowchart'))
  })

  it('"both" theme renders the chosen source for both light and dark pages', async () => {
    // Make each candidate produce a distinct ratio so the picker has a unique winner:
    //   original LR   -> 12:1 (way out of band)
    //   flipped TB    -> 1:12 (still out of band)
    //   elk (LR+elk)  -> 600x500 = 1.20 (in-band, distance from 1.333 = 0.105)
    //   flip+elk (TB) -> 800x600 = 1.333 (in-band, exact match — should win)
    const lightCalls: string[] = []
    const darkCalls: string[] = []
    const lightEvaluate = async (_fn: unknown, args: { input: string }) => {
      lightCalls.push(args.input)
      const isElk = /%%\{init:.*"layout":"elk"/.test(args.input)
      const isTB = /^flowchart\s+TB/im.test(args.input)
      if (isElk && isTB) return '<svg viewBox="0 0 800 600"></svg>'
      if (isElk) return '<svg viewBox="0 0 600 500"></svg>'
      if (isTB) return '<svg viewBox="0 0 100 1200"></svg>'
      return '<svg viewBox="0 0 1200 100"></svg>'
    }
    const pool = {
      getMermaidLightPage: async () => ({ evaluate: lightEvaluate }),
      getMermaidDarkPage: async () => ({
        evaluate: async (_fn: unknown, args: { input: string }) => {
          darkCalls.push(args.input)
          return '<svg viewBox="0 0 800 600"></svg>'
        },
      }),
    } as unknown as BrowserPool

    const result = await engineRenderers.mermaid({
      source: 'flowchart LR\nA --> B',
      theme: 'both',
      contrastOptimize: false,
      renderId: 'both-1',
      pool,
      mermaidLayout: { mode: 'auto', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn: () => {},
    })

    // Dark page is invoked exactly once with the source the picker chose for light.
    expect(darkCalls).toHaveLength(1)
    expect(darkCalls[0]).toContain('"layout":"elk"')
    expect(darkCalls[0]).toContain('flowchart TB')
    expect(lightCalls).toContain(darkCalls[0]!)
    expect(result.lightSvg).toContain('800 600')
    expect(result.darkSvg).toContain('800 600')
  })

  it('a failed rebalance attempt does not break the original render', async () => {
    const warn = vi.fn()
    let call = 0
    const pool = {
      getMermaidLightPage: async () => ({
        evaluate: async () => {
          call += 1
          if (call === 1) return '<svg viewBox="0 0 1200 100"></svg>'
          throw new Error('mermaid blew up on retry')
        },
      }),
      getMermaidDarkPage: async () => ({ evaluate: async () => '<svg/>' }),
    } as unknown as BrowserPool

    const result = await engineRenderers.mermaid({
      source: 'flowchart LR\nA --> B',
      theme: 'light',
      contrastOptimize: false,
      renderId: 'fail-1',
      pool,
      mermaidLayout: { mode: 'flip', targetAspectRatio: 4 / 3, tolerance: 2.5 },
      warn,
    })

    expect(result.lightSvg).toContain('1200 100')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('flip'))
  })
})
