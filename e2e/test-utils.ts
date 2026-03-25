import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'vite-plus/test'

export const repoRoot = fileURLToPath(new URL('..', import.meta.url))
export const fixturesDir = join(repoRoot, 'e2e/fixtures/mixed-diagrams')
export const distCliPath = join(repoRoot, 'dist/cli/bin.mjs')

/* -- Workspace helpers -- */

export function createFixtureWorkspace(prefix: string): string {
  const tempRoot = mkdtempSync(join(tmpdir(), `${prefix}-`))
  const workspace = join(tempRoot, 'workspace')
  mkdirSync(workspace, { recursive: true })

  for (const entry of readdirSync(fixturesDir)) {
    if (entry.startsWith('.')) continue
    cpSync(join(fixturesDir, entry), join(workspace, entry), { recursive: true })
  }

  return workspace
}

export function removeWorkspace(workspace: string): void {
  rmSync(dirname(workspace), { recursive: true, force: true })
}

/* -- Assertion helpers -- */

export function expectSvgFile(path: string): string {
  expect(existsSync(path)).toBe(true)
  const svg = readFileSync(path, 'utf-8')
  expect(svg).toContain('<svg')
  expect(svg).toMatch(/width="[^"]+"/)
  expect(svg).toMatch(/height="[^"]+"/)
  return svg
}

export function expectRasterFile(path: string, format: 'png' | 'jpeg' | 'webp'): void {
  expect(existsSync(path)).toBe(true)
  const buf = readFileSync(path)
  expect(buf.length).toBeGreaterThan(0)

  if (format === 'png') {
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50)
  } else if (format === 'jpeg') {
    expect(buf[0]).toBe(0xff)
    expect(buf[1]).toBe(0xd8)
  } else {
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF')
  }
}

export function expectNotExists(path: string): void {
  expect(existsSync(path)).toBe(false)
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

/* -- CLI runner -- */

export function runCli(args: string[], cwd = repoRoot): string {
  return execFileSync('node', [distCliPath, ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

export interface CliResult {
  stdout: string
  stderr: string
  exitCode: number | null
}

/** Run CLI and capture stdout, stderr, exit code without throwing on non-zero exit */
export function runCliSafe(args: string[], cwd = repoRoot): CliResult {
  try {
    const stdout = execFileSync('node', [distCliPath, ...args], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (err: any) {
    return {
      stdout: (err.stdout as string) ?? '',
      stderr: (err.stderr as string) ?? '',
      exitCode: (err.status as number) ?? 1,
    }
  }
}
