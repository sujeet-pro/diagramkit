import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('./pool', () => ({
  getPool: vi.fn(() => ({})),
  BrowserPool: vi.fn(),
}))

vi.mock('./renderer', () => ({
  renderDiagramFileToDisk: vi.fn(() => Promise.resolve(['out-light.svg', 'out-dark.svg'])),
}))

describe('renderAll', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'render-all-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('returns correct result shape with all required fields', async () => {
    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
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
    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    })

    expect(result.rendered).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
    expect(result.failed).toHaveLength(0)
    expect(result.failedDetails).toHaveLength(0)
  })

  it('discovers and renders stale diagram files', async () => {
    writeFileSync(join(dir, 'test.mermaid'), 'graph TD; A-->B')
    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      force: true,
    })

    expect(result.rendered).toHaveLength(1)
    expect(result.rendered[0]).toContain('test.mermaid')
  })

  it('populates failedDetails with code and message when render fails', async () => {
    writeFileSync(join(dir, 'bad.mermaid'), 'invalid diagram')

    const { DiagramkitError } = await import('./types')
    const { renderDiagramFileToDisk } = await import('./renderer')
    vi.mocked(renderDiagramFileToDisk).mockRejectedValueOnce(
      new DiagramkitError('RENDER_FAILED', 'Parse error in diagram'),
    )

    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      force: true,
    })

    expect(result.failed).toHaveLength(1)
    expect(result.failedDetails).toHaveLength(1)
    expect(result.failedDetails[0]).toMatchObject({
      code: 'RENDER_FAILED',
      message: 'Parse error in diagram',
    })
  })

  it('continues rendering other files when one fails', async () => {
    writeFileSync(join(dir, 'a.mermaid'), 'graph TD; A-->B')
    writeFileSync(join(dir, 'b.mermaid'), 'graph TD; B-->C')

    const { renderDiagramFileToDisk } = await import('./renderer')
    const mock = vi.mocked(renderDiagramFileToDisk)
    mock.mockRejectedValueOnce(new Error('boom'))
    mock.mockResolvedValueOnce(['out.svg'])

    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      force: true,
    })

    expect(result.failed.length + result.rendered.length).toBe(2)
  })

  it('filters by type when type option is set', async () => {
    writeFileSync(join(dir, 'flow.mermaid'), 'graph TD; A-->B')
    writeFileSync(join(dir, 'arch.dot'), 'digraph { A->B }')

    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      type: 'graphviz',
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      force: true,
    })

    expect(result.rendered.length + result.skipped.length).toBeLessThanOrEqual(1)
    if (result.rendered.length > 0) {
      expect(result.rendered[0]).toContain('arch.dot')
    }
  })

  it('includes metrics when includeMetrics is true', async () => {
    writeFileSync(join(dir, 'test.mermaid'), 'graph TD; A-->B')

    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      includeMetrics: true,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      force: true,
    })

    expect(result.metrics).toBeDefined()
    expect(result.metrics!.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.metrics!.lanesUsed).toBeGreaterThanOrEqual(1)
    expect(result.metrics!.countsByType).toBeDefined()
  })

  it('does not include metrics when includeMetrics is not set', async () => {
    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    })

    expect(result.metrics).toBeUndefined()
  })

  it('respects maxConcurrentLanes option', async () => {
    writeFileSync(join(dir, 'test.mermaid'), 'graph TD; A-->B')

    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      maxConcurrentLanes: 1,
      includeMetrics: true,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      force: true,
    })

    expect(result.metrics!.lanesUsed).toBe(1)
  })

  it('handles null error in toRenderFailure without crashing', async () => {
    writeFileSync(join(dir, 'test.mermaid'), 'graph TD; A-->B')

    const { renderDiagramFileToDisk } = await import('./renderer')
    vi.mocked(renderDiagramFileToDisk).mockRejectedValueOnce(null)

    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      force: true,
    })

    expect(result.failed).toHaveLength(1)
    expect(result.failedDetails[0]!.code).toBe('RENDER_FAILED')
  })

  it('separates rendered from skipped files correctly', async () => {
    writeFileSync(join(dir, 'a.mermaid'), 'graph TD; A-->B')
    writeFileSync(join(dir, 'b.mermaid'), 'graph TD; C-->D')

    const { renderAll } = await import('./render-all')
    const result = await renderAll({
      dir,
      logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      force: true,
    })

    const total = result.rendered.length + result.skipped.length + result.failed.length
    expect(total).toBe(2)
  })
})
