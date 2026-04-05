import { describe, expect, it, vi } from 'vite-plus/test'

const renderMock = vi.fn(async () => ({ format: 'svg' }))
const renderFileMock = vi.fn(async () => ({ format: 'svg' }))
const renderDiagramFileToDiskMock = vi.fn(async () => ['out.svg'])
const renderAllMock = vi.fn(async () => ({
  rendered: [],
  skipped: [],
  failed: [],
  failedDetails: [],
}))
const watchDiagramsMock = vi.fn(() => async () => {})

const acquireMock = vi.fn(async () => {})
const releaseMock = vi.fn(() => {})
const disposeMock = vi.fn(async () => {})

vi.mock('./renderer', () => ({
  render: renderMock,
  renderFile: renderFileMock,
  renderDiagramFileToDisk: renderDiagramFileToDiskMock,
}))

vi.mock('./render-all', () => ({
  renderAll: renderAllMock,
}))

vi.mock('./watch', () => ({
  watchDiagrams: watchDiagramsMock,
}))

vi.mock('./pool', () => ({
  BrowserPool: class {
    acquire = acquireMock
    release = releaseMock
    dispose = disposeMock
  },
}))

describe('createRendererRuntime', () => {
  it('binds runtime pool to rendering APIs', async () => {
    const { createRendererRuntime } = await import('./runtime')
    const runtime = createRendererRuntime()

    await runtime.render('graph TD;A-->B', 'mermaid')
    await runtime.renderFile('/tmp/a.mmd')
    await runtime.renderDiagramFileToDisk({
      path: '/tmp/a.mmd',
      name: 'a',
      dir: '/tmp',
      ext: '.mmd',
    })
    await runtime.renderAll({ dir: '/tmp' })
    runtime.watchDiagrams({ dir: '/tmp' })

    const renderCalls = renderMock.mock.calls as unknown[][]
    const renderFileCalls = renderFileMock.mock.calls as unknown[][]
    const renderToDiskCalls = renderDiagramFileToDiskMock.mock.calls as unknown[][]
    const renderAllCalls = renderAllMock.mock.calls as unknown[][]
    const watchCalls = watchDiagramsMock.mock.calls as unknown[][]

    expect((renderCalls[0]?.[2] as { pool?: unknown })?.pool).toBe(runtime.pool)
    expect((renderFileCalls[0]?.[1] as { pool?: unknown })?.pool).toBe(runtime.pool)
    expect((renderToDiskCalls[0]?.[1] as { pool?: unknown })?.pool).toBe(runtime.pool)
    expect((renderAllCalls[0]?.[0] as { pool?: unknown })?.pool).toBe(runtime.pool)
    expect((watchCalls[0]?.[0] as { pool?: unknown })?.pool).toBe(runtime.pool)
  })

  it('warmup acquires and releases pool once', async () => {
    const { createRendererRuntime } = await import('./runtime')
    const runtime = createRendererRuntime()
    await runtime.warmup()
    expect(acquireMock).toHaveBeenCalledTimes(1)
    expect(releaseMock).toHaveBeenCalledTimes(1)
  })

  it('dispose delegates to force pool dispose', async () => {
    const { createRendererRuntime } = await import('./runtime')
    const runtime = createRendererRuntime()
    await runtime.dispose()
    expect(disposeMock).toHaveBeenCalledWith(true)
  })
})
