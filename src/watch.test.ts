/**
 * Unit tests for watch mode logic.
 *
 * Verifies debouncing, queue deduplication, render mutex,
 * safe-mode error handling, and cleanup behavior
 * without requiring a real filesystem watcher or browser.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { loadConfig } from './config'
import { readManifest, updateManifest } from './manifest'

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
  hashFile: vi.fn(() => 'sha256:mockhash1234'),
  updateManifest: vi.fn(),
  readManifest: vi.fn(() => ({ version: 2, diagrams: {} })),
}))

vi.mock('./config', () => ({
  loadConfig: vi.fn(() => ({
    outputDir: '.diagramkit',
    manifestFile: 'manifest.json',
    useManifest: true,
    sameFolder: false,
    defaultFormats: ['svg'],
    defaultTheme: 'both',
  })),
}))

vi.mock('./extensions', () => ({
  getExtensionMap: vi.fn(() => ({
    '.mermaid': 'mermaid',
    '.mmd': 'mermaid',
    '.excalidraw': 'excalidraw',
    '.drawio': 'drawio',
    '.dot': 'graphviz',
  })),
  getAllExtensions: vi.fn(() => ['.mermaid', '.mmd', '.excalidraw', '.drawio', '.dot']),
  getMatchedExtension: vi.fn((filename: string) => {
    if (filename.endsWith('.mermaid')) return '.mermaid'
    if (filename.endsWith('.mmd')) return '.mmd'
    if (filename.endsWith('.excalidraw')) return '.excalidraw'
    if (filename.endsWith('.drawio')) return '.drawio'
    if (filename.endsWith('.dot')) return '.dot'
    return null
  }),
}))

describe('watchDiagrams', () => {
  let rawWatchDiagrams: typeof import('./watch').watchDiagrams
  // Wrapper that defaults `logLevel` to 'silent'. The renderer is fully
  // mocked in this file, so any logger output (the routine "Watching for
  // diagram changes..." line, or the safe-mode "Render failed: ..." line
  // emitted on a deliberately mocked render rejection) is just the unit
  // under test exercising its logging contract — not a real failure
  // signal — and only adds noise to the test runner. Individual tests that
  // assert on logger behavior can still override `logLevel`/`logger`.
  const watchDiagrams: typeof import('./watch').watchDiagrams = (opts) =>
    rawWatchDiagrams({ logLevel: 'silent', ...opts })

  beforeEach(async () => {
    vi.useFakeTimers()
    watcherHandlers = {}
    renderCalls = []
    renderShouldFail = false
    mockClose.mockClear()

    const mod = await import('./watch')
    rawWatchDiagrams = mod.watchDiagrams
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns an async cleanup function', () => {
    const cleanup = watchDiagrams({ dir: '/test' })
    expect(typeof cleanup).toBe('function')
  })

  it('passes explicit configFile to loadConfig', () => {
    watchDiagrams({ dir: '/test', configFile: '/tmp/custom.json5' })
    expect(vi.mocked(loadConfig)).toHaveBeenCalledWith(undefined, '/test', '/tmp/custom.json5', {
      strict: false,
    })
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

  it('watches graphviz files', async () => {
    watchDiagrams({ dir: '/test' })

    const handler = watcherHandlers.change
    if (!handler) throw new Error('change handler not registered')

    handler('/test/dependency.dot')
    await vi.advanceTimersByTimeAsync(250)

    expect(renderCalls).toEqual(['/test/dependency.dot'])
  })

  it('updates manifest using effective formats from existing entry', async () => {
    vi.mocked(readManifest).mockReturnValue({
      version: 2,
      diagrams: {
        'diagram.mermaid': {
          hash: 'sha256:old',
          generatedAt: new Date().toISOString(),
          outputs: [],
          formats: ['png'],
        },
      },
    })

    watchDiagrams({
      dir: '/test',
      renderOptions: { formats: ['svg'], theme: 'both' },
    })

    const handler = watcherHandlers.change
    if (!handler) throw new Error('change handler not registered')
    handler('/test/diagram.mermaid')
    await vi.advanceTimersByTimeAsync(250)

    expect(vi.mocked(updateManifest)).toHaveBeenCalledWith(
      expect.any(Array),
      ['svg', 'png'],
      expect.any(Object),
      'both',
    )
  })
})
