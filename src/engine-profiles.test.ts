import { describe, expect, it } from 'vite-plus/test'
import { ENGINE_PROFILES, getEngineProfile } from './engine-profiles'

describe('ENGINE_PROFILES', () => {
  it('has entries for all four diagram types', () => {
    expect(Object.keys(ENGINE_PROFILES).sort()).toEqual([
      'drawio',
      'excalidraw',
      'graphviz',
      'mermaid',
    ])
  })

  it('marks browser-backed engines as requiring browser pool', () => {
    expect(ENGINE_PROFILES.mermaid.requiresBrowserPool).toBe(true)
    expect(ENGINE_PROFILES.excalidraw.requiresBrowserPool).toBe(true)
    expect(ENGINE_PROFILES.drawio.requiresBrowserPool).toBe(true)
  })

  it('marks graphviz as not requiring browser pool', () => {
    expect(ENGINE_PROFILES.graphviz.requiresBrowserPool).toBe(false)
  })

  it('uses chromium runtime for browser-backed engines', () => {
    expect(ENGINE_PROFILES.mermaid.runtime).toBe('chromium')
    expect(ENGINE_PROFILES.excalidraw.runtime).toBe('chromium')
    expect(ENGINE_PROFILES.drawio.runtime).toBe('chromium')
  })

  it('uses wasm runtime for graphviz', () => {
    expect(ENGINE_PROFILES.graphviz.runtime).toBe('wasm')
  })

  it('assigns unique lane orders', () => {
    const orders = Object.values(ENGINE_PROFILES).map((p) => p.laneOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('orders mermaid first (lowest laneOrder)', () => {
    const sorted = Object.entries(ENGINE_PROFILES).sort(([, a], [, b]) => a.laneOrder - b.laneOrder)
    expect(sorted[0][0]).toBe('mermaid')
  })
})

describe('getEngineProfile', () => {
  it('returns the profile for a known type', () => {
    const profile = getEngineProfile('graphviz')
    expect(profile).toEqual(ENGINE_PROFILES.graphviz)
  })

  it('returns the profile for each diagram type', () => {
    for (const type of ['mermaid', 'excalidraw', 'drawio', 'graphviz'] as const) {
      expect(getEngineProfile(type)).toBe(ENGINE_PROFILES[type])
    }
  })
})
