import type { DiagramType } from './types'

/* ── Built-in extension-to-type mapping with aliases ── */

const DEFAULT_EXTENSION_MAP: Record<string, DiagramType> = {
  '.mermaid': 'mermaid',
  '.mmd': 'mermaid',
  '.mmdc': 'mermaid',
  '.excalidraw': 'excalidraw',
  '.drawio': 'drawio',
  '.drawio.xml': 'drawio',
  '.dio': 'drawio',
  '.graphviz': 'graphviz',
  '.dot': 'graphviz',
  '.gv': 'graphviz',
}

const DEFAULT_SORTED_KEYS = Object.keys(DEFAULT_EXTENSION_MAP).sort((a, b) => b.length - a.length)
const SORTED_KEYS_CACHE = new WeakMap<Record<string, DiagramType>, string[]>()

function getSortedKeys(map: Record<string, DiagramType>): string[] {
  if (map === DEFAULT_EXTENSION_MAP) return DEFAULT_SORTED_KEYS
  const cached = SORTED_KEYS_CACHE.get(map)
  if (cached) return cached
  const sorted = Object.keys(map).sort((a, b) => b.length - a.length)
  SORTED_KEYS_CACHE.set(map, sorted)
  return sorted
}

/** Merge defaults with optional overrides. Returns the default map by reference when no overrides. */
export function getExtensionMap(
  overrides?: Record<string, DiagramType>,
): Record<string, DiagramType> {
  if (!overrides) return DEFAULT_EXTENSION_MAP
  return { ...DEFAULT_EXTENSION_MAP, ...overrides }
}

/**
 * Resolve diagram type from a filename.
 * Tests extensions longest-first so `.drawio.xml` matches before `.xml`.
 */
export function getDiagramType(
  filename: string,
  map: Record<string, DiagramType> = DEFAULT_EXTENSION_MAP,
): DiagramType | null {
  const sorted = getSortedKeys(map)
  for (const ext of sorted) {
    if (filename.endsWith(ext)) return map[ext]!
  }
  return null
}

/**
 * Get the matched extension string from a filename.
 * Returns the extension key (e.g. '.mmd', '.drawio.xml') or null.
 */
export function getMatchedExtension(
  filename: string,
  map: Record<string, DiagramType> = DEFAULT_EXTENSION_MAP,
): string | null {
  const sorted = getSortedKeys(map)
  for (const ext of sorted) {
    if (filename.endsWith(ext)) return ext
  }
  return null
}

/** Return all known extensions. */
export function getAllExtensions(
  map: Record<string, DiagramType> = DEFAULT_EXTENSION_MAP,
): string[] {
  return Object.keys(map)
}

/** Return extensions that map to a given diagram type. */
export function getExtensionsForType(
  type: DiagramType,
  map: Record<string, DiagramType> = DEFAULT_EXTENSION_MAP,
): string[] {
  return Object.entries(map)
    .filter(([, t]) => t === type)
    .map(([ext]) => ext)
}
