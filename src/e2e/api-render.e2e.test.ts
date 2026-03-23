/**
 * User scenario:
 * A library consumer renders a mixed repository of Mermaid, Excalidraw, and Draw.io sources and
 * expects the final files on disk to stay correct across theme changes, raster formats,
 * manifest settings, custom output locations, and incremental rebuilds.
 *
 * What this file verifies:
 * - `renderAll()` writes real outputs for one fixture of each diagram type
 * - output naming stays stable even when source files use alias extensions
 * - manifest files reflect the exact generated variants, format, and theme
 * - `sameFolder` and `useManifest: false` do not destroy source files
 * - incremental rebuilds skip unchanged files and clean orphaned outputs when sources disappear
 *
 * Each test creates its own temporary workspace so this file can run independently or in
 * parallel with other end-to-end suites.
 */

import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { dispose, renderAll } from '../index'
import { readManifest } from '../manifest'
import {
  createFixtureWorkspace,
  expectRasterFile,
  expectSvgFile,
  removeWorkspace,
} from '../test-utils/e2e'

describe('API rendering e2e', () => {
  const workspaces: string[] = []

  afterEach(async () => {
    await dispose()
    for (const workspace of workspaces.splice(0)) {
      removeWorkspace(workspace)
    }
  })

  function createWorkspace(name: string): string {
    const workspace = createFixtureWorkspace(name)
    workspaces.push(workspace)
    return workspace
  }

  it('renders mixed diagrams to the default output directory and records a manifest', async () => {
    const workspace = createWorkspace('diagramkit-api-default')

    await renderAll({
      dir: workspace,
      format: 'svg',
      theme: 'both',
    })

    const outDir = join(workspace, '.diagrams')
    const architectureLight = expectSvgFile(join(outDir, 'architecture-light.svg'))
    const architectureDark = expectSvgFile(join(outDir, 'architecture-dark.svg'))
    const whiteboardLight = expectSvgFile(join(outDir, 'whiteboard-light.svg'))
    const whiteboardDark = expectSvgFile(join(outDir, 'whiteboard-dark.svg'))
    const systemLight = expectSvgFile(join(outDir, 'system-light.svg'))
    const systemDark = expectSvgFile(join(outDir, 'system-dark.svg'))

    expect(architectureLight).not.toBe(architectureDark)
    expect(whiteboardLight).not.toBe(whiteboardDark)
    expect(systemLight).not.toBe(systemDark)

    const manifest = readManifest(workspace)
    expect(Object.keys(manifest.diagrams).sort()).toEqual([
      'architecture.mmd',
      'system.drawio.xml',
      'whiteboard.excalidraw',
    ])
    expect(manifest.diagrams['architecture.mmd']?.outputs).toEqual([
      'architecture-light.svg',
      'architecture-dark.svg',
    ])
    expect(manifest.diagrams['system.drawio.xml']?.outputs).toEqual([
      'system-light.svg',
      'system-dark.svg',
    ])
    expect(manifest.diagrams['whiteboard.excalidraw']?.outputs).toEqual([
      'whiteboard-light.svg',
      'whiteboard-dark.svg',
    ])
    expect(manifest.diagrams['architecture.mmd']?.format).toBe('svg')
    expect(manifest.diagrams['architecture.mmd']?.theme).toBe('both')
  }, 120_000)

  it('renders raster outputs with a custom output directory and custom manifest filename', async () => {
    const workspace = createWorkspace('diagramkit-api-custom')

    await renderAll({
      dir: workspace,
      format: 'png',
      theme: 'light',
      config: {
        outputDir: '_renders',
        manifestFile: 'custom.manifest.json',
      },
    })

    const outDir = join(workspace, '_renders')
    await expectRasterFile(join(outDir, 'architecture-light.png'), 'png')
    await expectRasterFile(join(outDir, 'whiteboard-light.png'), 'png')
    await expectRasterFile(join(outDir, 'system-light.png'), 'png')

    expect(existsSync(join(outDir, 'architecture-dark.png'))).toBe(false)
    expect(existsSync(join(outDir, 'whiteboard-dark.png'))).toBe(false)
    expect(existsSync(join(outDir, 'system-dark.png'))).toBe(false)

    const manifest = readManifest(workspace, {
      outputDir: '_renders',
      manifestFile: 'custom.manifest.json',
    })
    expect(manifest.diagrams['architecture.mmd']?.outputs).toEqual(['architecture-light.png'])
    expect(manifest.diagrams['architecture.mmd']?.format).toBe('png')
    expect(manifest.diagrams['architecture.mmd']?.theme).toBe('light')
  }, 120_000)

  it('supports same-folder outputs without manifest tracking and leaves sources intact', async () => {
    const workspace = createWorkspace('diagramkit-api-same-folder')

    await renderAll({
      dir: workspace,
      format: 'jpeg',
      theme: 'dark',
      config: {
        sameFolder: true,
        useManifest: false,
      },
    })

    await expectRasterFile(join(workspace, 'architecture-dark.jpeg'), 'jpeg')
    await expectRasterFile(join(workspace, 'whiteboard-dark.jpeg'), 'jpeg')
    await expectRasterFile(join(workspace, 'system-dark.jpeg'), 'jpeg')

    expect(existsSync(join(workspace, 'architecture-light.jpeg'))).toBe(false)
    expect(existsSync(join(workspace, 'diagrams.manifest.json'))).toBe(false)
    expect(existsSync(join(workspace, '.diagrams'))).toBe(false)

    expect(readFileSync(join(workspace, 'architecture.mmd'), 'utf-8')).toContain('flowchart TD')
    expect(existsSync(join(workspace, 'whiteboard.excalidraw'))).toBe(true)
    expect(existsSync(join(workspace, 'system.drawio.xml'))).toBe(true)
  }, 120_000)

  it('skips unchanged files and removes orphaned outputs after source deletion', async () => {
    const workspace = createWorkspace('diagramkit-api-incremental')
    const outDir = join(workspace, '.diagrams')
    const architectureSource = join(workspace, 'architecture.mmd')

    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    const trackedFiles = {
      architectureLight: join(outDir, 'architecture-light.svg'),
      architectureDark: join(outDir, 'architecture-dark.svg'),
      whiteboardLight: join(outDir, 'whiteboard-light.svg'),
      whiteboardDark: join(outDir, 'whiteboard-dark.svg'),
    }

    const initialTimes = Object.fromEntries(
      Object.entries(trackedFiles).map(([key, path]) => [key, statSync(path).mtimeMs]),
    )

    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    const unchangedTimes = Object.fromEntries(
      Object.entries(trackedFiles).map(([key, path]) => [key, statSync(path).mtimeMs]),
    )
    expect(unchangedTimes).toEqual(initialTimes)

    await new Promise((resolve) => setTimeout(resolve, 25))
    writeFileSync(
      architectureSource,
      [
        'flowchart TD',
        'Client[Client] -->|HTTP| Api[API]',
        'Api --> Store[(Store)]',
        'Api --> Cache[(Cache)]',
      ].join('\n'),
    )

    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    expect(statSync(trackedFiles.architectureLight).mtimeMs).toBeGreaterThan(
      initialTimes.architectureLight,
    )
    expect(statSync(trackedFiles.architectureDark).mtimeMs).toBeGreaterThan(
      initialTimes.architectureDark,
    )
    expect(statSync(trackedFiles.whiteboardLight).mtimeMs).toBe(initialTimes.whiteboardLight)
    expect(statSync(trackedFiles.whiteboardDark).mtimeMs).toBe(initialTimes.whiteboardDark)

    rmSync(join(workspace, 'whiteboard.excalidraw'))

    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    expect(existsSync(join(outDir, 'whiteboard-light.svg'))).toBe(false)
    expect(existsSync(join(outDir, 'whiteboard-dark.svg'))).toBe(false)

    const manifest = readManifest(workspace)
    expect(manifest.diagrams['whiteboard.excalidraw']).toBeUndefined()
    expect(manifest.diagrams['architecture.mmd']).toBeDefined()
    expect(manifest.diagrams['system.drawio.xml']).toBeDefined()
  }, 120_000)
})
