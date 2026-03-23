import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import {
  ensureDiagramsDir,
  getDiagramsDir,
  hashFile,
  isStale,
  readManifest,
  updateManifest,
  writeManifest,
} from '../manifest'
import type { DiagramFile } from '../types'

describe('manifest', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `diagramkit-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  describe('getDiagramsDir', () => {
    it('returns .diagrams subdirectory', () => {
      expect(getDiagramsDir('/some/path')).toBe('/some/path/.diagrams')
    })
  })

  describe('ensureDiagramsDir', () => {
    it('creates .diagrams directory', () => {
      const dir = ensureDiagramsDir(testDir)
      expect(dir).toBe(join(testDir, '.diagrams'))
    })
  })

  describe('readManifest / writeManifest', () => {
    it('returns empty manifest for new directory', () => {
      const manifest = readManifest(testDir)
      expect(manifest).toEqual({ version: 1, diagrams: {} })
    })

    it('round-trips manifest data', () => {
      const manifest = {
        version: 1 as const,
        diagrams: {
          'test.mermaid': {
            hash: 'sha256:abc123',
            generatedAt: '2026-01-01T00:00:00.000Z',
            outputs: ['test-light.svg', 'test-dark.svg'],
          },
        },
      }
      writeManifest(testDir, manifest)
      expect(readManifest(testDir)).toEqual(manifest)
    })
  })

  describe('hashFile', () => {
    it('produces sha256 hash prefix', () => {
      const filePath = join(testDir, 'test.mermaid')
      writeFileSync(filePath, 'graph LR; A-->B')
      const hash = hashFile(filePath)
      expect(hash).toMatch(/^sha256:[0-9a-f]{16}$/)
    })

    it('produces different hashes for different content', () => {
      const file1 = join(testDir, 'a.mermaid')
      const file2 = join(testDir, 'b.mermaid')
      writeFileSync(file1, 'graph LR; A-->B')
      writeFileSync(file2, 'graph TD; C-->D')
      expect(hashFile(file1)).not.toBe(hashFile(file2))
    })
  })

  describe('isStale', () => {
    it('returns true for files not in manifest', () => {
      const filePath = join(testDir, 'test.mermaid')
      writeFileSync(filePath, 'graph LR; A-->B')

      const file: DiagramFile = {
        path: filePath,
        name: 'test',
        dir: testDir,
        ext: '.mermaid',
      }
      expect(isStale(file)).toBe(true)
    })

    it('returns false for unchanged files with existing outputs', () => {
      const filePath = join(testDir, 'test.mermaid')
      writeFileSync(filePath, 'graph LR; A-->B')

      const file: DiagramFile = {
        path: filePath,
        name: 'test',
        dir: testDir,
        ext: '.mermaid',
      }

      // Create manifest and output files
      updateManifest([file])
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'test-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'test-dark.svg'), '<svg/>')

      expect(isStale(file)).toBe(false)
    })

    it('returns true when content changes', () => {
      const filePath = join(testDir, 'test.mermaid')
      writeFileSync(filePath, 'graph LR; A-->B')

      const file: DiagramFile = {
        path: filePath,
        name: 'test',
        dir: testDir,
        ext: '.mermaid',
      }

      updateManifest([file])
      const outDir = ensureDiagramsDir(testDir)
      writeFileSync(join(outDir, 'test-light.svg'), '<svg/>')
      writeFileSync(join(outDir, 'test-dark.svg'), '<svg/>')

      // Change content
      writeFileSync(filePath, 'graph TD; C-->D')
      expect(isStale(file)).toBe(true)
    })
  })
})
