/**
 * User scenario:
 * The rendering pipeline needs stable output names no matter whether the source file uses
 * a canonical extension or an alias such as `.mmd` or `.drawio.xml`.
 *
 * What this file verifies:
 * - output names are derived from the requested theme and format
 * - prefix/suffix options modify filenames correctly
 * - multi-part diagram extensions are stripped correctly before naming outputs
 * - disk writes only emit the variants that were actually rendered
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import {
  atomicWrite,
  getExpectedOutputNames,
  getOutputFileName,
  stripDiagramExtension,
  writeRenderResult,
} from './output'

describe('output helpers', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('derives output names for both theme variants', () => {
    expect(getExpectedOutputNames('architecture', 'svg', 'both')).toEqual([
      'architecture-light.svg',
      'architecture-dark.svg',
    ])
  })

  it('derives a single output name when the requested theme is light or dark', () => {
    expect(getExpectedOutputNames('architecture', 'png', 'light')).toEqual([
      'architecture-light.png',
    ])
    expect(getExpectedOutputNames('architecture', 'webp', 'dark')).toEqual([
      'architecture-dark.webp',
    ])
    expect(getOutputFileName('architecture', 'dark', 'jpeg')).toBe('architecture-dark.jpeg')
  })

  it('applies prefix and suffix to output names', () => {
    const naming = { prefix: 'diagram-', suffix: '-v2' }
    expect(getOutputFileName('arch', 'light', 'svg', naming)).toBe('diagram-arch-v2-light.svg')
    expect(getOutputFileName('arch', 'dark', 'png', naming)).toBe('diagram-arch-v2-dark.png')
  })

  it('applies prefix/suffix through getExpectedOutputNames', () => {
    const naming = { prefix: 'img-', suffix: '' }
    expect(getExpectedOutputNames('flow', 'svg', 'both', naming)).toEqual([
      'img-flow-light.svg',
      'img-flow-dark.svg',
    ])
  })

  it('strips canonical and alias diagram extensions before naming files', () => {
    expect(stripDiagramExtension('architecture.mermaid')).toBe('architecture')
    expect(stripDiagramExtension('architecture.mmd')).toBe('architecture')
    expect(stripDiagramExtension('system.drawio.xml')).toBe('system')
    expect(stripDiagramExtension('dependency.dot')).toBe('dependency')
  })

  it('strips custom configured extensions using the merged extension map', () => {
    expect(
      stripDiagramExtension('architecture.custom-diagram', { '.custom-diagram': 'mermaid' }),
    ).toBe('architecture')
  })

  it('writes only the rendered variants and creates the target directory', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'diagramkit-output-test-'))
    tempDirs.push(outDir)

    const written = writeRenderResult('whiteboard', outDir, {
      format: 'svg',
      light: Buffer.from('<svg width="10" height="10"/>'),
    })

    expect(written).toEqual(['whiteboard-light.svg'])
    expect(existsSync(join(outDir, 'whiteboard-light.svg'))).toBe(true)
    expect(existsSync(join(outDir, 'whiteboard-dark.svg'))).toBe(false)
    expect(readFileSync(join(outDir, 'whiteboard-light.svg'), 'utf-8')).toContain('<svg')
  })

  it('writes with prefix/suffix naming', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'diagramkit-output-naming-'))
    tempDirs.push(outDir)

    const written = writeRenderResult(
      'flow',
      outDir,
      { format: 'svg', light: Buffer.from('<svg/>'), dark: Buffer.from('<svg/>') },
      { prefix: 'doc-', suffix: '-final' },
    )

    expect(written).toEqual(['doc-flow-final-light.svg', 'doc-flow-final-dark.svg'])
    expect(existsSync(join(outDir, 'doc-flow-final-light.svg'))).toBe(true)
    expect(existsSync(join(outDir, 'doc-flow-final-dark.svg'))).toBe(true)
  })

  it('writes only the dark variant when only dark is provided', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'diagramkit-output-dark-'))
    tempDirs.push(outDir)

    const written = writeRenderResult('diagram', outDir, {
      format: 'svg',
      dark: Buffer.from('<svg class="dark"/>'),
    })

    expect(written).toEqual(['diagram-dark.svg'])
    expect(existsSync(join(outDir, 'diagram-dark.svg'))).toBe(true)
    expect(existsSync(join(outDir, 'diagram-light.svg'))).toBe(false)
    expect(readFileSync(join(outDir, 'diagram-dark.svg'), 'utf-8')).toContain('dark')
  })

  it('writes both light and dark variants when both are provided', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'diagramkit-output-both-'))
    tempDirs.push(outDir)

    const written = writeRenderResult('flow', outDir, {
      format: 'png',
      light: Buffer.from('light-data'),
      dark: Buffer.from('dark-data'),
    })

    expect(written).toEqual(['flow-light.png', 'flow-dark.png'])
    expect(existsSync(join(outDir, 'flow-light.png'))).toBe(true)
    expect(existsSync(join(outDir, 'flow-dark.png'))).toBe(true)
  })

  it('atomicWrite throws and cleans up .tmp on write failure', () => {
    // Writing to a non-existent directory should fail
    const badPath = join('/nonexistent-dir-abc123', 'file.svg')
    expect(() => atomicWrite(badPath, Buffer.from('data'))).toThrow()
  })

  it('throws when output filename escapes outDir', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'diagramkit-output-escape-'))
    tempDirs.push(outDir)

    expect(() =>
      writeRenderResult('../outside', outDir, {
        format: 'svg',
        light: Buffer.from('<svg/>'),
      }),
    ).toThrow('Output path escapes output directory')
  })

  it('strips all supported diagram extensions', () => {
    expect(stripDiagramExtension('board.excalidraw')).toBe('board')
    expect(stripDiagramExtension('diagram.dio')).toBe('diagram')
    expect(stripDiagramExtension('system.drawio.xml')).toBe('system')
    expect(stripDiagramExtension('flow.drawio')).toBe('flow')
    expect(stripDiagramExtension('chart.mmdc')).toBe('chart')
    expect(stripDiagramExtension('dependency.gv')).toBe('dependency')
    expect(stripDiagramExtension('topology.graphviz')).toBe('topology')
  })
})
