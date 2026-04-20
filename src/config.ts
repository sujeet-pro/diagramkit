import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, relative } from 'node:path'
import {
  DiagramkitError,
  type DiagramkitConfig,
  type FileOverride,
  type MermaidLayoutMode,
  type MermaidLayoutOptions,
  type OutputFormat,
  type Theme,
} from './types'

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
    mermaidLayout: getDefaultMermaidLayout(),
  }
}

/** Resolved mermaid layout defaults. Exported for use by the renderer pipeline. */
export function getDefaultMermaidLayout(): Required<MermaidLayoutOptions> {
  return {
    mode: 'warn',
    targetAspectRatio: 4 / 3,
    tolerance: 2.5,
  }
}

const VALID_MERMAID_LAYOUT_MODES: readonly MermaidLayoutMode[] = [
  'off',
  'warn',
  'flip',
  'elk',
  'auto',
]

/**
 * Validate and resolve a partial MermaidLayoutOptions against the defaults.
 * Invalid values fall back to defaults with a warning (or throw under strict mode).
 */
export function resolveMermaidLayout(
  input: MermaidLayoutOptions | undefined,
  runtime: ConfigLoadRuntime = {},
): Required<MermaidLayoutOptions> {
  const defaults = getDefaultMermaidLayout()
  if (!input || typeof input !== 'object') return defaults

  const resolved: Required<MermaidLayoutOptions> = { ...defaults }

  if (input.mode !== undefined) {
    if (typeof input.mode === 'string' && VALID_MERMAID_LAYOUT_MODES.includes(input.mode)) {
      resolved.mode = input.mode
    } else {
      warnOrThrow(
        `Warning: invalid mermaidLayout.mode "${String(input.mode)}". ` +
          `Expected one of ${VALID_MERMAID_LAYOUT_MODES.join(', ')}. Using default "${defaults.mode}".`,
        runtime,
      )
    }
  }

  if (input.targetAspectRatio !== undefined) {
    if (
      typeof input.targetAspectRatio === 'number' &&
      input.targetAspectRatio > 0 &&
      Number.isFinite(input.targetAspectRatio)
    ) {
      resolved.targetAspectRatio = input.targetAspectRatio
    } else {
      warnOrThrow(
        `Warning: invalid mermaidLayout.targetAspectRatio (${String(input.targetAspectRatio)}). ` +
          `Must be a positive number. Using default ${defaults.targetAspectRatio}.`,
        runtime,
      )
    }
  }

  if (input.tolerance !== undefined) {
    if (
      typeof input.tolerance === 'number' &&
      input.tolerance > 1 &&
      Number.isFinite(input.tolerance)
    ) {
      resolved.tolerance = input.tolerance
    } else {
      warnOrThrow(
        `Warning: invalid mermaidLayout.tolerance (${String(input.tolerance)}). ` +
          `Must be a number greater than 1. Using default ${defaults.tolerance}.`,
        runtime,
      )
    }
  }

  return resolved
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

type ConfigLoadRuntime = {
  strict?: boolean
  warn?: (message: string) => void
}

function warnOrThrow(
  message: string,
  runtime: ConfigLoadRuntime,
  code: 'CONFIG_INVALID' = 'CONFIG_INVALID',
): never | void {
  if (runtime.strict) {
    throw new DiagramkitError(code, message)
  }
  ;(runtime.warn ?? console.warn)(message)
}

function loadGlobalConfig(runtime: ConfigLoadRuntime): Partial<DiagramkitConfig> | null {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      warnOrThrow(`Warning: failed to parse global config ${path}: ${msg}. Skipping.`, runtime)
      continue
    }
  }
  return null
}

/* ── Local config (walks up to filesystem root) ── */

function loadLocalConfig(
  dir: string,
  runtime: ConfigLoadRuntime,
): Partial<DiagramkitConfig> | null {
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        warnOrThrow(`Warning: failed to parse config ${path}: ${msg}. Skipping file.`, runtime)
        continue
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
    const validFmts: OutputFormat[] = ['svg', 'png', 'jpeg', 'webp', 'avif']
    const formats = process.env.DIAGRAMKIT_FORMAT.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((f) => validFmts.includes(f as OutputFormat)) as OutputFormat[]
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

function migrateRawConfig(raw: unknown): Partial<DiagramkitConfig> {
  if (!raw || typeof raw !== 'object') return {}
  const obj = raw as Record<string, unknown>

  // Strip editor-only metadata: $schema is for IDE autocomplete (see
  // schemas/diagramkit-config.v1.json) and is not part of DiagramkitConfig.
  if ('$schema' in obj) delete obj.$schema

  // Migrate old defaultFormat (string) → defaultFormats (array)
  if ('defaultFormat' in obj && !('defaultFormats' in obj)) {
    obj.defaultFormats = [obj.defaultFormat]
  }
  delete obj.defaultFormat

  // Migrate old outputDir '.diagrams' → '.diagramkit'
  if (obj.outputDir === '.diagrams') {
    obj.outputDir = '.diagramkit'
  }

  // Migrate old manifestFile 'diagrams.manifest.json' → 'manifest.json'
  if (obj.manifestFile === 'diagrams.manifest.json') {
    obj.manifestFile = 'manifest.json'
  }

  return obj as Partial<DiagramkitConfig>
}

/* ── Explicit config file ── */

function loadExplicitConfig(
  configPath: string,
  runtime: ConfigLoadRuntime,
): Partial<DiagramkitConfig> | null {
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
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.startsWith('Config file not found')) throw err
    const message = err instanceof Error ? err.message : String(err)
    warnOrThrow(`Failed to load config file: ${configPath} — ${message}`, runtime)
    return null
  }
}

/* ── Merged config: defaults → global → env → local → overrides ── */

export function loadConfig(
  overrides?: Partial<DiagramkitConfig>,
  dir?: string,
  configFile?: string,
  options: ConfigLoadRuntime = {},
): DiagramkitConfig {
  const runtime: ConfigLoadRuntime = {
    strict: options.strict ?? false,
    warn: options.warn ?? console.warn,
  }
  const defaults = getDefaultConfig()
  const global = loadGlobalConfig(runtime)
  const env = loadEnvConfig()
  // Explicit config file takes priority over auto-discovered local config
  const local = configFile
    ? loadExplicitConfig(configFile, runtime)
    : dir
      ? loadLocalConfig(dir, runtime)
      : null

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

  // Deep-merge mermaidLayout so a partial override (just `mode`) keeps the other defaults.
  // Also validates each layer so malformed entries fall back to defaults.
  merged.mermaidLayout = resolveMermaidLayout(
    {
      ...defaults.mermaidLayout,
      ...global?.mermaidLayout,
      ...env.mermaidLayout,
      ...local?.mermaidLayout,
      ...overrides?.mermaidLayout,
    },
    runtime,
  )

  // Reset invalid config values to defaults (catches malformed config files)
  if (typeof merged.outputDir !== 'string') {
    warnOrThrow(
      `Warning: invalid config value for outputDir (${String(merged.outputDir)}). Using default "${defaults.outputDir}".`,
      runtime,
    )
    merged.outputDir = defaults.outputDir
  }
  if (typeof merged.manifestFile !== 'string') {
    warnOrThrow(
      `Warning: invalid config value for manifestFile (${String(merged.manifestFile)}). Using default "${defaults.manifestFile}".`,
      runtime,
    )
    merged.manifestFile = defaults.manifestFile
  }

  // Reject path traversal early — outputDir, manifestFile, outputPrefix, outputSuffix must be safe
  const pathTraversalRe = /(?:^|[\\/])\.\.(?:[\\/]|$)/
  const pathSepRe = /[\\/]/
  if (pathTraversalRe.test(merged.outputDir)) {
    warnOrThrow(
      `Warning: outputDir "${merged.outputDir}" contains path traversal. Using default "${defaults.outputDir}".`,
      runtime,
    )
    merged.outputDir = defaults.outputDir
  }
  if (pathTraversalRe.test(merged.manifestFile) || pathSepRe.test(merged.manifestFile)) {
    warnOrThrow(
      `Warning: manifestFile "${merged.manifestFile}" is invalid. Using default "${defaults.manifestFile}".`,
      runtime,
    )
    merged.manifestFile = defaults.manifestFile
  }
  if (pathSepRe.test(merged.outputPrefix)) {
    warnOrThrow(
      `Warning: outputPrefix "${merged.outputPrefix}" cannot contain path separators. Using default "${defaults.outputPrefix}".`,
      runtime,
    )
    merged.outputPrefix = defaults.outputPrefix
  }
  if (pathSepRe.test(merged.outputSuffix)) {
    warnOrThrow(
      `Warning: outputSuffix "${merged.outputSuffix}" cannot contain path separators. Using default "${defaults.outputSuffix}".`,
      runtime,
    )
    merged.outputSuffix = defaults.outputSuffix
  }
  if (typeof merged.useManifest !== 'boolean') {
    warnOrThrow(
      `Warning: invalid config value for useManifest (${String(merged.useManifest)}). Using default ${String(defaults.useManifest)}.`,
      runtime,
    )
    merged.useManifest = defaults.useManifest
  }
  if (typeof merged.sameFolder !== 'boolean') {
    warnOrThrow(
      `Warning: invalid config value for sameFolder (${String(merged.sameFolder)}). Using default ${String(defaults.sameFolder)}.`,
      runtime,
    )
    merged.sameFolder = defaults.sameFolder
  }
  if (!Array.isArray(merged.defaultFormats) || merged.defaultFormats.length === 0) {
    warnOrThrow('Warning: invalid config value for defaultFormats. Using default ["svg"].', runtime)
    merged.defaultFormats = defaults.defaultFormats
  }
  if (typeof merged.defaultTheme !== 'string') {
    warnOrThrow(
      `Warning: invalid config value for defaultTheme (${String(merged.defaultTheme)}). Using default "${defaults.defaultTheme}".`,
      runtime,
    )
    merged.defaultTheme = defaults.defaultTheme
  }
  const validThemes: Theme[] = ['light', 'dark', 'both']
  if (!validThemes.includes(merged.defaultTheme as Theme)) {
    warnOrThrow(
      `Warning: invalid config value for defaultTheme (${String(merged.defaultTheme)}). Using default "${defaults.defaultTheme}".`,
      runtime,
    )
    merged.defaultTheme = defaults.defaultTheme
  }
  if (typeof merged.outputPrefix !== 'string') {
    warnOrThrow(
      `Warning: invalid config value for outputPrefix (${String(merged.outputPrefix)}). Using default "${defaults.outputPrefix}".`,
      runtime,
    )
    merged.outputPrefix = defaults.outputPrefix
  }
  if (typeof merged.outputSuffix !== 'string') {
    warnOrThrow(
      `Warning: invalid config value for outputSuffix (${String(merged.outputSuffix)}). Using default "${defaults.outputSuffix}".`,
      runtime,
    )
    merged.outputSuffix = defaults.outputSuffix
  }
  if (merged.extensionMap && typeof merged.extensionMap !== 'object') {
    warnOrThrow(
      'Warning: invalid config value for extensionMap. Ignoring custom extension map.',
      runtime,
    )
    merged.extensionMap = defaults.extensionMap
  }
  if (merged.inputDirs !== undefined && !Array.isArray(merged.inputDirs)) {
    warnOrThrow('Warning: invalid config value for inputDirs. Ignoring inputDirs.', runtime)
    merged.inputDirs = undefined
  }

  // Validate each format in defaultFormats
  const validFormats: OutputFormat[] = ['svg', 'png', 'jpeg', 'webp', 'avif']
  merged.defaultFormats = merged.defaultFormats.filter((f: string) =>
    validFormats.includes(f as OutputFormat),
  )
  if (merged.defaultFormats.length === 0) {
    warnOrThrow('Warning: no valid formats in defaultFormats. Using default ["svg"].', runtime)
    merged.defaultFormats = defaults.defaultFormats
  }

  return merged
}

/* ── Per-file overrides ── */

function normalizeOverridePath(path: string): string {
  return path.replace(/\\/g, '/')
}

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

  const normalizedFilePath = normalizeOverridePath(filePath)
  const name = basename(normalizedFilePath)
  const rawRelPath = rootDir ? relative(rootDir, filePath) : filePath
  const relPath = rootDir
    ? normalizeOverridePath(relative(normalizeOverridePath(rootDir), normalizedFilePath))
    : normalizedFilePath

  // Exact filename match (highest priority)
  if (overrides[name]) return overrides[name]

  // Relative path match
  if (overrides[rawRelPath]) return overrides[rawRelPath]
  if (overrides[relPath]) return overrides[relPath]

  // Simple glob patterns: "docs/*.mermaid" or "**/*.excalidraw"
  for (const [pattern, override] of Object.entries(overrides)) {
    if (!pattern.includes('*')) continue
    const normalizedPattern = normalizeOverridePath(pattern)
    // Escape all regex metacharacters except * (which we handle as glob)
    const regex = new RegExp(
      '^' +
        normalizedPattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*/g, '{{GLOBSTAR}}')
          .replace(/\*/g, '[^/]*')
          .replace(/\{\{GLOBSTAR\}\}/g, '.*') +
        '$',
    )
    if (regex.test(relPath) || regex.test(name)) return override
  }

  return undefined
}
