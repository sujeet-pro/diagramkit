/**
 * User scenario:
 * Incremental rendering should only rebuild when sources, theme, or format changed, and it must
 * never delete source files or fresh outputs just because manifest settings changed.
 *
 * What this file verifies:
 * - output and manifest directories resolve correctly for default, custom, and same-folder modes
 * - manifest files round-trip with custom names (v2 format with ManifestOutput objects)
 * - staleness responds to content, format, and theme changes
 * - manifest updates record structured output metadata
 * - orphan cleanup stays safe when manifest tracking is disabled or when outputs live beside sources
 * - v1 manifests are migrated to v2 on read
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  cleanOrphans,
  ensureDiagramsDir,
  filterStaleFiles,
  getDiagramsDir,
  hashFile,
  isStale,
  planStaleFiles,
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
      expect(getDiagramsDir('/some/path')).toBe('/some/path/.diagramkit')
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
    it('returns an empty v2 manifest for a new directory', () => {
      expect(readManifest(testDir)).toEqual({ version: 2, diagrams: {} })
    })

    it('migrates v1 manifest with string outputs to v2 ManifestOutput objects', () => {
      const outDir = ensureDiagramsDir(testDir)
      const legacyManifest = {
        version: 1,
        diagrams: {
          'old.mermaid': {
            hash: 'sha256:legacy123456789',
            generatedAt: '2025-01-01T00:00:00.000Z',
            outputs: ['old-light.svg', 'old-dark.svg'],
            format: 'svg',
            theme: 'both',
          },
        },
      }
      writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(legacyManifest))

      const manifest = readManifest(testDir)
      expect(manifest.version).toBe(2)
      expect(manifest.diagrams['old.mermaid'].formats).toEqual(['svg'])
      // Outputs should be migrated to ManifestOutput objects
      expect(manifest.diagrams['old.mermaid'].outputs).toEqual([
        { file: 'old-light.svg', format: 'svg', theme: 'light' },
        { file: 'old-dark.svg', format: 'svg', theme: 'dark' },
      ])
    })

    it('reads from legacy diagrams.manifest.json and migrates format field', () => {
      const outDir = ensureDiagramsDir(testDir)
      const legacyManifest = {
        version: 1,
        diagrams: {
          'old.mermaid': {
            hash: 'sha256:legacy123456789',
            generatedAt: '2025-01-01T00:00:00.000Z',
            outputs: ['old-light.svg'],
            format: 'svg',
            theme: 'light',
          },
        },
      }
      writeFileSync(join(outDir, 'diagrams.manifest.json'), JSON.stringify(legacyManifest))

      const manifest = readManifest(testDir)
      expect(manifest.diagrams['old.mermaid'].formats).toEqual(['svg'])
    })

    it('returns default manifest when manifest file contains invalid JSON', () => {
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'manifest.json'), 'not json{{')

      expect(readManifest(testDir)).toEqual({ version: 2, diagrams: {} })
    })

    it('moves corrupt manifest files aside before resetting', () => {
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'manifest.json'), 'not json{{')

      readManifest(testDir)

      const entries = readdirSync(outDir)
      expect(entries.some((entry) => entry.startsWith('manifest.json.corrupt.'))).toBe(true)
    })

    it('returns default manifest and warns when manifest file is unreadable', () => {
      const outDir = ensureDiagramsDir(testDir)
      mkdirSync(join(outDir, 'manifest.json'))
      const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

      expect(readManifest(testDir)).toEqual({ version: 2, diagrams: {} })
      expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('failed to parse manifest'))
    })

    it('throws when manifestFile resolves outside the output directory', () => {
      expect(() => readManifest(testDir, { manifestFile: '../../etc/passwd' })).toThrow(
        /resolves outside the output directory/,
      )
    })

    it('round-trips v2 manifest data with a custom manifest filename', () => {
      const manifest = {
        version: 2 as const,
        diagrams: {
          'test.mermaid': {
            hash: 'sha256:abc123',
            generatedAt: '2026-01-01T00:00:00.000Z',
            outputs: [{ file: 'test-light.png', format: 'png' as const, theme: 'light' as const }],
            formats: ['png'] as 'png'[],
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

      expect(isStale(file, ['svg'], undefined, 'both')).toBe(false)
    })

    it('returns true when content, format, or theme changes', () => {
      const file = createDiagram()
      updateManifest([file], ['svg'], undefined, 'both')

      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'test-light.svg'), '<svg width="10" height="10"/>')
      writeFileSync(join(outDir, 'test-dark.svg'), '<svg width="10" height="10"/>')

      // Requesting png: effective formats = union(['png'], ['svg']) = ['svg', 'png']
      // Missing png outputs → stale
      expect(isStale(file, ['png'], undefined, 'both')).toBe(true)
      expect(isStale(file, ['svg'], undefined, 'light')).toBe(true)

      writeFileSync(file.path, 'flowchart TD\nB-->C')
      expect(isStale(file, ['svg'], undefined, 'both')).toBe(true)
    })
  })

  describe('updateManifest', () => {
    it('records theme-specific output names with ManifestOutput objects', () => {
      const file = createDiagram('flow.mermaid')
      updateManifest([file], ['png'], undefined, 'light')

      const manifest = readManifest(testDir)
      const entry = manifest.diagrams['flow.mermaid']
      expect(entry.hash).toBe(hashFile(file.path))
      expect(entry.formats).toEqual(['png'])
      expect(entry.theme).toBe('light')
      expect(entry.mtimeMs).toBe(statSync(file.path).mtimeMs)
      expect(entry.size).toBe(statSync(file.path).size)
      // Outputs should be ManifestOutput objects
      expect(entry.outputs).toEqual([
        expect.objectContaining({ file: 'flow-light.png', format: 'png', theme: 'light' }),
      ])
    })

    it('stores custom output metadata when provided', () => {
      const file = createDiagram('meta.mermaid')
      const fileWithMeta = {
        ...file,
        _outputMeta: [
          {
            file: 'meta-light.png',
            format: 'png' as const,
            theme: 'light' as const,
            width: 800,
            height: 600,
            quality: 90,
            scale: 2,
          },
        ],
      }

      updateManifest([fileWithMeta], ['png'], undefined, 'light')

      const manifest = readManifest(testDir)
      const entry = manifest.diagrams['meta.mermaid']
      expect(entry.outputs[0]).toEqual({
        file: 'meta-light.png',
        format: 'png',
        theme: 'light',
        width: 800,
        height: 600,
        quality: 90,
        scale: 2,
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

      expect(readManifest(testDir)).toEqual({ version: 2, diagrams: {} })
      expect(existsSync(join(outDir, 'test-light.svg'))).toBe(true)
      expect(existsSync(join(outDir, 'test-dark.svg'))).toBe(true)
    })

    it('removes outputs for deleted sources but keeps source files in same-folder mode', () => {
      const file = createDiagram()
      const companionFile = createDiagram('keep.mermaid', 'flowchart TD\nX-->Y')

      updateManifest([file, companionFile], ['svg'], { sameFolder: true }, 'both')
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

      updateManifest([file], ['svg'], undefined, 'both')
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

      updateManifest([file], ['svg'], undefined, 'light')
      const outDir = ensureDiagramsDir(nestedDir)
      writeFileSync(join(outDir, 'flow-light.svg'), '<svg/>')

      rmSync(filePath)
      cleanOrphans([], undefined, [testDir])

      expect(existsSync(join(outDir, 'flow-light.svg'))).toBe(false)
      expect(existsSync(join(outDir, 'manifest.json'))).toBe(false)
      expect(existsSync(outDir)).toBe(false)
    })
  })

  describe('filterStaleFiles', () => {
    it('returns all files when force=true (hash deferred to updateManifest)', () => {
      const file1 = createDiagram('a.mermaid', 'flowchart TD\nA-->B')
      const file2 = createDiagram('b.mermaid', 'flowchart TD\nC-->D')

      // Pre-render so files would normally be up-to-date
      updateManifest([file1, file2], ['svg'], undefined, 'both')
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'a-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'a-dark.svg'), '<svg/>')
      writeFileSync(join(outDir, 'b-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'b-dark.svg'), '<svg/>')

      const stale = filterStaleFiles([file1, file2], true, ['svg'], undefined, 'both')
      expect(stale).toHaveLength(2)
      // _hash is deferred for force=true — updateManifest computes it via fallback
      expect(stale[0]._hash).toBeUndefined()
    })

    it('filters out up-to-date files when force=false', () => {
      const file1 = createDiagram('a.mermaid', 'flowchart TD\nA-->B')
      const file2 = createDiagram('b.mermaid', 'flowchart TD\nC-->D')

      // Only update manifest for file1
      updateManifest([file1], ['svg'], undefined, 'both')
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'a-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'a-dark.svg'), '<svg/>')

      const stale = filterStaleFiles([file1, file2], false, ['svg'], undefined, 'both')
      expect(stale).toHaveLength(1)
      expect(stale[0].name).toBe('b')
      // _hash deferred for files without manifest entry — updateManifest computes it
      expect(stale[0]._hash).toBeUndefined()
    })

    it('returns all files when useManifest is false', () => {
      const file1 = createDiagram('a.mermaid', 'flowchart TD\nA-->B')
      const file2 = createDiagram('b.mermaid', 'flowchart TD\nC-->D')

      // Even after updating the manifest, all files should be returned
      updateManifest([file1, file2], ['svg'], undefined, 'both')
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'a-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'a-dark.svg'), '<svg/>')
      writeFileSync(join(outDir, 'b-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'b-dark.svg'), '<svg/>')

      const stale = filterStaleFiles([file1, file2], false, ['svg'], { useManifest: false }, 'both')
      expect(stale).toHaveLength(2)
      // _hash deferred when manifest disabled — updateManifest computes it
      expect(stale[0]._hash).toBeUndefined()
    })
  })

  describe('updateManifest with cached hash', () => {
    it('uses _hash from the file object instead of re-hashing', () => {
      const file = createDiagram('cached.mermaid', 'flowchart TD\nX-->Y')
      const fakeHash = 'sha256:deadbeefdeadbeef'
      const fileWithHash = { ...file, _hash: fakeHash }

      updateManifest([fileWithHash], ['svg'], undefined, 'both')

      const manifest = readManifest(testDir)
      expect(manifest.diagrams['cached.mermaid'].hash).toBe(fakeHash)
    })
  })

  describe('planStaleFiles', () => {
    it('returns forced reason when force=true', () => {
      const file = createDiagram('plan-forced.mermaid', 'flowchart TD\nA-->B')
      const plan = planStaleFiles([file], true, ['svg'], undefined, 'both')

      expect(plan).toHaveLength(1)
      expect(plan[0].path).toBe(file.path)
      expect(plan[0].reasons).toEqual([{ code: 'forced' }])
    })

    it('returns no_manifest_entry reason for new files', () => {
      const file = createDiagram('plan-new.mermaid', 'flowchart TD\nX-->Y')
      const plan = planStaleFiles([file], false, ['svg'], undefined, 'both')

      expect(plan).toHaveLength(1)
      expect(plan[0].reasons).toEqual([{ code: 'no_manifest_entry' }])
    })

    it('returns content_changed reason when hash differs', () => {
      const file = createDiagram('plan-change.mermaid', 'flowchart TD\nA-->B')
      updateManifest([file], ['svg'], undefined, 'both')

      const outDir = getDiagramsDir(testDir)
      writeFileSync(join(outDir, 'plan-change-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'plan-change-dark.svg'), '<svg/>')

      writeFileSync(file.path, 'flowchart TD\nC-->D')

      const plan = planStaleFiles([file], false, ['svg'], undefined, 'both')

      expect(plan).toHaveLength(1)
      const codes = plan[0].reasons.map((r) => r.code)
      expect(codes).toContain('content_changed')
    })

    it('returns empty array when file is up-to-date', () => {
      const file = createDiagram('plan-uptodate.mermaid', 'flowchart TD\nA-->B')
      updateManifest([file], ['svg'], undefined, 'both')

      const outDir = getDiagramsDir(testDir)
      writeFileSync(join(outDir, 'plan-uptodate-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'plan-uptodate-dark.svg'), '<svg/>')

      const plan = planStaleFiles([file], false, ['svg'], undefined, 'both')
      expect(plan).toHaveLength(0)
    })

    it('includes effectiveFormats in plan entries', () => {
      const file = createDiagram('plan-formats.mermaid', 'flowchart TD\nA-->B')
      const plan = planStaleFiles([file], true, ['svg', 'png'], undefined, 'both')

      expect(plan[0].effectiveFormats).toEqual(['svg', 'png'])
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
