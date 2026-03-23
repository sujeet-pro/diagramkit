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
}

/** Merge defaults with optional overrides. */
export function getExtensionMap(
  overrides?: Record<string, DiagramType>,
): Record<string, DiagramType> {
  if (!overrides) return { ...DEFAULT_EXTENSION_MAP }
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
  // Sort by descending length for correct longest-match behavior
  const sorted = Object.keys(map).sort((a, b) => b.length - a.length)
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
  const sorted = Object.keys(map).sort((a, b) => b.length - a.length)
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
