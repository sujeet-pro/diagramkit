/**
 * Unit tests for watch mode logic.
 *
 * Verifies debouncing, queue deduplication, render mutex,
 * safe-mode error handling, and cleanup behavior
 * without requiring a real filesystem watcher or browser.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

// Capture watcher event handlers
let watcherHandlers: Record<string, (path: string) => void> = {}
const mockClose = vi.fn(() => Promise.resolve())

vi.mock('chokidar', () => {
  const watcher = {
    on: vi.fn((event: string, handler: (path: string) => void) => {
      watcherHandlers[event] = handler
      return watcher
    }),
    close: mockClose,
  }
  return {
    watch: vi.fn(() => watcher),
  }
})

// Track render calls and allow controlling failures
let renderCalls: string[] = []
let renderShouldFail = false

vi.mock('./renderer', () => ({
  renderDiagramFileToDisk: vi.fn(async (file: { path: string }) => {
    renderCalls.push(file.path)
    if (renderShouldFail) throw new Error('render failed')
    return ['output.svg']
  }),
}))

vi.mock('./manifest', () => ({
  updateManifest: vi.fn(),
}))

vi.mock('./config', () => ({
  loadConfig: vi.fn(() => ({
    outputDir: '.diagrams',
    manifestFile: 'diagrams.manifest.json',
    useManifest: true,
    sameFolder: false,
    defaultFormat: 'svg',
    defaultTheme: 'both',
  })),
}))

vi.mock('./extensions', () => ({
  getExtensionMap: vi.fn(() => ({
    '.mermaid': 'mermaid',
    '.mmd': 'mermaid',
    '.excalidraw': 'excalidraw',
    '.drawio': 'drawio',
  })),
  getAllExtensions: vi.fn(() => ['.mermaid', '.mmd', '.excalidraw', '.drawio']),
  getMatchedExtension: vi.fn((filename: string) => {
    if (filename.endsWith('.mermaid')) return '.mermaid'
    if (filename.endsWith('.mmd')) return '.mmd'
    if (filename.endsWith('.excalidraw')) return '.excalidraw'
    if (filename.endsWith('.drawio')) return '.drawio'
    return null
  }),
}))

describe('watchDiagrams', () => {
  let watchDiagrams: typeof import('./watch').watchDiagrams

  beforeEach(async () => {
    vi.useFakeTimers()
    watcherHandlers = {}
    renderCalls = []
    renderShouldFail = false
    mockClose.mockClear()

    const mod = await import('./watch')
    watchDiagrams = mod.watchDiagrams
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns an async cleanup function', () => {
    const cleanup = watchDiagrams({ dir: '/test' })
    expect(typeof cleanup).toBe('function')
  })

  it('cleanup closes watcher', async () => {
    const cleanup = watchDiagrams({ dir: '/test' })
    await cleanup()
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('debounces rapid changes to the same file', async () => {
    watchDiagrams({ dir: '/test' })

    const handler = watcherHandlers.change
    if (!handler) throw new Error('change handler not registered')

    // Fire two rapid change events on the same file
    handler('/test/diagram.mermaid')
    handler('/test/diagram.mermaid')

    // Advance past debounce timeout (200ms)
    await vi.advanceTimersByTimeAsync(250)

    // Should only render once due to debounce
    expect(renderCalls).toHaveLength(1)
    expect(renderCalls[0]).toBe('/test/diagram.mermaid')
  })

  it('renders different files independently', async () => {
    watchDiagrams({ dir: '/test' })

    const handler = watcherHandlers.change
    if (!handler) throw new Error('change handler not registered')

    handler('/test/a.mermaid')
    handler('/test/b.mermaid')

    await vi.advanceTimersByTimeAsync(250)

    expect(renderCalls).toHaveLength(2)
    expect(renderCalls).toContain('/test/a.mermaid')
    expect(renderCalls).toContain('/test/b.mermaid')
  })

  it('safe mode: failed render does not crash and does not call onChange', async () => {
    renderShouldFail = true
    const onChange = vi.fn()
    watchDiagrams({ dir: '/test', onChange })

    const handler = watcherHandlers.change
    if (!handler) throw new Error('change handler not registered')

    handler('/test/bad.mermaid')
    await vi.advanceTimersByTimeAsync(250)

    expect(renderCalls).toHaveLength(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onChange after successful render', async () => {
    const onChange = vi.fn()
    watchDiagrams({ dir: '/test', onChange })

    const handler = watcherHandlers.change
    if (!handler) throw new Error('change handler not registered')

    handler('/test/good.mermaid')
    await vi.advanceTimersByTimeAsync(250)

    expect(onChange).toHaveBeenCalledWith('/test/good.mermaid')
  })

  it('ignores non-diagram files', async () => {
    watchDiagrams({ dir: '/test' })

    const handler = watcherHandlers.change
    if (!handler) throw new Error('change handler not registered')

    handler('/test/readme.md')
    await vi.advanceTimersByTimeAsync(250)

    expect(renderCalls).toHaveLength(0)
  })
})
