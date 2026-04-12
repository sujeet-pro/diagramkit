/**
 * E2E tests for the diagramkit CLI.
 *
 * Each test creates an isolated temp workspace, runs the CLI via child_process against the
 * built `dist/cli/bin.mjs`, asserts outputs, then cleans up.
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import {
  createFixtureWorkspace,
  distCliPath,
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

    expectSvgFile(join(workspace, '.diagramkit', 'flow-light.svg'))
    expectNotExists(join(workspace, '.diagramkit', 'flow.custom-light.svg'))
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
    expectRasterFile(join(outDir, 'dependency-light.png'), 'png')
    expectRasterFile(join(outDir, 'whiteboard-light.png'), 'png')
    expectRasterFile(join(outDir, 'system-light.png'), 'png')

    expectNotExists(join(outDir, 'architecture-dark.png'))
    expect(existsSync(join(outDir, 'cli.manifest.json'))).toBe(true)

    const manifest = readJson<{
      diagrams: Record<string, { outputs: Array<{ file: string }>; theme: string }>
    }>(join(outDir, 'cli.manifest.json'))
    expect(manifest.diagrams['architecture.mmd'].outputs[0].file).toBe('architecture-light.png')
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
    expectNotExists(join(workspace, 'dependency-light.svg'))

    expectNotExists(join(workspace, 'whiteboard-light.svg'))
    expectNotExists(join(workspace, 'system-light.svg'))
    expectNotExists(join(workspace, 'manifest.json'))
    expectNotExists(join(workspace, '.diagramkit'))

    expect(readFileSync(join(workspace, 'architecture.mmd'), 'utf-8')).toContain('flowchart TD')
    expect(existsSync(join(workspace, 'whiteboard.excalidraw'))).toBe(true)
    expect(existsSync(join(workspace, 'system.drawio.xml'))).toBe(true)
    expect(existsSync(join(workspace, 'dependency.dot'))).toBe(true)
  }, 120_000)

  it('--force re-renders already up-to-date files', () => {
    const workspace = createWorkspace('e2e-cli-force')
    const outDir = join(workspace, '.diagramkit')

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
    expectNotExists(join(workspace, '.diagramkit'))

    // No SVGs in the workspace root either
    const files = readdirSync(workspace)
    const svgFiles = files.filter((f) => f.endsWith('.svg'))
    expect(svgFiles).toHaveLength(0)
  }, 120_000)

  it('--output sends directory renders to a custom output folder', () => {
    const workspace = createWorkspace('e2e-cli-output-dir')

    runCli(
      ['render', '.', '--output', './rendered', '--format', 'svg', '--theme', 'light'],
      workspace,
    )

    const outDir = join(workspace, 'rendered')
    expectSvgFile(join(outDir, 'architecture-light.svg'))
    expectSvgFile(join(outDir, 'dependency-light.svg'))
    // Custom --output disables manifest
    expectNotExists(join(outDir, 'manifest.json'))
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
    expect(parsed).toHaveProperty('schemaVersion', 1)
    expect(parsed).toHaveProperty('command', 'render')
    expect(parsed).toHaveProperty('phase', 'execute')
    expect(parsed).toHaveProperty('target.kind', 'directory')
    expect(parsed).toHaveProperty('result.rendered')
    expect(parsed).toHaveProperty('result.skipped')
    expect(parsed).toHaveProperty('result.failed')
    expect(Array.isArray(parsed.result.rendered)).toBe(true)
    expect(parsed.result.rendered.length).toBeGreaterThan(0)
    expect(parsed.result.failed).toHaveLength(0)
  }, 120_000)

  it('--plan --json returns stale reasons', () => {
    const workspace = createWorkspace('e2e-cli-plan-json')
    const stdout = runCli(
      ['render', '.', '--plan', '--json', '--format', 'svg', '--theme', 'light'],
      workspace,
    )
    const lines = stdout.trim().split('\n')
    const parsed = JSON.parse(lines[lines.length - 1]!)

    expect(parsed).toHaveProperty('schemaVersion', 1)
    expect(parsed).toHaveProperty('phase', 'dry-run')
    expect(parsed).toHaveProperty('target.kind', 'directory')
    expect(Array.isArray(parsed.result.stalePlan)).toBe(true)
    expect(parsed.result.stalePlan.length).toBeGreaterThan(0)
    expect(parsed.result.stalePlan[0]).toHaveProperty('reasons')
    expect(Array.isArray(parsed.result.stalePlan[0].reasons)).toBe(true)
  }, 120_000)

  it('doctor --json returns machine-readable diagnostics', () => {
    const result = runCliSafe(['doctor', '--json'])
    const stdout = result.stdout.trim()
    expect(stdout.length).toBeGreaterThan(0)
    const parsed = JSON.parse(stdout)

    expect(parsed).toHaveProperty('diagramkitVersion')
    expect(parsed).toHaveProperty('checks')
    expect(Array.isArray(parsed.checks)).toBe(true)
    expect(parsed.checks.length).toBeGreaterThan(0)
    expect(parsed.checks[0]).toHaveProperty('id')
    expect(parsed.checks[0]).toHaveProperty('status')
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
    const outDir = join(workspace, '.diagramkit')
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

  it('--no-contrast produces different dark SVG than default', () => {
    const workspace = createWorkspace('e2e-cli-no-contrast')

    // Render with contrast optimization (default)
    runCli(['render', 'architecture.mmd', '--theme', 'dark', '--format', 'svg'], workspace)
    const withContrast = readFileSync(
      join(workspace, '.diagramkit', 'architecture-dark.svg'),
      'utf-8',
    )

    // Clean up for fresh render
    rmSync(join(workspace, '.diagramkit'), { recursive: true, force: true })

    // Render without contrast optimization
    runCli(
      ['render', 'architecture.mmd', '--theme', 'dark', '--format', 'svg', '--no-contrast'],
      workspace,
    )
    const withoutContrast = readFileSync(
      join(workspace, '.diagramkit', 'architecture-dark.svg'),
      'utf-8',
    )

    // Both should be valid SVGs
    expect(withContrast).toContain('<svg')
    expect(withoutContrast).toContain('<svg')

    // Contrast optimization modifies dark colors, so outputs should differ
    expect(withContrast).not.toBe(withoutContrast)
  }, 120_000)

  it('--scale 3 produces a larger PNG than default scale', () => {
    const workspace = createWorkspace('e2e-cli-scale')
    const outDir = join(workspace, '.diagramkit')

    // Render at default scale (2)
    runCli(['render', 'architecture.mmd', '--format', 'png', '--theme', 'light'], workspace)
    const defaultSize = readFileSync(join(outDir, 'architecture-light.png')).length

    // Clean up for fresh render
    rmSync(outDir, { recursive: true, force: true })

    // Render at scale 3
    runCli(
      ['render', 'architecture.mmd', '--format', 'png', '--theme', 'light', '--scale', '3'],
      workspace,
    )
    const scaledPath = join(outDir, 'architecture-light.png')
    expectRasterFile(scaledPath, 'png')
    const scaledSize = readFileSync(scaledPath).length

    // Higher scale should produce a larger file
    expect(scaledSize).toBeGreaterThan(defaultSize)
  }, 120_000)

  it('--quality 50 produces a valid JPEG', () => {
    const workspace = createWorkspace('e2e-cli-quality')

    runCli(
      ['render', 'architecture.mmd', '--format', 'jpeg', '--quality', '50', '--theme', 'light'],
      workspace,
    )

    const outPath = join(workspace, '.diagramkit', 'architecture-light.jpeg')
    expectRasterFile(outPath, 'jpeg')
  }, 120_000)

  it('--strict-config fails on invalid local config values', () => {
    const workspace = createWorkspace('e2e-cli-strict-config')
    writeFileSync(join(workspace, 'diagramkit.config.json5'), "{ outputDir: '../escape' }")

    const result = runCliSafe(['render', '.', '--strict-config'], workspace)
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('contains path traversal')
  }, 120_000)

  it('--max-type-lanes is propagated to render metrics', () => {
    const workspace = createWorkspace('e2e-cli-max-type-lanes')
    const stdout = runCli(['render', '.', '--json', '--max-type-lanes', '1'], workspace)
    const parsed = JSON.parse(stdout.trim().split('\n').pop()!)

    expect(parsed.result).toHaveProperty('metrics.lanesUsed', 1)
  }, 120_000)

  it('init creates diagramkit.config.json5 with valid config', () => {
    const workspace = createWorkspace('e2e-cli-init')

    // Remove any fixture files — init doesn't need them
    rmSync(join(workspace, 'architecture.mmd'))
    rmSync(join(workspace, 'whiteboard.excalidraw'))
    rmSync(join(workspace, 'system.drawio.xml'))

    const stdout = runCli(['init'], workspace)

    const configPath = join(workspace, 'diagramkit.config.json5')
    expect(existsSync(configPath)).toBe(true)

    const content = readFileSync(configPath, 'utf-8')
    expect(content).toContain('diagramkit configuration')
    expect(content).toContain('{')
    expect(content).toContain('}')
    expect(stdout).toContain('diagramkit.config.json5')
  }, 120_000)

  it('--install-skill creates project skills and skips existing files', () => {
    const workspace = createWorkspace('e2e-cli-install-skill')
    const claudeSkillPath = join(workspace, '.claude', 'skills', 'diagramkit', 'SKILL.md')
    const cursorSkillPath = join(workspace, '.cursor', 'skills', 'diagramkit', 'SKILL.md')

    const first = runCli(['--install-skill'], workspace)

    expect(existsSync(claudeSkillPath)).toBe(true)
    expect(existsSync(cursorSkillPath)).toBe(true)
    expect(first).toContain('.claude/skills/diagramkit/SKILL.md')
    expect(first).toContain('.cursor/skills/diagramkit/SKILL.md')

    const installedContent = readFileSync(cursorSkillPath, 'utf-8')
    expect(installedContent).toContain('node_modules/diagramkit/llms.txt')
    expect(installedContent).toContain('"render:diagrams": "diagramkit render ."')

    writeFileSync(claudeSkillPath, 'custom skill\n')

    const second = runCli(['--install-skill'], workspace)

    expect(readFileSync(claudeSkillPath, 'utf-8')).toBe('custom skill\n')
    expect(readFileSync(cursorSkillPath, 'utf-8')).toBe(installedContent)
    expect(second).toContain('Skipped existing files:')
  }, 120_000)

  it('--agent-help outputs llms-full.txt content', () => {
    const stdout = runCli(['--agent-help'])

    expect(stdout).toContain('diagramkit')
    expect(stdout).toContain('Full Reference')
    expect(stdout).toContain('DiagramType')
  }, 120_000)

  it('warmup installs Playwright chromium successfully', () => {
    const result = runCliSafe(['warmup'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Done.')
  }, 120_000)

  it('--watch re-renders when source file changes', async () => {
    const workspace = createWorkspace('e2e-cli-watch')

    // Keep only the mermaid file for a fast, focused test
    rmSync(join(workspace, 'whiteboard.excalidraw'))
    rmSync(join(workspace, 'system.drawio.xml'))

    const outDir = join(workspace, '.diagramkit')
    const outputFile = join(outDir, 'architecture-light.svg')

    // Start CLI in watch mode as a background process
    const child = spawn(
      'node',
      [distCliPath, 'render', '.', '--watch', '--format', 'svg', '--theme', 'light'],
      {
        cwd: workspace,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    // Collect stdout for debugging
    let stdout = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    // Helper: poll until a condition is true, with timeout
    const pollUntil = (
      fn: () => boolean,
      interval: number,
      timeout: number,
      label: string,
    ): Promise<void> =>
      new Promise((resolve, reject) => {
        const deadline = Date.now() + timeout
        const check = () => {
          if (fn()) return resolve()
          if (Date.now() > deadline)
            return reject(new Error(`Timed out: ${label}\nstdout: ${stdout}\nstderr: ${stderr}`))
          setTimeout(check, interval)
        }
        check()
      })

    try {
      // Wait for the watcher to be fully ready (stdout includes "Watching" message)
      await pollUntil(
        () => stdout.includes('Watching for diagram changes'),
        200,
        30_000,
        'waiting for watcher ready',
      )

      // Verify initial render produced the output file
      expectSvgFile(outputFile)

      // Wait for fs.watch to fully initialize after chokidar setup
      await new Promise((r) => setTimeout(r, 3000))

      // Add a new diagram file to trigger an 'add' event (more reliable than 'change' across OSes)
      const newFile = join(workspace, 'extra.mmd')
      const newOutputFile = join(outDir, 'extra-light.svg')
      writeFileSync(newFile, 'flowchart TD\n    X[New] -->|HTTP| Y[Node]\n')

      // Wait for the "Re-rendered" message, confirming the watch cycle completed
      await pollUntil(() => stdout.includes('Re-rendered'), 200, 20_000, 'waiting for re-render')

      // Verify the new file was rendered
      const renderedSvg = readFileSync(newOutputFile, 'utf-8')
      expect(renderedSvg).toContain('<svg')
    } finally {
      // Clean up the watch process
      child.kill('SIGTERM')
      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve())
        // Fallback: force kill if SIGTERM does not work within 5s
        setTimeout(() => {
          child.kill('SIGKILL')
          resolve()
        }, 5_000)
      })
    }
  }, 60_000)
})
