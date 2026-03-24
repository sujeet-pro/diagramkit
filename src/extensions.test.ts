import { describe, expect, it } from 'vite-plus/test'
import {
  getAllExtensions,
  getDiagramType,
  getExtensionMap,
  getExtensionsForType,
  getMatchedExtension,
} from './extensions'

describe('getDiagramType', () => {
  it('resolves .mermaid to mermaid', () => {
    expect(getDiagramType('flow.mermaid')).toBe('mermaid')
  })

  it('resolves .mmd alias to mermaid', () => {
    expect(getDiagramType('flow.mmd')).toBe('mermaid')
  })

  it('resolves .mmdc alias to mermaid', () => {
    expect(getDiagramType('flow.mmdc')).toBe('mermaid')
  })

  it('resolves .excalidraw to excalidraw', () => {
    expect(getDiagramType('arch.excalidraw')).toBe('excalidraw')
  })

  it('resolves .drawio to drawio', () => {
    expect(getDiagramType('network.drawio')).toBe('drawio')
  })

  it('resolves .dio to drawio', () => {
    expect(getDiagramType('network.dio')).toBe('drawio')
  })

  it('resolves .drawio.xml to drawio (longest-first match)', () => {
    expect(getDiagramType('network.drawio.xml')).toBe('drawio')
  })

  it('returns null for unknown extensions', () => {
    expect(getDiagramType('readme.md')).toBeNull()
    expect(getDiagramType('style.css')).toBeNull()
  })
})

describe('getMatchedExtension', () => {
  it('returns the matched extension string', () => {
    expect(getMatchedExtension('flow.mmd')).toBe('.mmd')
    expect(getMatchedExtension('arch.drawio.xml')).toBe('.drawio.xml')
    expect(getMatchedExtension('arch.drawio')).toBe('.drawio')
  })

  it('returns null for unmatched files', () => {
    expect(getMatchedExtension('readme.md')).toBeNull()
  })
})

describe('getExtensionMap', () => {
  it('returns defaults without overrides', () => {
    const map = getExtensionMap()
    expect(map['.mermaid']).toBe('mermaid')
    expect(map['.drawio']).toBe('drawio')
  })

  it('merges custom overrides', () => {
    const map = getExtensionMap({ '.puml': 'mermaid' as any })
    expect(map['.puml']).toBe('mermaid')
    expect(map['.mermaid']).toBe('mermaid')
  })
})

describe('getAllExtensions', () => {
  it('returns all known extensions', () => {
    const exts = getAllExtensions()
    expect(exts).toContain('.mermaid')
    expect(exts).toContain('.mmd')
    expect(exts).toContain('.excalidraw')
    expect(exts).toContain('.drawio')
    expect(exts).toContain('.drawio.xml')
    expect(exts).toContain('.dio')
  })
})

describe('getExtensionsForType', () => {
  it('returns mermaid extensions', () => {
    const exts = getExtensionsForType('mermaid')
    expect(exts).toContain('.mermaid')
    expect(exts).toContain('.mmd')
    expect(exts).toContain('.mmdc')
    expect(exts).not.toContain('.excalidraw')
  })

  it('returns drawio extensions', () => {
    const exts = getExtensionsForType('drawio')
    expect(exts).toContain('.drawio')
    expect(exts).toContain('.drawio.xml')
    expect(exts).toContain('.dio')
  })
})
