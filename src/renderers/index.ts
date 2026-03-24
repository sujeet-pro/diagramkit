import type { DiagramRenderer } from '../types'
import { DrawioRenderer } from './drawio'
import { ExcalidrawRenderer } from './excalidraw'
import { MermaidRenderer } from './mermaid'

export { DrawioRenderer } from './drawio'
export { ExcalidrawRenderer } from './excalidraw'
export { MermaidRenderer } from './mermaid'

/**
 * @deprecated Use render(), renderFile(), or renderAll() from the main API instead.
 * Class-based renderers are legacy and may be removed in a future major version.
 */
export function createRenderers(): DiagramRenderer[] {
  return [new MermaidRenderer(), new ExcalidrawRenderer(), new DrawioRenderer()]
}
