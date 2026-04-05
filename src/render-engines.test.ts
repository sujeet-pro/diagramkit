import { describe, expect, it } from 'vite-plus/test'
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
