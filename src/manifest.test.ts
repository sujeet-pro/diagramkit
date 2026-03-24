/**
 * User scenario:
 * Incremental rendering should only rebuild when sources, theme, or format changed, and it must
 * never delete source files or fresh outputs just because manifest settings changed.
 *
 * What this file verifies:
 * - output and manifest directories resolve correctly for default, custom, and same-folder modes
 * - manifest files round-trip with custom names
 * - staleness responds to content, format, and theme changes
 * - manifest updates record the exact expected output filenames
 * - orphan cleanup stays safe when manifest tracking is disabled or when outputs live beside sources
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import {
  cleanOrphans,
  ensureDiagramsDir,
  filterStaleFiles,
  getDiagramsDir,
  hashFile,
  isStale,
  readManifest,
  updateManifest,
  writeManifest,
} from './manifest'
import type { DiagramFile } from './types'

describe('manifest', () => {
  let testDir: string

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'diagramkit-manifest-test-'))
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  function createDiagram(name = 'test.mermaid', content = 'flowchart TD\nA-->B'): DiagramFile {
    const filePath = join(testDir, name)
    writeFileSync(filePath, content)
    return {
      path: filePath,
      name: name.replace(/\.mermaid$/, ''),
      dir: testDir,
      ext: '.mermaid',
    }
  }

  describe('directory helpers', () => {
    it('returns the default hidden output directory', () => {
      expect(getDiagramsDir('/some/path')).toBe('/some/path/.diagrams')
    })

    it('respects custom output directory names and same-folder mode', () => {
      expect(getDiagramsDir('/some/path', { outputDir: '_renders' })).toBe('/some/path/_renders')
      expect(getDiagramsDir('/some/path', { sameFolder: true })).toBe('/some/path')
    })

    it('creates the computed output directory', () => {
      const dir = ensureDiagramsDir(testDir, { outputDir: '_renders' })
      expect(dir).toBe(join(testDir, '_renders'))
    })
  })

  describe('readManifest / writeManifest', () => {
    it('returns an empty manifest for a new directory', () => {
      expect(readManifest(testDir)).toEqual({ version: 1, diagrams: {} })
    })

    it('reads from legacy manifest.json when diagrams.manifest.json does not exist', () => {
      const outDir = ensureDiagramsDir(testDir)
      const legacyManifest = {
        version: 1 as const,
        diagrams: {
          'old.mermaid': {
            hash: 'sha256:legacy123456789',
            generatedAt: '2025-01-01T00:00:00.000Z',
            outputs: ['old-light.svg'],
            format: 'svg' as const,
            theme: 'light' as const,
          },
        },
      }
      writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(legacyManifest))

      expect(readManifest(testDir)).toEqual(legacyManifest)
    })

    it('returns default manifest when manifest file contains invalid JSON', () => {
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'diagrams.manifest.json'), 'not json{{')

      expect(readManifest(testDir)).toEqual({ version: 1, diagrams: {} })
    })

    it('throws when manifestFile resolves outside the output directory', () => {
      expect(() => readManifest(testDir, { manifestFile: '../../etc/passwd' })).toThrow(
        /resolves outside the output directory/,
      )
    })

    it('round-trips manifest data with a custom manifest filename', () => {
      const manifest = {
        version: 1 as const,
        diagrams: {
          'test.mermaid': {
            hash: 'sha256:abc123',
            generatedAt: '2026-01-01T00:00:00.000Z',
            outputs: ['test-light.png'],
            format: 'png' as const,
            theme: 'light' as const,
          },
        },
      }

      writeManifest(testDir, manifest, {
        manifestFile: 'custom.manifest.json',
      })
      expect(readManifest(testDir, { manifestFile: 'custom.manifest.json' })).toEqual(manifest)
    })
  })

  describe('hashFile', () => {
    it('produces a short sha256 hash prefix', () => {
      const file = createDiagram()
      expect(hashFile(file.path)).toMatch(/^sha256:[0-9a-f]{16}$/)
    })

    it('produces different hashes for different content', () => {
      const file1 = createDiagram('a.mermaid', 'flowchart TD\nA-->B')
      const file2 = createDiagram('b.mermaid', 'flowchart TD\nC-->D')
      expect(hashFile(file1.path)).not.toBe(hashFile(file2.path))
    })
  })

  describe('isStale', () => {
    it('returns true for files not in the manifest', () => {
      const file = createDiagram()
      expect(isStale(file)).toBe(true)
    })

    it('returns false for unchanged files whose expected outputs still exist', () => {
      const file = createDiagram()
      updateManifest([file])

      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'test-light.svg'), '<svg width="10" height="10"/>')
      writeFileSync(join(outDir, 'test-dark.svg'), '<svg width="10" height="10"/>')

      expect(isStale(file, 'svg', undefined, 'both')).toBe(false)
    })

    it('returns true when content, format, or theme changes', () => {
      const file = createDiagram()
      updateManifest([file], 'svg', undefined, 'both')

      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'test-light.svg'), '<svg width="10" height="10"/>')
      writeFileSync(join(outDir, 'test-dark.svg'), '<svg width="10" height="10"/>')

      expect(isStale(file, 'png', undefined, 'both')).toBe(true)
      expect(isStale(file, 'svg', undefined, 'light')).toBe(true)

      writeFileSync(file.path, 'flowchart TD\nB-->C')
      expect(isStale(file, 'svg', undefined, 'both')).toBe(true)
    })
  })

  describe('updateManifest', () => {
    it('records theme-specific output names and metadata', () => {
      const file = createDiagram('flow.mermaid')
      updateManifest([file], 'png', undefined, 'light')

      expect(readManifest(testDir)).toEqual({
        version: 1,
        diagrams: {
          'flow.mermaid': {
            hash: hashFile(file.path),
            generatedAt: expect.any(String),
            outputs: ['flow-light.png'],
            format: 'png',
            theme: 'light',
          },
        },
      })
    })
  })

  describe('cleanOrphans', () => {
    it('does nothing when manifest tracking is disabled', () => {
      const file = createDiagram()
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'test-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'test-dark.svg'), '<svg/>')

      cleanOrphans([file], { useManifest: false })

      expect(readManifest(testDir)).toEqual({ version: 1, diagrams: {} })
      expect(existsSync(join(outDir, 'test-light.svg'))).toBe(true)
      expect(existsSync(join(outDir, 'test-dark.svg'))).toBe(true)
    })

    it('removes outputs for deleted sources but keeps source files in same-folder mode', () => {
      const file = createDiagram()
      const companionFile = createDiagram('keep.mermaid', 'flowchart TD\nX-->Y')

      updateManifest([file, companionFile], 'svg', { sameFolder: true }, 'both')
      writeFileSync(join(testDir, 'test-light.svg'), '<svg/>')
      writeFileSync(join(testDir, 'test-dark.svg'), '<svg/>')
      writeFileSync(join(testDir, 'keep-light.svg'), '<svg/>')
      writeFileSync(join(testDir, 'keep-dark.svg'), '<svg/>')
      writeFileSync(join(testDir, 'notes.txt'), 'keep me')

      rmSync(file.path)
      cleanOrphans([companionFile], { sameFolder: true })

      const manifest = readManifest(testDir, { sameFolder: true })
      expect(manifest.diagrams['test.mermaid']).toBeUndefined()
      expect(manifest.diagrams['keep.mermaid']).toBeDefined()
      expect(existsSync(join(testDir, 'test-light.svg'))).toBe(false)
      expect(existsSync(join(testDir, 'test-dark.svg'))).toBe(false)
      expect(existsSync(join(testDir, 'keep-light.svg'))).toBe(true)
      expect(existsSync(join(testDir, 'keep-dark.svg'))).toBe(true)
      expect(existsSync(join(testDir, 'keep.mermaid'))).toBe(true)
      expect(existsSync(join(testDir, 'notes.txt'))).toBe(true)
    })

    it('removes unreferenced files from non-same-folder output directory', () => {
      const file = createDiagram()
      const outDir = ensureDiagramsDir(testDir)

      updateManifest([file], 'svg', undefined, 'both')
      writeFileSync(join(outDir, 'test-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'test-dark.svg'), '<svg/>')
      // An extra file that is not tracked in the manifest
      writeFileSync(join(outDir, 'stale-light.svg'), '<svg/>')

      cleanOrphans([file])

      expect(existsSync(join(outDir, 'test-light.svg'))).toBe(true)
      expect(existsSync(join(outDir, 'test-dark.svg'))).toBe(true)
      expect(existsSync(join(outDir, 'stale-light.svg'))).toBe(false)
    })

    it('finds manifest directories from the root and removes empty output folders when the last source is deleted', () => {
      const nestedDir = join(testDir, 'docs')
      mkdirSync(nestedDir, { recursive: true })
      const filePath = join(nestedDir, 'flow.mermaid')
      writeFileSync(filePath, 'flowchart TD\nA-->B')

      const file: DiagramFile = {
        path: filePath,
        name: 'flow',
        dir: nestedDir,
        ext: '.mermaid',
      }

      updateManifest([file], 'svg', undefined, 'light')
      const outDir = ensureDiagramsDir(nestedDir)
      writeFileSync(join(outDir, 'flow-light.svg'), '<svg/>')

      rmSync(filePath)
      cleanOrphans([], undefined, [testDir])

      expect(existsSync(join(outDir, 'flow-light.svg'))).toBe(false)
      expect(existsSync(join(outDir, 'diagrams.manifest.json'))).toBe(false)
      expect(existsSync(outDir)).toBe(false)
    })
  })

  describe('filterStaleFiles', () => {
    it('returns all files with _hash populated when force=true', () => {
      const file1 = createDiagram('a.mermaid', 'flowchart TD\nA-->B')
      const file2 = createDiagram('b.mermaid', 'flowchart TD\nC-->D')

      // Pre-render so files would normally be up-to-date
      updateManifest([file1, file2], 'svg', undefined, 'both')
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'a-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'a-dark.svg'), '<svg/>')
      writeFileSync(join(outDir, 'b-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'b-dark.svg'), '<svg/>')

      const stale = filterStaleFiles([file1, file2], true, 'svg', undefined, 'both')
      expect(stale).toHaveLength(2)
      expect(stale[0]._hash).toMatch(/^sha256:/)
      expect(stale[1]._hash).toMatch(/^sha256:/)
    })

    it('filters out up-to-date files when force=false', () => {
      const file1 = createDiagram('a.mermaid', 'flowchart TD\nA-->B')
      const file2 = createDiagram('b.mermaid', 'flowchart TD\nC-->D')

      // Only update manifest for file1
      updateManifest([file1], 'svg', undefined, 'both')
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'a-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'a-dark.svg'), '<svg/>')

      const stale = filterStaleFiles([file1, file2], false, 'svg', undefined, 'both')
      expect(stale).toHaveLength(1)
      expect(stale[0].name).toBe('b')
      expect(stale[0]._hash).toMatch(/^sha256:/)
    })

    it('returns all files when useManifest is false', () => {
      const file1 = createDiagram('a.mermaid', 'flowchart TD\nA-->B')
      const file2 = createDiagram('b.mermaid', 'flowchart TD\nC-->D')

      // Even after updating the manifest, all files should be returned
      updateManifest([file1, file2], 'svg', undefined, 'both')
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'a-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'a-dark.svg'), '<svg/>')
      writeFileSync(join(outDir, 'b-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'b-dark.svg'), '<svg/>')

      const stale = filterStaleFiles([file1, file2], false, 'svg', { useManifest: false }, 'both')
      expect(stale).toHaveLength(2)
      expect(stale[0]._hash).toMatch(/^sha256:/)
      expect(stale[1]._hash).toMatch(/^sha256:/)
    })
  })

  describe('updateManifest with cached hash', () => {
    it('uses _hash from the file object instead of re-hashing', () => {
      const file = createDiagram('cached.mermaid', 'flowchart TD\nX-->Y')
      const fakeHash = 'sha256:deadbeefdeadbeef'
      const fileWithHash = { ...file, _hash: fakeHash }

      updateManifest([fileWithHash], 'svg', undefined, 'both')

      const manifest = readManifest(testDir)
      expect(manifest.diagrams['cached.mermaid'].hash).toBe(fakeHash)
    })
  })

  describe('path traversal protection', () => {
    it('throws when outputDir resolves outside the source directory', () => {
      expect(() => getDiagramsDir('/some/path', { outputDir: '../../../etc' })).toThrow(
        /resolves outside the source directory/,
      )
    })
  })
})
