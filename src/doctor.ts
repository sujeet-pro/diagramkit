import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface DoctorCheck {
  id: 'node_version' | 'playwright_package' | 'chromium' | 'sharp'
  status: 'pass' | 'info' | 'error'
  message: string
}

export interface DoctorResult {
  ok: boolean
  diagramkitVersion: string
  checks: DoctorCheck[]
}

function readVersion(): string {
  const candidates = [
    new URL('../package.json', import.meta.url),
    new URL('../../package.json', import.meta.url),
  ]
  for (const url of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(fileURLToPath(url), 'utf-8')) as {
        name?: string
        version?: string
      }
      if (pkg.name === 'diagramkit' && pkg.version) return pkg.version
    } catch {}
  }
  return 'unknown'
}

export async function runDoctor(): Promise<DoctorResult> {
  const checks: DoctorCheck[] = []
  const nodeMajor = Number(process.versions.node.split('.')[0] ?? '0')
  checks.push({
    id: 'node_version',
    status: nodeMajor >= 24 ? 'pass' : 'error',
    message:
      nodeMajor >= 24
        ? `Node ${process.versions.node} is supported`
        : `Node ${process.versions.node} is unsupported (requires >= 24)`,
  })

  let chromiumPath: string | null = null
  try {
    const { chromium } = await import('playwright')
    checks.push({
      id: 'playwright_package',
      status: 'pass',
      message: 'playwright package is installed',
    })
    chromiumPath = chromium.executablePath()
  } catch {
    checks.push({
      id: 'playwright_package',
      status: 'error',
      message: 'playwright package is missing',
    })
  }

  if (!chromiumPath) {
    checks.push({
      id: 'chromium',
      status: 'error',
      message: 'Chromium executable path unavailable. Run diagramkit warmup.',
    })
  } else {
    checks.push({
      id: 'chromium',
      status: existsSync(chromiumPath) ? 'pass' : 'error',
      message: existsSync(chromiumPath)
        ? 'Chromium browser is installed'
        : 'Chromium browser not found. Run diagramkit warmup.',
    })
  }

  try {
    await import('sharp')
    checks.push({
      id: 'sharp',
      status: 'pass',
      message: 'sharp is installed (raster formats available)',
    })
  } catch {
    checks.push({
      id: 'sharp',
      status: 'info',
      message: 'sharp is not installed (PNG/JPEG/WebP/AVIF unavailable)',
    })
  }

  return {
    ok: checks.every((c) => c.status !== 'error'),
    diagramkitVersion: readVersion(),
    checks,
  }
}
