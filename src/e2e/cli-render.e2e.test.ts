/**
 * User scenario:
 * A CLI user renders one file or an entire directory and expects the command-line flags to control
 * output placement, manifest behavior, type filtering, and output naming exactly the same way as the API.
 *
 * What this file verifies:
 * - single-file CLI renders create custom output directories on demand
 * - alias extensions still produce clean output names from the CLI
 * - directory renders respect custom output-dir and manifest-file flags
 * - `--same-folder`, `--no-manifest`, and `--type` work together without touching unrelated sources
 *
 * Each test uses a fresh copied fixture workspace so the suite can run independently or in parallel
 * with other end-to-end files.
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test'
import {
  buildDist,
  createFixtureWorkspace,
  expectRasterFile,
  expectSvgFile,
  removeWorkspace,
  runCli,
} from '../test-utils/e2e'

describe('CLI rendering e2e', () => {
  const workspaces: string[] = []

  beforeAll(() => {
    buildDist()
  })

  afterEach(() => {
    for (const workspace of workspaces.splice(0)) {
      removeWorkspace(workspace)
    }
  })

  function createWorkspace(name: string): string {
    const workspace = createFixtureWorkspace(name)
    workspaces.push(workspace)
    return workspace
  }

  it('renders a single alias-based source file to a custom output directory', async () => {
    const workspace = createWorkspace('diagramkit-cli-single')
    const outDir = join(workspace, 'custom-output')

    const stdout = runCli(
      [
        'render',
        join(workspace, 'system.drawio.xml'),
        '--output',
        outDir,
        '--format',
        'webp',
        '--theme',
        'dark',
      ],
      workspace,
    )

    await expectRasterFile(join(outDir, 'system-dark.webp'), 'webp')
    expect(existsSync(join(outDir, 'system-light.webp'))).toBe(false)
    expect(stdout).toContain('system-dark.webp')
  }, 120_000)

  it('renders a directory to a custom output folder and custom manifest filename', async () => {
    const workspace = createWorkspace('diagramkit-cli-directory')

    runCli(
      [
        'render',
        '.',
        '--output-dir',
        'rendered',
        '--manifest-file',
        'cli.manifest.json',
        '--format',
        'jpeg',
        '--theme',
        'light',
      ],
      workspace,
    )

    const outDir = join(workspace, 'rendered')
    await expectRasterFile(join(outDir, 'architecture-light.jpeg'), 'jpeg')
    await expectRasterFile(join(outDir, 'whiteboard-light.jpeg'), 'jpeg')
    await expectRasterFile(join(outDir, 'system-light.jpeg'), 'jpeg')

    expect(existsSync(join(outDir, 'architecture-dark.jpeg'))).toBe(false)
    expect(existsSync(join(outDir, 'cli.manifest.json'))).toBe(true)

    const manifest = JSON.parse(readFileSync(join(outDir, 'cli.manifest.json'), 'utf-8'))
    expect(manifest.diagrams['architecture.mmd'].outputs).toEqual(['architecture-light.jpeg'])
    expect(manifest.diagrams['architecture.mmd'].theme).toBe('light')
  }, 120_000)

  it('supports same-folder rendering without a manifest and respects type filters', async () => {
    const workspace = createWorkspace('diagramkit-cli-filtered')

    runCli(
      [
        'render',
        '.',
        '--same-folder',
        '--no-manifest',
        '--type',
        'mermaid',
        '--format',
        'svg',
        '--theme',
        'both',
      ],
      workspace,
    )

    expectSvgFile(join(workspace, 'architecture-light.svg'))
    expectSvgFile(join(workspace, 'architecture-dark.svg'))

    expect(existsSync(join(workspace, 'whiteboard-light.svg'))).toBe(false)
    expect(existsSync(join(workspace, 'system-light.svg'))).toBe(false)
    expect(existsSync(join(workspace, 'diagrams.manifest.json'))).toBe(false)
    expect(existsSync(join(workspace, '.diagrams'))).toBe(false)

    expect(readFileSync(join(workspace, 'architecture.mmd'), 'utf-8')).toContain('flowchart TD')
    expect(existsSync(join(workspace, 'whiteboard.excalidraw'))).toBe(true)
    expect(existsSync(join(workspace, 'system.drawio.xml'))).toBe(true)
  }, 120_000)
})
