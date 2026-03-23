/**
 * User scenario:
 * The rendering pipeline needs stable output names no matter whether the source file uses
 * a canonical extension or an alias such as `.mmd` or `.drawio.xml`.
 *
 * What this file verifies:
 * - output names are derived from the requested theme and format
 * - multi-part diagram extensions are stripped correctly before naming outputs
 * - disk writes only emit the variants that were actually rendered
 *
 * These checks stay unit-level on purpose so naming regressions are caught before slower
 * end-to-end rendering tests run.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import {
  getExpectedOutputNames,
  getOutputFileName,
  stripDiagramExtension,
  writeRenderResult,
} from '../output'

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

  it('strips canonical and alias diagram extensions before naming files', () => {
    expect(stripDiagramExtension('architecture.mermaid')).toBe('architecture')
    expect(stripDiagramExtension('architecture.mmd')).toBe('architecture')
    expect(stripDiagramExtension('system.drawio.xml')).toBe('system')
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
})
