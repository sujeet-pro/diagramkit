/**
 * Unit tests for the renderer module.
 *
 * Covers SVG dimension parsing, renderFile error paths,
 * renderDiagramFileToDisk format defaults, and renderAll result shape.
 * Mocks browser pool, Playwright, and FS to avoid real browser launches.
 */

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

// All vi.mock calls must be at top level (they get hoisted regardless)

vi.mock('playwright', () => {
  const mockPage = {
    isClosed: vi.fn(() => false),
    setContent: vi.fn(),
    addScriptTag: vi.fn(),
    waitForFunction: vi.fn(),
    evaluate: vi.fn(),
    close: vi.fn(),
  }
  const mockContext = {
    newPage: vi.fn(() => Promise.resolve({ ...mockPage })),
    route: vi.fn(() => Promise.resolve()),
  }
  const mockBrowser = {
    newContext: vi.fn(() => Promise.resolve(mockContext)),
    close: vi.fn(() => Promise.resolve()),
  }
  return {
    chromium: {
      launch: vi.fn(() => Promise.resolve(mockBrowser)),
    },
  }
})

vi.mock('rolldown', () => ({
  rolldown: vi.fn(() =>
    Promise.resolve({
      generate: vi.fn(() => Promise.resolve({ output: [{ code: '/* bundle */' }] })),
    }),
  ),
}))

vi.mock('./graphviz', () => ({
  renderGraphviz: vi.fn((_source: string, opts?: { theme?: string }) => {
    const lightSvg = '<svg width="300" height="200" viewBox="0 0 300 200"><rect/></svg>'
    const darkSvg = '<svg width="300" height="200" viewBox="0 0 300 200"><rect fill="#333"/></svg>'
    const theme = opts?.theme ?? 'both'
    return Promise.resolve({
      lightSvg: theme === 'dark' ? undefined : lightSvg,
      darkSvg: theme === 'light' ? undefined : darkSvg,
    })
  }),
}))

vi.mock('./color/contrast', () => ({
  postProcessDarkSvg: vi.fn((svg: string) => svg),
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    readFileSync: vi.fn((...args: unknown[]) => {
      const path = args[0] as string
      if (path.endsWith('.dot') || path.endsWith('.gv') || path.endsWith('.mermaid')) {
        return 'digraph { A -> B }'
      }
      return (actual.readFileSync as (...a: unknown[]) => unknown)(...args)
    }),
    statSync: vi.fn((...args: unknown[]) => {
      const path = args[0] as string
      if (path.endsWith('.dot') || path.endsWith('.gv') || path.endsWith('.mermaid')) {
        return { size: 100 }
      }
      return (actual.statSync as (...a: unknown[]) => unknown)(...args)
    }),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
    mkdirSync: vi.fn(),
  }
})

vi.mock('./convert', () => ({
  convertSvg: vi.fn(() => Promise.resolve(Buffer.from('fake-raster'))),
}))

vi.mock('./discovery', () => ({
  findDiagramFiles: vi.fn(() => []),
  filterByType: vi.fn(() => []),
}))

vi.mock('./manifest', () => ({
  cleanOrphans: vi.fn(),
  ensureDiagramsDir: vi.fn(() => '/tmp/.diagramkit'),
  filterStaleFiles: vi.fn(() => []),
  updateManifest: vi.fn(),
  readManifest: vi.fn(() => ({ version: 2, entries: {} })),
}))

import { render, renderFile, renderDiagramFileToDisk, defaultMermaidDarkTheme } from './renderer'
import { renderAll } from './render-all'
import { renderGraphviz } from './graphviz'

/* ── SVG dimension parsing ── */

describe('SVG dimension parsing', () => {
  afterEach(() => {
    vi.mocked(renderGraphviz).mockReset()
    // Restore the default mock implementation
    vi.mocked(renderGraphviz).mockImplementation((_source: string, opts?: { theme?: string }) => {
      const lightSvg = '<svg width="300" height="200" viewBox="0 0 300 200"><rect/></svg>'
      const darkSvg =
        '<svg width="300" height="200" viewBox="0 0 300 200"><rect fill="#333"/></svg>'
      const theme = opts?.theme ?? 'both'
      return Promise.resolve({
        lightSvg: theme === 'dark' ? undefined : lightSvg,
        darkSvg: theme === 'light' ? undefined : darkSvg,
      })
    })
  })

  it('parses normal integer width and height from SVG tag', async () => {
    vi.mocked(renderGraphviz).mockResolvedValueOnce({
      lightSvg: '<svg width="100" height="200"><rect/></svg>',
      darkSvg: undefined,
    })

    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'light' })
    expect(result.format).toBe('svg')
    expect(result.width).toBe(100)
    expect(result.height).toBe(200)
  })

  it('parses dimensions with px suffix', async () => {
    vi.mocked(renderGraphviz).mockResolvedValueOnce({
      lightSvg: '<svg width="100px" height="200px"><rect/></svg>',
      darkSvg: undefined,
    })

    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'light' })
    expect(result.width).toBe(100)
    expect(result.height).toBe(200)
  })

  it('parses decimal width and height', async () => {
    vi.mocked(renderGraphviz).mockResolvedValueOnce({
      lightSvg: '<svg width="150.5" height="200.7"><rect/></svg>',
      darkSvg: undefined,
    })

    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'light' })
    expect(result.width).toBe(150.5)
    expect(result.height).toBe(200.7)
  })

  it('falls back to viewBox when width and height are missing', async () => {
    vi.mocked(renderGraphviz).mockResolvedValueOnce({
      lightSvg: '<svg viewBox="0 0 400 250"><rect/></svg>',
      darkSvg: undefined,
    })

    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'light' })
    expect(result.width).toBe(400)
    expect(result.height).toBe(250)
  })

  it('falls back individual missing width from viewBox', async () => {
    vi.mocked(renderGraphviz).mockResolvedValueOnce({
      lightSvg: '<svg height="200" viewBox="0 0 400 250"><rect/></svg>',
      darkSvg: undefined,
    })

    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'light' })
    expect(result.width).toBe(400)
    expect(result.height).toBe(200)
  })

  it('falls back individual missing height from viewBox', async () => {
    vi.mocked(renderGraphviz).mockResolvedValueOnce({
      lightSvg: '<svg width="100" viewBox="0 0 400 250"><rect/></svg>',
      darkSvg: undefined,
    })

    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'light' })
    expect(result.width).toBe(100)
    expect(result.height).toBe(250)
  })

  it('returns undefined dimensions when SVG has no size attributes', async () => {
    vi.mocked(renderGraphviz).mockResolvedValueOnce({
      lightSvg: '<svg><rect/></svg>',
      darkSvg: undefined,
    })

    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'light' })
    expect(result.width).toBeUndefined()
    expect(result.height).toBeUndefined()
  })

  it('uses dark SVG for dimensions when light is not rendered', async () => {
    vi.mocked(renderGraphviz).mockResolvedValueOnce({
      lightSvg: undefined,
      darkSvg: '<svg width="320" height="180"><rect/></svg>',
    })

    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'dark' })
    expect(result.width).toBe(320)
    expect(result.height).toBe(180)
  })
})

/* ── renderFile error paths ── */

describe('renderFile', () => {
  it('throws for unknown file extension', async () => {
    await expect(renderFile('/tmp/diagram.unknown')).rejects.toThrow(
      /Unknown diagram type for file/,
    )
  })

  it('error message includes the filename', async () => {
    await expect(renderFile('/tmp/chart.bmp')).rejects.toThrow('chart.bmp')
  })

  it('error message lists supported extensions', async () => {
    await expect(renderFile('/tmp/test.xyz')).rejects.toThrow(/Supported extensions:/)
  })
})

/* ── renderDiagramFileToDisk format handling ── */

describe('renderDiagramFileToDisk', () => {
  it('defaults to svg format when no formats specified', async () => {
    const file = {
      path: '/tmp/test.dot',
      name: 'test',
      dir: '/tmp',
      ext: '.dot',
    }

    const written = await renderDiagramFileToDisk(file)

    // Should produce light and dark SVG files (default theme is 'both')
    expect(written.length).toBeGreaterThanOrEqual(1)
    for (const name of written) {
      expect(name).toMatch(/\.svg$/)
    }
  })

  it('produces both light and dark variants by default', async () => {
    const file = {
      path: '/tmp/test.dot',
      name: 'test',
      dir: '/tmp',
      ext: '.dot',
    }

    const written = await renderDiagramFileToDisk(file)

    const hasLight = written.some((n) => n.includes('-light.'))
    const hasDark = written.some((n) => n.includes('-dark.'))
    expect(hasLight).toBe(true)
    expect(hasDark).toBe(true)
  })

  it('uses explicit formats array when provided', async () => {
    const file = {
      path: '/tmp/test.dot',
      name: 'test',
      dir: '/tmp',
      ext: '.dot',
    }

    const written = await renderDiagramFileToDisk(file, { formats: ['png'] })

    const pngOutputs = written.filter((n) => n.endsWith('.png'))
    expect(pngOutputs.length).toBeGreaterThanOrEqual(1)
  })

  it('uses single format option as fallback when formats not set', async () => {
    const file = {
      path: '/tmp/test.dot',
      name: 'test',
      dir: '/tmp',
      ext: '.dot',
    }

    const written = await renderDiagramFileToDisk(file, { format: 'png' })

    const pngOutputs = written.filter((n) => n.endsWith('.png'))
    expect(pngOutputs.length).toBeGreaterThanOrEqual(1)
  })

  it('stores scaled raster dimensions in output metadata', async () => {
    const file = {
      path: '/tmp/test.dot',
      name: 'test',
      dir: '/tmp',
      ext: '.dot',
    }

    await renderDiagramFileToDisk(file, { formats: ['png'], scale: 3 })

    expect((file as { _outputMeta?: Array<Record<string, unknown>> })._outputMeta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          format: 'png',
          width: 900,
          height: 600,
          scale: 3,
        }),
      ]),
    )
  })
})

/* ── RenderAllResult structure ── */

describe('renderAll', () => {
  it('returns correct result shape with rendered, skipped, and failed arrays', async () => {
    const log = vi.fn()
    const result = await renderAll({
      dir: '/tmp/empty',
      logger: { log, warn: vi.fn(), error: vi.fn() },
    })

    expect(result).toHaveProperty('rendered')
    expect(result).toHaveProperty('skipped')
    expect(result).toHaveProperty('failed')
    expect(result).toHaveProperty('failedDetails')
    expect(Array.isArray(result.rendered)).toBe(true)
    expect(Array.isArray(result.skipped)).toBe(true)
    expect(Array.isArray(result.failed)).toBe(true)
    expect(Array.isArray(result.failedDetails)).toBe(true)
  })

  it('returns empty arrays when no diagram files found', async () => {
    const log = vi.fn()
    const result = await renderAll({
      dir: '/tmp/empty',
      logger: { log, warn: vi.fn(), error: vi.fn() },
    })

    expect(result.rendered).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
    expect(result.failed).toHaveLength(0)
    expect(result.failedDetails).toHaveLength(0)
  })

  it('logs a message when no files are found', async () => {
    const log = vi.fn()
    await renderAll({ dir: '/tmp/empty', logger: { log, warn: vi.fn(), error: vi.fn() } })

    expect(log).toHaveBeenCalledWith('No diagram files found.')
  })

  it('suppresses info logs when logLevel is error', async () => {
    const log = vi.fn()
    await renderAll({
      dir: '/tmp/empty',
      logger: { log, warn: vi.fn(), error: vi.fn() },
      logLevel: 'error',
    })
    expect(log).not.toHaveBeenCalled()
  })

  it('logs info messages when logLevel is verbose', async () => {
    const log = vi.fn()
    await renderAll({
      dir: '/tmp/empty',
      logger: { log, warn: vi.fn(), error: vi.fn() },
      logLevel: 'verbose',
    })
    expect(log).toHaveBeenCalledWith('No diagram files found.')
  })
})

/* ── defaultMermaidDarkTheme ── */

describe('defaultMermaidDarkTheme', () => {
  it('is a non-empty record of string key-value pairs', () => {
    expect(typeof defaultMermaidDarkTheme).toBe('object')
    expect(Object.keys(defaultMermaidDarkTheme).length).toBeGreaterThan(0)

    for (const [key, value] of Object.entries(defaultMermaidDarkTheme)) {
      expect(typeof key).toBe('string')
      expect(typeof value).toBe('string')
    }
  })

  it('contains essential theme keys', () => {
    expect(defaultMermaidDarkTheme).toHaveProperty('background')
    expect(defaultMermaidDarkTheme).toHaveProperty('primaryColor')
    expect(defaultMermaidDarkTheme).toHaveProperty('textColor')
    expect(defaultMermaidDarkTheme).toHaveProperty('lineColor')
  })
})
