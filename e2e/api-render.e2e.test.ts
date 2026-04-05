/**
 * E2E tests for the diagramkit programmatic API.
 *
 * Each test creates an isolated temp workspace from fixture files, renders diagrams via
 * `renderAll()`, asserts the output files and manifest, then cleans up.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { dispose, render, renderAll, renderFile } from '../src/index'
import { readManifest } from '../src/manifest'
import {
  createFixtureWorkspace,
  expectNotExists,
  expectRasterFile,
  expectSvgFile,
  fixturesDir,
  readJson,
  removeWorkspace,
} from './test-utils'

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

  it('renders all types to SVG with both themes and records manifest', async () => {
    const workspace = createWorkspace('e2e-api-default')

    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    const outDir = join(workspace, '.diagramkit')
    const archLight = expectSvgFile(join(outDir, 'architecture-light.svg'))
    const archDark = expectSvgFile(join(outDir, 'architecture-dark.svg'))
    expectSvgFile(join(outDir, 'whiteboard-light.svg'))
    expectSvgFile(join(outDir, 'whiteboard-dark.svg'))
    expectSvgFile(join(outDir, 'system-light.svg'))
    expectSvgFile(join(outDir, 'system-dark.svg'))
    expectSvgFile(join(outDir, 'dependency-light.svg'))
    expectSvgFile(join(outDir, 'dependency-dark.svg'))

    expect(archLight).not.toBe(archDark)

    const manifest = readManifest(workspace)
    expect(Object.keys(manifest.diagrams).sort()).toEqual([
      'architecture.mmd',
      'dependency.dot',
      'system.drawio.xml',
      'whiteboard.excalidraw',
    ])
    expect(manifest.diagrams['architecture.mmd']?.outputs.map((o) => o.file)).toEqual([
      'architecture-light.svg',
      'architecture-dark.svg',
    ])
    expect(manifest.diagrams['architecture.mmd']?.formats).toEqual(['svg'])
    expect(manifest.diagrams['architecture.mmd']?.theme).toBe('both')
  }, 120_000)

  it('renders raster PNG with custom output dir and manifest filename', async () => {
    const workspace = createWorkspace('e2e-api-custom')

    await renderAll({
      dir: workspace,
      format: 'png',
      theme: 'light',
      config: { outputDir: '_renders', manifestFile: 'custom.manifest.json' },
    })

    const outDir = join(workspace, '_renders')
    expectRasterFile(join(outDir, 'architecture-light.png'), 'png')
    expectRasterFile(join(outDir, 'dependency-light.png'), 'png')
    expectRasterFile(join(outDir, 'whiteboard-light.png'), 'png')
    expectRasterFile(join(outDir, 'system-light.png'), 'png')

    expectNotExists(join(outDir, 'architecture-dark.png'))

    const manifest = readJson<{
      diagrams: Record<
        string,
        { outputs: Array<{ file: string }>; formats: string[]; theme: string }
      >
    }>(join(outDir, 'custom.manifest.json'))
    expect(manifest.diagrams['architecture.mmd'].outputs[0].file).toBe('architecture-light.png')
    expect(manifest.diagrams['architecture.mmd'].formats).toEqual(['png'])
    expect(manifest.diagrams['architecture.mmd'].theme).toBe('light')
  }, 120_000)

  it('supports same-folder output without manifest', async () => {
    const workspace = createWorkspace('e2e-api-samefolder')

    await renderAll({
      dir: workspace,
      format: 'svg',
      theme: 'dark',
      config: { sameFolder: true, useManifest: false },
    })

    expectSvgFile(join(workspace, 'architecture-dark.svg'))
    expectSvgFile(join(workspace, 'dependency-dark.svg'))
    expectSvgFile(join(workspace, 'whiteboard-dark.svg'))
    expectSvgFile(join(workspace, 'system-dark.svg'))

    expectNotExists(join(workspace, 'architecture-light.svg'))
    expectNotExists(join(workspace, 'manifest.json'))
    expectNotExists(join(workspace, '.diagramkit'))

    // Sources must remain intact
    expect(readFileSync(join(workspace, 'architecture.mmd'), 'utf-8')).toContain('flowchart TD')
    expect(existsSync(join(workspace, 'whiteboard.excalidraw'))).toBe(true)
    expect(existsSync(join(workspace, 'system.drawio.xml'))).toBe(true)
    expect(existsSync(join(workspace, 'dependency.dot'))).toBe(true)
  }, 120_000)

  it('skips unchanged files, re-renders modified, cleans orphans', async () => {
    const workspace = createWorkspace('e2e-api-incremental')
    const outDir = join(workspace, '.diagramkit')

    // Initial render
    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    const trackedFiles = {
      archLight: join(outDir, 'architecture-light.svg'),
      archDark: join(outDir, 'architecture-dark.svg'),
      wbLight: join(outDir, 'whiteboard-light.svg'),
      wbDark: join(outDir, 'whiteboard-dark.svg'),
    }

    const mtimes1 = Object.fromEntries(
      Object.entries(trackedFiles).map(([k, p]) => [k, statSync(p).mtimeMs]),
    )

    // Re-render unchanged — should skip all
    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    const mtimes2 = Object.fromEntries(
      Object.entries(trackedFiles).map(([k, p]) => [k, statSync(p).mtimeMs]),
    )
    expect(mtimes2).toEqual(mtimes1)

    // Modify architecture source
    await new Promise((r) => setTimeout(r, 25))
    writeFileSync(
      join(workspace, 'architecture.mmd'),
      'flowchart TD\n  Client[Client] -->|HTTP| Api[API]\n  Api --> Store[(Store)]\n  Api --> Cache[(Cache)]',
    )

    // Re-render — architecture should update, whiteboard unchanged
    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    expect(statSync(trackedFiles.archLight).mtimeMs).toBeGreaterThan(mtimes1.archLight)
    expect(statSync(trackedFiles.archDark).mtimeMs).toBeGreaterThan(mtimes1.archDark)
    expect(statSync(trackedFiles.wbLight).mtimeMs).toBe(mtimes1.wbLight)
    expect(statSync(trackedFiles.wbDark).mtimeMs).toBe(mtimes1.wbDark)

    // Delete whiteboard source — orphan cleanup
    rmSync(join(workspace, 'whiteboard.excalidraw'))
    await renderAll({ dir: workspace, format: 'svg', theme: 'both' })

    expectNotExists(join(outDir, 'whiteboard-light.svg'))
    expectNotExists(join(outDir, 'whiteboard-dark.svg'))

    const manifest = readManifest(workspace)
    expect(manifest.diagrams['whiteboard.excalidraw']).toBeUndefined()
    expect(manifest.diagrams['architecture.mmd']).toBeDefined()
    expect(manifest.diagrams['dependency.dot']).toBeDefined()
    expect(manifest.diagrams['system.drawio.xml']).toBeDefined()
  }, 120_000)

  it('filters by diagram type (mermaid only)', async () => {
    const workspace = createWorkspace('e2e-api-filter')

    await renderAll({ dir: workspace, format: 'svg', theme: 'both', type: 'mermaid' })

    const outDir = join(workspace, '.diagramkit')
    expectSvgFile(join(outDir, 'architecture-light.svg'))
    expectSvgFile(join(outDir, 'architecture-dark.svg'))
    expectNotExists(join(outDir, 'whiteboard-light.svg'))
    expectNotExists(join(outDir, 'system-light.svg'))
  }, 120_000)

  it('renders JPEG output format with correct magic bytes', async () => {
    const workspace = createWorkspace('e2e-api-jpeg')

    await renderAll({ dir: workspace, format: 'jpeg', theme: 'light' })

    const outDir = join(workspace, '.diagramkit')
    expectRasterFile(join(outDir, 'architecture-light.jpeg'), 'jpeg')
    expectRasterFile(join(outDir, 'dependency-light.jpeg'), 'jpeg')
    expectRasterFile(join(outDir, 'whiteboard-light.jpeg'), 'jpeg')
    expectRasterFile(join(outDir, 'system-light.jpeg'), 'jpeg')

    expectNotExists(join(outDir, 'architecture-dark.jpeg'))
  }, 120_000)

  it('renders WebP output format with RIFF/WEBP header', async () => {
    const workspace = createWorkspace('e2e-api-webp')

    await renderAll({ dir: workspace, format: 'webp', theme: 'light' })

    const outDir = join(workspace, '.diagramkit')
    expectRasterFile(join(outDir, 'architecture-light.webp'), 'webp')
    expectRasterFile(join(outDir, 'dependency-light.webp'), 'webp')
    expectRasterFile(join(outDir, 'whiteboard-light.webp'), 'webp')
    expectRasterFile(join(outDir, 'system-light.webp'), 'webp')

    // Verify WEBP signature in detail (bytes 8-11 are "WEBP")
    const buf = readFileSync(join(outDir, 'architecture-light.webp'))
    expect(buf.toString('ascii', 8, 12)).toBe('WEBP')
  }, 120_000)

  it('renders AVIF output format with ftypavif header', async () => {
    const workspace = createWorkspace('e2e-api-avif')

    await renderAll({ dir: workspace, format: 'avif', theme: 'light' })

    const outDir = join(workspace, '.diagramkit')
    expectRasterFile(join(outDir, 'architecture-light.avif'), 'avif')
    expectRasterFile(join(outDir, 'dependency-light.avif'), 'avif')
    expectRasterFile(join(outDir, 'whiteboard-light.avif'), 'avif')
    expectRasterFile(join(outDir, 'system-light.avif'), 'avif')
  }, 120_000)

  it('render() string API returns light and dark SVG buffers', async () => {
    const result = await render('graph LR; A-->B', 'mermaid', { theme: 'both', format: 'svg' })

    expect(result.light).toBeDefined()
    expect(result.dark).toBeDefined()
    expect(result.format).toBe('svg')
    expect(result.light).toBeInstanceOf(Buffer)
    expect(result.dark).toBeInstanceOf(Buffer)

    // Both SVGs should be valid
    const lightSvg = result.light!.toString('utf-8')
    const darkSvg = result.dark!.toString('utf-8')
    expect(lightSvg).toContain('<svg')
    expect(darkSvg).toContain('<svg')
    expect(lightSvg).not.toBe(darkSvg)
  }, 120_000)

  it('render() supports graphviz DOT source strings', async () => {
    const result = await render('digraph { A -> B }', 'graphviz', { theme: 'both', format: 'svg' })

    expect(result.light).toBeDefined()
    expect(result.dark).toBeDefined()

    const lightSvg = result.light!.toString('utf-8')
    const darkSvg = result.dark!.toString('utf-8')
    expect(lightSvg).toContain('<svg')
    expect(darkSvg).toContain('<svg')
    expect(lightSvg).not.toContain('fill="white" stroke="none"')
    expect(darkSvg).toContain('#e5e7eb')
  }, 120_000)

  it('renderFile() supports graphviz files', async () => {
    const filePath = join(fixturesDir, 'dependency.dot')
    const result = await renderFile(filePath, { format: 'svg', theme: 'both' })

    expect(result.format).toBe('svg')
    expect(result.light).toBeDefined()
    expect(result.dark).toBeDefined()
    expect(result.light!.toString('utf-8')).toContain('<svg')
    expect(result.dark!.toString('utf-8')).toContain('#e5e7eb')
  }, 120_000)

  it('renderFile() returns RenderResult with SVG buffers', async () => {
    const filePath = join(fixturesDir, 'architecture.mmd')
    const result = await renderFile(filePath, { format: 'svg', theme: 'both' })

    expect(result.format).toBe('svg')
    expect(result.light).toBeDefined()
    expect(result.dark).toBeDefined()
    expect(result.light).toBeInstanceOf(Buffer)
    expect(result.dark).toBeInstanceOf(Buffer)

    // Content should be valid SVG
    const lightSvg = result.light!.toString('utf-8')
    const darkSvg = result.dark!.toString('utf-8')
    expect(lightSvg).toContain('<svg')
    expect(darkSvg).toContain('<svg')

    // Light and dark should differ
    expect(lightSvg).not.toBe(darkSvg)
  }, 120_000)

  it('rejects invalid mermaid content', async () => {
    await expect(render('this is not valid mermaid', 'mermaid')).rejects.toThrow()
  }, 120_000)

  it('rejects renderFile with unsupported extension', async () => {
    const workspace = createWorkspace('e2e-api-unsupported')
    const txtFile = join(workspace, 'notes.txt')
    writeFileSync(txtFile, 'just some text')

    await expect(renderFile(txtFile)).rejects.toThrow(/Unknown diagram type/)
  }, 120_000)

  it('renderAll returns correct rendered, skipped, and failed arrays', async () => {
    const workspace = createWorkspace('e2e-api-result')

    // First render: all files should be rendered, none skipped
    const result1 = await renderAll({ dir: workspace, format: 'svg', theme: 'light' })

    expect(result1.rendered).toHaveLength(4)
    expect(result1.skipped).toHaveLength(0)
    expect(result1.failed).toHaveLength(0)

    // All rendered paths should be absolute and contain workspace dir
    for (const path of result1.rendered) {
      expect(path).toContain(workspace)
    }

    // Second render: all files should be skipped (manifest cached)
    const result2 = await renderAll({ dir: workspace, format: 'svg', theme: 'light' })

    expect(result2.rendered).toHaveLength(0)
    expect(result2.skipped).toHaveLength(4)
    expect(result2.failed).toHaveLength(0)
  }, 120_000)

  it('render() excalidraw string returns valid SVG', async () => {
    const json = readFileSync(join(fixturesDir, 'whiteboard.excalidraw'), 'utf-8')
    const result = await render(json, 'excalidraw', { theme: 'both', format: 'svg' })

    expect(result.light).toBeDefined()
    expect(result.dark).toBeDefined()
    expect(result.format).toBe('svg')
    expect(result.light!.toString('utf-8')).toContain('<svg')
    expect(result.dark!.toString('utf-8')).toContain('<svg')
  }, 120_000)

  it('render() drawio string returns valid SVG', async () => {
    const xml = readFileSync(join(fixturesDir, 'system.drawio.xml'), 'utf-8')
    const result = await render(xml, 'drawio', { theme: 'light', format: 'svg' })

    expect(result.light).toBeDefined()
    expect(result.dark).toBeUndefined()
    expect(result.format).toBe('svg')
    expect(result.light!.toString('utf-8')).toContain('<svg')
  }, 120_000)

  it('renderFile() excalidraw returns valid result', async () => {
    const result = await renderFile(join(fixturesDir, 'whiteboard.excalidraw'), {
      format: 'svg',
      theme: 'dark',
    })

    expect(result.dark).toBeDefined()
    expect(result.light).toBeUndefined()
    expect(result.dark!.toString('utf-8')).toContain('<svg')
  }, 120_000)

  it('renderFile() drawio returns valid result with both themes', async () => {
    const result = await renderFile(join(fixturesDir, 'system.drawio.xml'), {
      format: 'svg',
      theme: 'both',
    })

    expect(result.light).toBeDefined()
    expect(result.dark).toBeDefined()
    expect(result.light!.toString('utf-8')).toContain('<svg')
    expect(result.dark!.toString('utf-8')).toContain('<svg')
  }, 120_000)

  it('renders files with extension aliases (.mermaid, .dio)', async () => {
    const workspace = createWorkspace('e2e-api-aliases')

    // Create a .mermaid file (alias for mermaid type)
    writeFileSync(join(workspace, 'flow.mermaid'), 'graph TD; X-->Y')

    // Create a .dio file (alias for drawio type)
    const drawioContent = readFileSync(join(fixturesDir, 'system.drawio.xml'), 'utf-8')
    writeFileSync(join(workspace, 'diagram.dio'), drawioContent)

    await renderAll({
      dir: workspace,
      format: 'svg',
      theme: 'light',
      config: { useManifest: false },
    })

    const outDir = join(workspace, '.diagramkit')

    // .mermaid alias should render
    expectSvgFile(join(outDir, 'flow-light.svg'))

    // .dio alias should render
    expectSvgFile(join(outDir, 'diagram-light.svg'))
  }, 120_000)

  it('renders files discovered through a custom extensionMap override', async () => {
    const workspace = createWorkspace('e2e-api-custom-extension')
    writeFileSync(join(workspace, 'flow.custom-diagram'), 'graph TD; A-->B')

    await renderAll({
      dir: workspace,
      format: 'svg',
      theme: 'light',
      config: {
        useManifest: false,
        extensionMap: { '.custom-diagram': 'mermaid' },
      },
    })

    expectSvgFile(join(workspace, '.diagramkit', 'flow-light.svg'))
  }, 120_000)

  it('cleans nested orphan outputs even when the tree no longer contains any diagrams', async () => {
    const workspace = createWorkspace('e2e-api-empty-tree-cleanup')

    rmSync(join(workspace, 'architecture.mmd'))
    rmSync(join(workspace, 'whiteboard.excalidraw'))
    rmSync(join(workspace, 'system.drawio.xml'))

    const nestedDir = join(workspace, 'nested')
    mkdirSync(nestedDir, { recursive: true })
    writeFileSync(join(nestedDir, 'flow.mermaid'), 'graph TD; A-->B')

    await renderAll({ dir: workspace, format: 'svg', theme: 'light' })
    expectSvgFile(join(nestedDir, '.diagramkit', 'flow-light.svg'))

    rmSync(join(nestedDir, 'flow.mermaid'))
    await renderAll({ dir: workspace, format: 'svg', theme: 'light' })

    expectNotExists(join(nestedDir, '.diagramkit', 'flow-light.svg'))
    expectNotExists(join(nestedDir, '.diagramkit', 'manifest.json'))
    expectNotExists(join(nestedDir, '.diagramkit'))
  }, 120_000)
})
