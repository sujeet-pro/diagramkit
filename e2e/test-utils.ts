import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'vite-plus/test'

export const repoRoot = fileURLToPath(new URL('..', import.meta.url))
export const fixturesDir = join(repoRoot, 'e2e/fixtures/mixed-diagrams')
export const distCliPath = join(repoRoot, 'dist/cli/bin.mjs')

/**
 * Quiet logger used by e2e tests to silence the library's normal info/warn
 * output (e.g. "Rendered 4/4 diagrams to svg" or the mermaid aspect-ratio
 * notice triggered by the fixture) while keeping real errors visible so a
 * failing render is never hidden from the test runner. Production defaults
 * stay informative; the tests just don't need the routine noise to interleave
 * with the runner output.
 */
export const silentLogger = {
  log: () => {},
  warn: () => {},
  error: (message: string, ...args: unknown[]) => {
    console.error(message, ...args)
  },
} as const

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
  // Validate it's a complete SVG document (not truncated from a partial write)
  expect(svg).toContain('</svg>')
  // Should contain at least one visual element (not just an empty SVG shell)
  expect(svg).toMatch(/<(rect|path|circle|ellipse|line|polygon|polyline|text|g|use|image)\b/)
  return svg
}

export function expectRasterFile(path: string, format: 'png' | 'jpeg' | 'webp' | 'avif'): void {
  expect(existsSync(path)).toBe(true)
  const buf = readFileSync(path)
  expect(buf.length).toBeGreaterThan(0)

  if (format === 'png') {
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50)
  } else if (format === 'jpeg') {
    expect(buf[0]).toBe(0xff)
    expect(buf[1]).toBe(0xd8)
  } else if (format === 'avif') {
    // AVIF files have 'ftyp' at bytes 4-7
    expect(buf.toString('ascii', 4, 8)).toBe('ftyp')
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

function getSymlinkedCliPath(cwd: string): string {
  const binDir = join(cwd, 'node_modules', '.bin')
  const binPath = join(binDir, 'diagramkit')
  mkdirSync(binDir, { recursive: true })
  rmSync(binPath, { force: true })
  symlinkSync(distCliPath, binPath, 'file')
  return binPath
}

function getRelativeSymlinkedCliPath(cwd: string): string {
  getSymlinkedCliPath(cwd)
  return './node_modules/.bin/diagramkit'
}

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

export function runCliViaBin(args: string[], cwd = repoRoot): string {
  return execFileSync('node', [getSymlinkedCliPath(cwd), ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

export function runCliViaRelativeBin(args: string[], cwd = repoRoot): string {
  return execFileSync('node', [getRelativeSymlinkedCliPath(cwd), ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

export function runCliAsExecutableViaBin(args: string[], cwd = repoRoot): string {
  return execFileSync(getRelativeSymlinkedCliPath(cwd), args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

export function runCliViaBinSafe(args: string[], cwd = repoRoot): CliResult {
  try {
    const stdout = execFileSync('node', [getSymlinkedCliPath(cwd), ...args], {
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

export function runCliViaRelativeBinSafe(args: string[], cwd = repoRoot): CliResult {
  try {
    const stdout = execFileSync('node', [getRelativeSymlinkedCliPath(cwd), ...args], {
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

export function runCliAsExecutableViaBinSafe(args: string[], cwd = repoRoot): CliResult {
  try {
    const stdout = execFileSync(getRelativeSymlinkedCliPath(cwd), args, {
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
