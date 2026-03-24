/**
 * User scenario:
 * Repository scans should find supported diagram files wherever teams place them, but they must
 * ignore hidden output folders and dependency trees so render passes do not recurse into generated content.
 *
 * What this file verifies:
 * - alias extensions are discovered as diagram sources
 * - hidden directories and `node_modules` are skipped
 * - basename resolution strips the matched extension correctly
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { filterByType, findDiagramFiles } from './discovery'

describe('discovery', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('finds supported diagram files and strips alias extensions from their names', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-discovery-test-'))
    tempDirs.push(root)

    writeFileSync(join(root, 'architecture.mmd'), 'flowchart TD\nA-->B')
    writeFileSync(join(root, 'whiteboard.excalidraw'), '{"elements":[],"appState":{},"files":{}}')
    writeFileSync(join(root, 'system.drawio.xml'), '<mxGraphModel />')

    const files = findDiagramFiles(root)

    expect(files.map((file) => file.name).sort()).toEqual(['architecture', 'system', 'whiteboard'])
    expect(files.map((file) => file.ext).sort()).toEqual(['.drawio.xml', '.excalidraw', '.mmd'])
  })

  it('skips hidden directories and node_modules', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-discovery-hidden-'))
    tempDirs.push(root)

    mkdirSync(join(root, '.diagrams'), { recursive: true })
    mkdirSync(join(root, '.git'), { recursive: true })
    mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true })
    writeFileSync(join(root, '.diagrams', 'generated.mermaid'), 'flowchart TD\nA-->B')
    writeFileSync(join(root, '.git', 'ignored.mmd'), 'flowchart TD\nA-->B')
    writeFileSync(join(root, 'node_modules', 'pkg', 'ignored.drawio'), '<mxGraphModel />')
    writeFileSync(join(root, 'kept.mermaid'), 'flowchart TD\nA-->B')

    const files = findDiagramFiles(root)

    expect(files).toHaveLength(1)
    expect(files[0]?.name).toBe('kept')
  })

  it('filters discovered files by diagram type', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-discovery-filter-'))
    tempDirs.push(root)

    writeFileSync(join(root, 'architecture.mmd'), 'flowchart TD\nA-->B')
    writeFileSync(join(root, 'system.drawio.xml'), '<mxGraphModel />')

    const files = findDiagramFiles(root)
    const mermaidFiles = filterByType(files, 'mermaid')

    expect(mermaidFiles).toHaveLength(1)
    expect(mermaidFiles[0]?.name).toBe('architecture')
  })

  it('skips custom output directory during discovery', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-discovery-outputdir-'))
    tempDirs.push(root)

    mkdirSync(join(root, '_renders'), { recursive: true })
    writeFileSync(join(root, '_renders', 'hidden.mermaid'), 'flowchart TD\nA-->B')
    writeFileSync(join(root, 'visible.mermaid'), 'flowchart TD\nC-->D')

    const files = findDiagramFiles(root, { outputDir: '_renders' })

    expect(files).toHaveLength(1)
    expect(files[0]?.name).toBe('visible')
  })

  it('finds diagrams in nested subdirectories', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-discovery-nested-'))
    tempDirs.push(root)

    mkdirSync(join(root, 'docs', 'api'), { recursive: true })
    mkdirSync(join(root, 'src', 'diagrams'), { recursive: true })
    writeFileSync(join(root, 'top.mermaid'), 'flowchart TD\nA-->B')
    writeFileSync(join(root, 'docs', 'api', 'flow.mmd'), 'flowchart TD\nC-->D')
    writeFileSync(join(root, 'src', 'diagrams', 'arch.excalidraw'), '{"elements":[]}')

    const files = findDiagramFiles(root)

    expect(files).toHaveLength(3)
    expect(files.map((f) => f.name).sort()).toEqual(['arch', 'flow', 'top'])
  })

  it('filters by excalidraw type', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-discovery-excalidraw-'))
    tempDirs.push(root)

    writeFileSync(join(root, 'flow.mermaid'), 'flowchart TD\nA-->B')
    writeFileSync(join(root, 'board.excalidraw'), '{"elements":[]}')
    writeFileSync(join(root, 'system.drawio.xml'), '<mxGraphModel />')

    const files = findDiagramFiles(root)
    const excalidrawFiles = filterByType(files, 'excalidraw')

    expect(excalidrawFiles).toHaveLength(1)
    expect(excalidrawFiles[0]?.name).toBe('board')
  })

  it('filters by drawio type', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-discovery-drawio-'))
    tempDirs.push(root)

    writeFileSync(join(root, 'flow.mermaid'), 'flowchart TD\nA-->B')
    writeFileSync(join(root, 'board.excalidraw'), '{"elements":[]}')
    writeFileSync(join(root, 'system.drawio.xml'), '<mxGraphModel />')
    writeFileSync(join(root, 'other.dio'), '<mxGraphModel />')

    const files = findDiagramFiles(root)
    const drawioFiles = filterByType(files, 'drawio')

    expect(drawioFiles).toHaveLength(2)
    expect(drawioFiles.map((f) => f.name).sort()).toEqual(['other', 'system'])
  })

  it('returns empty array for non-existent directory', () => {
    const files = findDiagramFiles('/nonexistent-path-abc123-xyz')
    expect(files).toEqual([])
  })
})
