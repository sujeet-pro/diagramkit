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

function getGlobalConfigPath(): string | null {
  const xdg = process.env.XDG_CONFIG_HOME
  const home = process.env.HOME || process.env.USERPROFILE
  if (!xdg && !home) return null
  const base = xdg || join(home!, '.config')
  return join(base, 'diagramkit', 'config.json')
}

export function loadGlobalConfig(): Partial<DiagramkitConfig> | null {
  const path = getGlobalConfigPath()
  if (!path || !existsSync(path)) return null
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

  const merged = {
    ...defaults,
    ...global,
    ...local,
    ...overrides,
  }

  // Deep-merge extensionMap so layers accumulate rather than clobber
  if (
    defaults.extensionMap ||
    global?.extensionMap ||
    local?.extensionMap ||
    overrides?.extensionMap
  ) {
    merged.extensionMap = {
      ...defaults.extensionMap,
      ...global?.extensionMap,
      ...local?.extensionMap,
      ...overrides?.extensionMap,
    }
  }

  return merged
}
