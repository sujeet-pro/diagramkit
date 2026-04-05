import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('playwright', () => ({
  chromium: {
    executablePath: vi.fn(() => '/usr/bin/chromium'),
  },
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    existsSync: vi.fn((path: string) => {
      if (path === '/usr/bin/chromium') return true
      return (actual.existsSync as (p: string) => boolean)(path)
    }),
  }
})

vi.mock('sharp', () => ({}))

describe('runDoctor', () => {
  it('returns ok=true when all checks pass', async () => {
    const { runDoctor } = await import('./doctor')
    const result = await runDoctor()

    expect(result.ok).toBe(true)
    expect(result.checks).toHaveLength(4)
    expect(result.checks.every((c) => c.status !== 'error')).toBe(true)
  })

  it('includes node version check', async () => {
    const { runDoctor } = await import('./doctor')
    const result = await runDoctor()
    const nodeCheck = result.checks.find((c) => c.id === 'node_version')

    expect(nodeCheck).toBeDefined()
    expect(nodeCheck!.status).toBe('pass')
    expect(nodeCheck!.message).toContain('supported')
  })

  it('includes playwright check', async () => {
    const { runDoctor } = await import('./doctor')
    const result = await runDoctor()
    const pwCheck = result.checks.find((c) => c.id === 'playwright_package')

    expect(pwCheck).toBeDefined()
    expect(pwCheck!.status).toBe('pass')
  })

  it('includes chromium check', async () => {
    const { runDoctor } = await import('./doctor')
    const result = await runDoctor()
    const chromiumCheck = result.checks.find((c) => c.id === 'chromium')

    expect(chromiumCheck).toBeDefined()
    expect(chromiumCheck!.status).toBe('pass')
    expect(chromiumCheck!.message).toContain('installed')
  })

  it('includes sharp check', async () => {
    const { runDoctor } = await import('./doctor')
    const result = await runDoctor()
    const sharpCheck = result.checks.find((c) => c.id === 'sharp')

    expect(sharpCheck).toBeDefined()
    expect(sharpCheck!.status).toBe('pass')
  })

  it('includes diagramkit version', async () => {
    const { runDoctor } = await import('./doctor')
    const result = await runDoctor()

    expect(typeof result.diagramkitVersion).toBe('string')
    expect(result.diagramkitVersion.length).toBeGreaterThan(0)
  })
})
