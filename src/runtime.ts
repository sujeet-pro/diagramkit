import { render, renderDiagramFileToDisk, renderFile } from './renderer'
import { renderAll } from './render-all'
import { BrowserPool } from './pool'
import type { BatchOptions, DiagramFile, RenderOptions, RenderResult, WatchOptions } from './types'
import { watchDiagrams } from './watch'

export interface RendererRuntime {
  pool: BrowserPool
  render: (
    source: string,
    type: Parameters<typeof render>[1],
    options?: RenderOptions,
  ) => Promise<RenderResult>
  renderFile: (filePath: string, options?: RenderOptions) => Promise<RenderResult>
  renderDiagramFileToDisk: (
    file: DiagramFile,
    options?: Parameters<typeof renderDiagramFileToDisk>[1],
  ) => Promise<string[]>
  renderAll: (options?: BatchOptions) => ReturnType<typeof renderAll>
  watchDiagrams: (options: WatchOptions) => ReturnType<typeof watchDiagrams>
  warmup: () => Promise<void>
  dispose: () => Promise<void>
}

export function createRendererRuntime(): RendererRuntime {
  const pool = new BrowserPool()

  return {
    pool,
    render: (source, type, options = {}) => render(source, type, { ...options, pool }),
    renderFile: (filePath, options = {}) => renderFile(filePath, { ...options, pool }),
    renderDiagramFileToDisk: (file, options = {}) =>
      renderDiagramFileToDisk(file, { ...options, pool }),
    renderAll: (options = {}) => renderAll({ ...options, pool }),
    watchDiagrams: (options) => watchDiagrams({ ...options, pool }),
    warmup: async () => {
      await pool.acquire()
      pool.release()
    },
    dispose: async () => {
      await pool.dispose(true)
    },
  }
}
