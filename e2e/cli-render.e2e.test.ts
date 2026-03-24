/**
 * E2E tests for the diagramkit CLI.
 *
 * Each test creates an isolated temp workspace, runs the CLI via child_process against the
 * built `dist/cli/bin.mjs`, asserts outputs, then cleans up.
 */

import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import {
  createFixtureWorkspace,
  expectNotExists,
  expectRasterFile,
  expectSvgFile,
  readJson,
  removeWorkspace,
  runCli,
  runCliSafe,
} from './test-utils'

describe('CLI rendering e2e', () => {
  const workspaces: string[] = []

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

  it('renders single file to custom output dir', () => {
    const workspace = createWorkspace('e2e-cli-single')
    const outDir = join(workspace, 'custom-output')

    const stdout = runCli(
      [
        'render',
        join(workspace, 'system.drawio.xml'),
        '--output',
        outDir,
        '--format',
        'svg',
        '--theme',
        'dark',
      ],
      workspace,
    )

    expectSvgFile(join(outDir, 'system-dark.svg'))
    expectNotExists(join(outDir, 'system-light.svg'))
    expect(stdout).toContain('system-dark.svg')
  }, 120_000)

  it('renders a single file using extensionMap from local config and strips the custom extension from output names', () => {
    const workspace = createWorkspace('e2e-cli-custom-extension')

    writeFileSync(
      join(workspace, '.diagramkitrc.json'),
      JSON.stringify(
        {
          extensionMap: { '.custom-diagram': 'mermaid' },
        },
        null,
        2,
      ) + '\n',
    )
    writeFileSync(join(workspace, 'flow.custom-diagram'), 'graph TD; A-->B')

    runCli(['render', 'flow.custom-diagram', '--theme', 'light'], workspace)

    expectSvgFile(join(workspace, '.diagrams', 'flow-light.svg'))
    expectNotExists(join(workspace, '.diagrams', 'flow.custom-light.svg'))
  }, 120_000)

  it('renders directory with custom output-dir and manifest-file', () => {
    const workspace = createWorkspace('e2e-cli-dir')

    runCli(
      [
        'render',
        '.',
        '--output-dir',
        'rendered',
        '--manifest-file',
        'cli.manifest.json',
        '--format',
        'png',
        '--theme',
        'light',
      ],
      workspace,
    )

    const outDir = join(workspace, 'rendered')
    expectRasterFile(join(outDir, 'architecture-light.png'), 'png')
    expectRasterFile(join(outDir, 'whiteboard-light.png'), 'png')
    expectRasterFile(join(outDir, 'system-light.png'), 'png')

    expectNotExists(join(outDir, 'architecture-dark.png'))
    expect(existsSync(join(outDir, 'cli.manifest.json'))).toBe(true)

    const manifest = readJson<{ diagrams: Record<string, { outputs: string[]; theme: string }> }>(
      join(outDir, 'cli.manifest.json'),
    )
    expect(manifest.diagrams['architecture.mmd'].outputs).toEqual(['architecture-light.png'])
    expect(manifest.diagrams['architecture.mmd'].theme).toBe('light')
  }, 120_000)

  it('supports same-folder, no-manifest, type filter', () => {
    const workspace = createWorkspace('e2e-cli-filter')

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

    expectNotExists(join(workspace, 'whiteboard-light.svg'))
    expectNotExists(join(workspace, 'system-light.svg'))
    expectNotExists(join(workspace, 'diagrams.manifest.json'))
    expectNotExists(join(workspace, '.diagrams'))

    expect(readFileSync(join(workspace, 'architecture.mmd'), 'utf-8')).toContain('flowchart TD')
    expect(existsSync(join(workspace, 'whiteboard.excalidraw'))).toBe(true)
    expect(existsSync(join(workspace, 'system.drawio.xml'))).toBe(true)
  }, 120_000)

  it('--force re-renders already up-to-date files', () => {
    const workspace = createWorkspace('e2e-cli-force')
    const outDir = join(workspace, '.diagrams')

    // First render
    runCli(['render', '.', '--format', 'svg', '--theme', 'light'], workspace)

    const archPath = join(outDir, 'architecture-light.svg')
    expectSvgFile(archPath)

    // Second render without --force should skip (stdout says "up-to-date")
    const stdout2 = runCli(['render', '.', '--format', 'svg', '--theme', 'light'], workspace)
    expect(stdout2).toContain('up-to-date')

    // Third render with --force should re-render
    const stdout3 = runCli(
      ['render', '.', '--format', 'svg', '--theme', 'light', '--force'],
      workspace,
    )
    expect(stdout3).toContain('Rendered')
    expectSvgFile(archPath)
  }, 120_000)

  it('--dry-run previews without creating output files', () => {
    const workspace = createWorkspace('e2e-cli-dryrun')

    const stdout = runCli(
      ['render', '.', '--dry-run', '--format', 'svg', '--theme', 'both'],
      workspace,
    )

    // Should mention found files and what needs rendering
    expect(stdout).toContain('diagram')

    // No output directory or files should be created
    expectNotExists(join(workspace, '.diagrams'))

    // No SVGs in the workspace root either
    const files = readdirSync(workspace)
    const svgFiles = files.filter((f) => f.endsWith('.svg'))
    expect(svgFiles).toHaveLength(0)
  }, 120_000)

  it('--output rejects directory renders and points users to --output-dir', () => {
    const workspace = createWorkspace('e2e-cli-output-dir-reject')

    const result = runCliSafe(['render', '.', '--output', './rendered'], workspace)

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('--output is only supported for single-file renders')
    expectNotExists(join(workspace, 'rendered'))
  }, 120_000)

  it('--json outputs parseable JSON for directory render', () => {
    const workspace = createWorkspace('e2e-cli-json')

    const stdout = runCli(
      ['render', '.', '--format', 'svg', '--theme', 'light', '--json'],
      workspace,
    )

    // JSON is on the last line; preceding lines may contain render log messages
    const lines = stdout.trim().split('\n')
    const jsonLine = lines[lines.length - 1]!
    const parsed = JSON.parse(jsonLine)
    expect(parsed).toHaveProperty('rendered')
    expect(parsed).toHaveProperty('skipped')
    expect(parsed).toHaveProperty('failed')
    expect(Array.isArray(parsed.rendered)).toBe(true)
    expect(parsed.rendered.length).toBeGreaterThan(0)
    expect(parsed.failed).toHaveLength(0)
  }, 120_000)

  it('--quiet suppresses informational output', () => {
    const workspace = createWorkspace('e2e-cli-quiet')

    const stdout = runCli(
      ['render', '.', '--format', 'svg', '--theme', 'light', '--quiet'],
      workspace,
    )

    // With --quiet, stdout should have no informational messages (empty or minimal)
    expect(stdout.trim()).toBe('')

    // But files should still be rendered
    const outDir = join(workspace, '.diagrams')
    expectSvgFile(join(outDir, 'architecture-light.svg'))
  }, 120_000)

  it('exits with non-zero code for invalid diagram content', () => {
    const workspace = createWorkspace('e2e-cli-error')

    // Overwrite the mermaid file with invalid content
    writeFileSync(join(workspace, 'architecture.mmd'), 'this is definitely not valid mermaid!!!')

    // Remove the other files so only the invalid one is rendered
    rmSync(join(workspace, 'whiteboard.excalidraw'))
    rmSync(join(workspace, 'system.drawio.xml'))

    const result = runCliSafe(['render', '.', '--format', 'svg', '--theme', 'light'], workspace)

    expect(result.exitCode).not.toBe(0)
  }, 120_000)

  it('--help prints usage information', () => {
    const result = runCliSafe(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('diagramkit')
    expect(result.stdout).toContain('render')
    expect(result.stdout).toContain('--format')
    expect(result.stdout).toContain('--theme')
    expect(result.stdout).toContain('--help')
  }, 120_000)

  it('--version prints the version number', () => {
    const result = runCliSafe(['--version'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/diagramkit v\d+\.\d+\.\d+/)
  }, 120_000)
})
