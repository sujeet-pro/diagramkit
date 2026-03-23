import type { DiagramRenderer } from '../types'
import { DrawioRenderer } from './drawio'
import { ExcalidrawRenderer } from './excalidraw'
import { MermaidRenderer } from './mermaid'

export { DrawioRenderer } from './drawio'
export { ExcalidrawRenderer } from './excalidraw'
export { MermaidRenderer } from './mermaid'

export function createRenderers(): DiagramRenderer[] {
  return [new MermaidRenderer(), new ExcalidrawRenderer(), new DrawioRenderer()]
}
