import type { DiagramType } from './types'

export interface DiagramEngineProfile {
  runtime: 'chromium' | 'wasm'
  requiresBrowserPool: boolean
  serializedWithinLane: boolean
  laneOrder: number
}

export const ENGINE_PROFILES: Record<DiagramType, DiagramEngineProfile> = {
  mermaid: {
    runtime: 'chromium',
    requiresBrowserPool: true,
    serializedWithinLane: true,
    laneOrder: 1,
  },
  excalidraw: {
    runtime: 'chromium',
    requiresBrowserPool: true,
    serializedWithinLane: true,
    laneOrder: 2,
  },
  drawio: {
    runtime: 'chromium',
    requiresBrowserPool: true,
    serializedWithinLane: true,
    laneOrder: 3,
  },
  graphviz: {
    runtime: 'wasm',
    requiresBrowserPool: false,
    serializedWithinLane: true,
    laneOrder: 4,
  },
}

export function getEngineProfile(type: DiagramType): DiagramEngineProfile {
  return ENGINE_PROFILES[type]
}
