import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import type { DiagramkitConfig, FileOverride, OutputFormat, Theme } from './types'

const require = createRequire(import.meta.url)

/* ── defineConfig (identity helper for TS autocomplete) ── */

export function defineConfig(config: Partial<DiagramkitConfig>): Partial<DiagramkitConfig> {
  return config
}

/* ── Defaults ── */

export function getDefaultConfig(): DiagramkitConfig {
  return {
    outputDir: '.diagramkit',
    manifestFile: 'manifest.json',
    useManifest: true,
    sameFolder: false,
    defaultFormats: ['svg'],
    defaultTheme: 'both',
    outputPrefix: '',
    outputSuffix: '',
  }
}

/* ── Config file names (searched per directory, first match wins) ── */

const LOCAL_CONFIG_NAMES = ['diagramkit.config.ts', 'diagramkit.config.json5', '.diagramkitrc.json']

/* ── Global config (~/.config/diagramkit/) ── */

function getGlobalConfigDir(): string | null {
  const xdg = process.env.XDG_CONFIG_HOME
  const home = process.env.HOME || process.env.USERPROFILE
  if (!xdg && !home) return null
  const base = xdg || join(home!, '.config')
  return join(base, 'diagramkit')
}

function loadGlobalConfig(): Partial<DiagramkitConfig> | null {
  const dir = getGlobalConfigDir()
  if (!dir) return null

  // Try json5 first, then json (legacy)
  for (const name of ['config.json5', 'config.json']) {
    const path = join(dir, name)
    if (!existsSync(path)) continue
    try {
      if (name.endsWith('.json5')) {
        const JSON5 = require('json5')
        return migrateRawConfig(JSON5.parse(readFileSync(path, 'utf-8')))
      }
      return migrateRawConfig(JSON.parse(readFileSync(path, 'utf-8')))
    } catch {
      continue
    }
  }
  return null
}

/* ── Local config (walks up to filesystem root) ── */

function loadLocalConfig(dir: string): Partial<DiagramkitConfig> | null {
  let current = dir
  while (true) {
    for (const name of LOCAL_CONFIG_NAMES) {
      const path = join(current, name)
      if (!existsSync(path)) continue
      try {
        if (name.endsWith('.ts')) {
          const { createJiti } = require('jiti')
          const jiti = createJiti(import.meta.url, { interopDefault: true })
          const loaded = jiti(path)
          return migrateRawConfig(loaded)
        }
        if (name.endsWith('.json5')) {
          const JSON5 = require('json5')
          return migrateRawConfig(JSON5.parse(readFileSync(path, 'utf-8')))
        }
        return migrateRawConfig(JSON.parse(readFileSync(path, 'utf-8')))
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

/* ── Environment variable overrides ── */

function loadEnvConfig(): Partial<DiagramkitConfig> {
  const env: Partial<DiagramkitConfig> = {}

  if (process.env.DIAGRAMKIT_FORMAT) {
    const formats = process.env.DIAGRAMKIT_FORMAT.split(',')
      .map((s) => s.trim())
      .filter(Boolean) as OutputFormat[]
    if (formats.length > 0) env.defaultFormats = formats
  }

  if (process.env.DIAGRAMKIT_THEME) {
    const theme = process.env.DIAGRAMKIT_THEME as Theme
    if (['light', 'dark', 'both'].includes(theme)) env.defaultTheme = theme
  }

  if (process.env.DIAGRAMKIT_OUTPUT_DIR) {
    env.outputDir = process.env.DIAGRAMKIT_OUTPUT_DIR
  }

  if (process.env.DIAGRAMKIT_NO_MANIFEST === '1' || process.env.DIAGRAMKIT_NO_MANIFEST === 'true') {
    env.useManifest = false
  }

  return env
}

/* ── Config migration (backward compat for old field names) ── */

function migrateRawConfig(raw: any): Partial<DiagramkitConfig> {
  if (!raw || typeof raw !== 'object') return {}

  // Migrate old defaultFormat (string) → defaultFormats (array)
  if ('defaultFormat' in raw && !('defaultFormats' in raw)) {
    raw.defaultFormats = [raw.defaultFormat]
  }
  delete raw.defaultFormat

  // Migrate old outputDir '.diagrams' → '.diagramkit'
  if (raw.outputDir === '.diagrams') {
    raw.outputDir = '.diagramkit'
  }

  // Migrate old manifestFile 'diagrams.manifest.json' → 'manifest.json'
  if (raw.manifestFile === 'diagrams.manifest.json') {
    raw.manifestFile = 'manifest.json'
  }

  return raw
}

/* ── Explicit config file ── */

function loadExplicitConfig(configPath: string): Partial<DiagramkitConfig> | null {
  const path = join(configPath) // normalize
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${configPath}`)
  }
  try {
    if (path.endsWith('.ts')) {
      const { createJiti } = require('jiti')
      const jiti = createJiti(import.meta.url, { interopDefault: true })
      return migrateRawConfig(jiti(path))
    }
    if (path.endsWith('.json5')) {
      const JSON5 = require('json5')
      return migrateRawConfig(JSON5.parse(readFileSync(path, 'utf-8')))
    }
    return migrateRawConfig(JSON.parse(readFileSync(path, 'utf-8')))
  } catch (err: any) {
    if (err.message?.startsWith('Config file not found')) throw err
    throw new Error(`Failed to load config file: ${configPath} — ${err.message}`)
  }
}

/* ── Merged config: defaults → global → env → local → overrides ── */

export function loadConfig(
  overrides?: Partial<DiagramkitConfig>,
  dir?: string,
  configFile?: string,
): DiagramkitConfig {
  const defaults = getDefaultConfig()
  const global = loadGlobalConfig()
  const env = loadEnvConfig()
  // Explicit config file takes priority over auto-discovered local config
  const local = configFile ? loadExplicitConfig(configFile) : dir ? loadLocalConfig(dir) : null

  const merged = {
    ...defaults,
    ...global,
    ...env,
    ...local,
    ...overrides,
  }

  // Deep-merge extensionMap so layers accumulate rather than clobber
  if (
    defaults.extensionMap ||
    global?.extensionMap ||
    env.extensionMap ||
    local?.extensionMap ||
    overrides?.extensionMap
  ) {
    merged.extensionMap = {
      ...defaults.extensionMap,
      ...global?.extensionMap,
      ...env.extensionMap,
      ...local?.extensionMap,
      ...overrides?.extensionMap,
    }
  }

  // Deep-merge per-file overrides so layers accumulate
  if (global?.overrides || local?.overrides || overrides?.overrides) {
    merged.overrides = {
      ...global?.overrides,
      ...local?.overrides,
      ...overrides?.overrides,
    }
  }

  // Reset invalid config values to defaults (catches malformed config files)
  if (typeof merged.outputDir !== 'string') merged.outputDir = defaults.outputDir
  if (typeof merged.manifestFile !== 'string') merged.manifestFile = defaults.manifestFile
  if (typeof merged.useManifest !== 'boolean') merged.useManifest = defaults.useManifest
  if (typeof merged.sameFolder !== 'boolean') merged.sameFolder = defaults.sameFolder
  if (!Array.isArray(merged.defaultFormats) || merged.defaultFormats.length === 0)
    merged.defaultFormats = defaults.defaultFormats
  if (typeof merged.defaultTheme !== 'string') merged.defaultTheme = defaults.defaultTheme
  if (typeof merged.outputPrefix !== 'string') merged.outputPrefix = defaults.outputPrefix
  if (typeof merged.outputSuffix !== 'string') merged.outputSuffix = defaults.outputSuffix
  if (merged.extensionMap && typeof merged.extensionMap !== 'object')
    merged.extensionMap = defaults.extensionMap
  if (merged.inputDirs !== undefined && !Array.isArray(merged.inputDirs))
    merged.inputDirs = undefined

  // Validate each format in defaultFormats
  const validFormats: OutputFormat[] = ['svg', 'png', 'jpeg', 'webp', 'avif']
  merged.defaultFormats = merged.defaultFormats.filter((f: string) =>
    validFormats.includes(f as OutputFormat),
  )
  if (merged.defaultFormats.length === 0) merged.defaultFormats = defaults.defaultFormats

  return merged
}

/* ── Per-file overrides ── */

/**
 * Resolve per-file overrides for a given file path.
 * Matches against config.overrides keys: exact filename match first, then glob-like patterns.
 */
export function getFileOverrides(
  filePath: string,
  config?: Partial<DiagramkitConfig>,
  rootDir?: string,
): FileOverride | undefined {
  const overrides = config?.overrides
  if (!overrides) return undefined

  const { basename } = require('node:path') as typeof import('node:path')
  const name = basename(filePath)
  const relPath = rootDir ? relative(rootDir, filePath) : filePath

  // Exact filename match (highest priority)
  if (overrides[name]) return overrides[name]

  // Relative path match
  if (overrides[relPath]) return overrides[relPath]

  // Simple glob patterns: "docs/*.mermaid" or "**/*.excalidraw"
  for (const [pattern, override] of Object.entries(overrides)) {
    if (!pattern.includes('*')) continue
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/\./g, '\\.')
          .replace(/\*\*/g, '{{GLOBSTAR}}')
          .replace(/\*/g, '[^/]*')
          .replace(/\{\{GLOBSTAR\}\}/g, '.*') +
        '$',
    )
    if (regex.test(relPath) || regex.test(name)) return override
  }

  return undefined
}
