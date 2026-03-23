import { execFileSync } from 'child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { expect } from 'vite-plus/test'

export const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
export const fixturesDir = join(repoRoot, 'src/e2e/fixtures/mixed-diagrams')
export const distCliPath = join(repoRoot, 'dist/cli/bin.mjs')

export function createFixtureWorkspace(prefix: string): string {
  const tempRoot = mkdtempSync(join(tmpdir(), `${prefix}-`))
  const workspace = join(tempRoot, 'workspace')
  mkdirSync(workspace, { recursive: true })

  for (const entry of readdirSync(fixturesDir)) {
    cpSync(join(fixturesDir, entry), join(workspace, entry), { recursive: true })
  }

  return workspace
}

export function removeWorkspace(workspace: string): void {
  rmSync(dirname(workspace), { recursive: true, force: true })
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

export function readText(path: string): string {
  return readFileSync(path, 'utf-8')
}

export function expectSvgFile(path: string): string {
  expect(existsSync(path)).toBe(true)
  const svg = readText(path)
  expect(svg).toContain('<svg')
  expect(svg).toMatch(/width="[^"]+"/)
  expect(svg).toMatch(/height="[^"]+"/)
  return svg
}

export async function expectRasterFile(
  path: string,
  format: 'png' | 'jpeg' | 'webp',
): Promise<void> {
  expect(existsSync(path)).toBe(true)
  const buffer = readFileSync(path)
  expect(buffer.length).toBeGreaterThan(0)

  if (format === 'png') {
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50)
  } else if (format === 'jpeg') {
    expect(buffer[0]).toBe(0xff)
    expect(buffer[1]).toBe(0xd8)
  } else {
    expect(buffer.toString('ascii', 0, 4)).toBe('RIFF')
  }

  const sharpModule = await import('sharp')
  const sharp = sharpModule.default ?? sharpModule
  const metadata = await sharp(buffer).metadata()
  expect(metadata.width).toBeGreaterThan(0)
  expect(metadata.height).toBeGreaterThan(0)
}

export function buildDist(): void {
  execFileSync('npm', ['run', 'build'], {
    cwd: repoRoot,
    stdio: 'pipe',
  })
}

export function runCli(args: string[], cwd = repoRoot): string {
  return execFileSync('node', [distCliPath, ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}
