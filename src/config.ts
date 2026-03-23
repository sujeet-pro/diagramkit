import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import type { DiagramkitConfig } from './types'

/* ── Defaults ── */

export function getDefaultConfig(): DiagramkitConfig {
  return {
    outputDir: '.diagrams',
    manifestFile: 'diagrams.manifest.json',
    useManifest: true,
    sameFolder: false,
    defaultFormat: 'svg',
    defaultTheme: 'both',
  }
}

/* ── Global config (~/.config/diagramkit/config.json) ── */

function getGlobalConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  const base = xdg || join(process.env.HOME || '', '.config')
  return join(base, 'diagramkit', 'config.json')
}

export function loadGlobalConfig(): Partial<DiagramkitConfig> | null {
  const path = getGlobalConfigPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

/* ── Local config (.diagramkitrc.json, walks up to filesystem root) ── */

export function loadLocalConfig(dir: string): Partial<DiagramkitConfig> | null {
  let current = dir
  while (true) {
    const path = join(current, '.diagramkitrc.json')
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf-8'))
      } catch {
        return null
      }
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

/* ── Merged config: defaults → global → local → overrides ── */

export function loadConfig(overrides?: Partial<DiagramkitConfig>, dir?: string): DiagramkitConfig {
  const defaults = getDefaultConfig()
  const global = loadGlobalConfig()
  const local = dir ? loadLocalConfig(dir) : null

  return {
    ...defaults,
    ...global,
    ...local,
    ...overrides,
  }
}
