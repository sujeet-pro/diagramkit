#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { DiagramType, DiagramkitConfig, OutputFormat, Theme } from '../src/types'

const args = process.argv.slice(2)

/* ── Help ── */

function printHelp() {
  console.log(`
diagramkit — Render .mermaid, .excalidraw, .drawio, and Graphviz .dot/.gv files to SVG/PNG/JPEG/WebP/AVIF

Usage:
  diagramkit render <file-or-dir> [options]
  diagramkit <file-or-dir> [options]        Alias for "diagramkit render"
  diagramkit warmup
  diagramkit doctor
  diagramkit init [--ts] [--yes]
  diagramkit --install-skill
  diagramkit --version
  diagramkit --help
  diagramkit --agent-help

Commands:
  render <file-or-dir>     Render diagram file(s) to images
  warmup                   Pre-install Playwright chromium browser
  doctor                   Validate runtime dependencies and environment
  init [--ts] [--yes]      Create config file (interactive by default, --yes for defaults)

Render options:
  --format <formats>                  Output formats, comma-separated (default: svg)
                                      e.g. --format svg,png or --format png,webp,avif
  --theme <light|dark|both>           Theme variants (default: both)
  --scale <number>                    Scale factor for raster output (default: 2)
  --quality <number>                  JPEG/WebP/AVIF quality 1-100 (default: 90)
  --force                             Re-render all, ignore manifest
  --watch                             Watch for changes and re-render
  --no-contrast                       Disable dark SVG contrast optimization
  --type <mermaid|excalidraw|drawio|graphviz> Filter to specific diagram type
  --output <dir>                      Custom output directory (all outputs go here)
  --dry-run                           Show what would be rendered without rendering
  --plan                              Show stale plan with reasons (directory mode)

Configuration options:
  --config <path>                     Path to config file (skip auto-discovery)
                                      Auto-discovery order: diagramkit.config.ts, diagramkit.config.json5, .diagramkitrc.json (walk up directories)
  --output-dir <name>                 Output folder name (default: .diagramkit)
  --manifest-file <name>              Manifest filename (default: manifest.json)
  --no-manifest                       Disable manifest tracking
  --same-folder                       Output in same folder as source files
  --output-prefix <string>             Prefix for output filenames (default: '')
  --output-suffix <string>             Suffix for output filenames (default: '')
  --strict-config                     Fail on config warnings/invalid values
  --max-type-lanes <1-4>              Max concurrent engine lanes (default: 4)
  --log-level <level>                 Logging verbosity: silent,error,warn,info,verbose

Output options:
  --quiet                             Suppress informational output, only show errors
  --json                              Output results as JSON (for CI/scripting)

General:
  -h, --help                          Show this help
  -v, --version                       Show version
  -y, --yes                           Accept defaults for interactive commands
  --agent-help                        Output full reference for LLM agents
  --install-skill                     Install project skills for Claude and Cursor

Examples:
  diagramkit render .                                  # Render all in cwd
  diagramkit render flow.mermaid                       # Single file
  diagramkit render arch.drawio --format png           # Draw.io to PNG
  diagramkit render graph.dot --theme dark             # Graphviz DOT to dark SVG
  diagramkit render . --format svg,png                 # SVG + PNG for all diagrams
  diagramkit render ./docs --format webp --scale 3     # High-res WebPs
  diagramkit render . --watch                          # Watch mode
  diagramkit render . --output ./build/images          # All outputs to one folder
  diagramkit render . --same-folder --no-manifest      # Flat output
  diagramkit render . --config ./custom.config.json5   # Explicit config file
  diagramkit render . --dry-run                        # Preview what would render
  diagramkit render . --quiet                          # Minimal output
  diagramkit --install-skill                           # Install project skills
`)
}

/* ── Version ── */

function printVersion() {
  // Try both paths: ../package.json (source) and ../../package.json (dist/cli/)
  const candidates = [
    new URL('../package.json', import.meta.url),
    new URL('../../package.json', import.meta.url),
  ]
  for (const url of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(fileURLToPath(url), 'utf-8'))
      if (pkg.name === 'diagramkit') {
        console.log(`diagramkit v${pkg.version}`)
        return
      }
    } catch {}
  }
  console.log('diagramkit (unknown version)')
}

/* ── Agent help ── */

function printAgentHelp() {
  // Resolve llms-full.txt from the package root (works from both source and dist)
  const candidates = [
    new URL('../llms-full.txt', import.meta.url),
    new URL('../../llms-full.txt', import.meta.url),
  ]
  for (const url of candidates) {
    try {
      const content = readFileSync(fileURLToPath(url), 'utf-8')
      if (content.includes('diagramkit')) {
        console.log(content)
        return
      }
    } catch {}
  }
  console.error('Could not locate llms-full.txt. Try running from the package directory.')
  process.exit(1)
}

/* ── Arg parsing ── */

// Explicit short-flag mappings — avoids collisions between flags starting with same letter
const SHORT_FLAGS: Record<string, string> = {
  h: 'help',
  v: 'version',
  y: 'yes',
  f: 'force',
  w: 'watch',
}

export function getFlag(name: string, argv: string[] = args): boolean {
  if (argv.includes(`--${name}`)) return true
  for (const [short, long] of Object.entries(SHORT_FLAGS)) {
    if (long === name && argv.includes(`-${short}`)) return true
  }
  return false
}

// Flags that accept a value — used to detect missing values vs. next-flag collisions
const FLAGS_REQUIRING_VALUE = new Set([
  'format',
  'theme',
  'scale',
  'quality',
  'type',
  'output',
  'config',
  'output-dir',
  'manifest-file',
  'output-prefix',
  'output-suffix',
  'max-type-lanes',
  'log-level',
])

export function getFlagValue(
  name: string,
  argv: string[] = args,
  exitOnError = true,
): string | undefined {
  const idx = argv.indexOf(`--${name}`)
  if (idx !== -1 && idx + 1 < argv.length) {
    const value = argv[idx + 1]!
    // Reject if the next token looks like a flag (starts with -)
    if (value.startsWith('-')) {
      const message = `Missing value for --${name}`
      if (exitOnError) {
        console.error(message)
        process.exit(1)
      }
      throw new Error(message)
    }
    return value
  }
  return undefined
}

/* ── Validation ── */

const VALID_FORMATS = ['svg', 'png', 'jpeg', 'jpg', 'webp', 'avif'] as const
const VALID_THEMES = ['light', 'dark', 'both'] as const
const VALID_TYPES = ['mermaid', 'excalidraw', 'drawio', 'graphviz'] as const
const VALID_LOG_LEVELS = [
  'silent',
  'error',
  'errors',
  'warn',
  'warning',
  'warnings',
  'info',
  'log',
  'verbose',
] as const

/** Normalize format name (e.g. 'jpg' → 'jpeg') */
function normalizeFormat(f: string): OutputFormat {
  if (f === 'jpg') return 'jpeg'
  return f as OutputFormat
}

export function validateEnum<T extends string>(
  value: string,
  valid: readonly T[],
  label: string,
  exitOnError = true,
): T {
  if (!valid.includes(value as T)) {
    const message = `Invalid ${label}: "${value}". Must be one of: ${valid.join(', ')}`
    if (exitOnError) {
      console.error(message)
      process.exit(1)
    }
    throw new Error(message)
  }
  return value as T
}

export function validatePositiveNumber(value: string, label: string, exitOnError = true): number {
  const num = parseFloat(value)
  if (isNaN(num) || num <= 0) {
    const message = `Invalid ${label}: "${value}". Must be a positive number.`
    if (exitOnError) {
      console.error(message)
      process.exit(1)
    }
    throw new Error(message)
  }
  return num
}

export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const dp = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))
  for (let i = 0; i < rows; i++) dp[i]![0] = i
  for (let j = 0; j < cols; j++) dp[0]![j] = j
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost)
    }
  }
  return dp[rows - 1]![cols - 1]!
}

function suggestClosest(value: string, candidates: string[]): string | undefined {
  let best: { candidate: string; distance: number } | null = null
  for (const candidate of candidates) {
    const distance = levenshteinDistance(value, candidate)
    if (!best || distance < best.distance) {
      best = { candidate, distance }
    }
  }
  if (!best || best.distance > 3) return undefined
  return best.candidate
}

/** Parse comma-separated formats, normalize (e.g. jpg → jpeg), and drop invalid entries with a warning. */
export function parseFormats(raw: string, exitOnError = true): OutputFormat[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    const message = '--format requires at least one format'
    if (exitOnError) {
      console.error(message)
      process.exit(1)
    }
    throw new Error(message)
  }
  const valid: OutputFormat[] = []
  const dropped: string[] = []
  for (const f of parts) {
    if (!VALID_FORMATS.includes(f as (typeof VALID_FORMATS)[number])) {
      dropped.push(f)
      continue
    }
    valid.push(normalizeFormat(f))
  }
  if (dropped.length > 0) {
    console.warn(`Warning: dropped unsupported format(s): ${dropped.join(', ')}`)
  }
  if (valid.length === 0) {
    const message = '--format did not include any valid formats'
    if (exitOnError) {
      console.error(message)
      process.exit(1)
    }
    throw new Error(message)
  }
  return valid
}

/* ── Unknown flag detection ── */

export function warnUnknownFlags(argv: string[] = args) {
  const knownFlags = new Set([
    'format',
    'theme',
    'scale',
    'quality',
    'force',
    'watch',
    'no-contrast',
    'type',
    'output',
    'dry-run',
    'plan',
    'quiet',
    'json',
    'config',
    'output-dir',
    'manifest-file',
    'no-manifest',
    'same-folder',
    'output-prefix',
    'output-suffix',
    'strict-config',
    'max-type-lanes',
    'log-level',
    'help',
    'version',
    'yes',
    'agent-help',
    'install-skill',
    'ts',
  ])
  const knownShortFlags = new Set(Object.keys(SHORT_FLAGS))

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      if (!knownFlags.has(name)) {
        const suggestion = suggestClosest(name, [...knownFlags])
        const hint = suggestion ? ` (did you mean --${suggestion}?)` : ''
        console.warn(`Warning: unknown flag "${arg}"${hint}`)
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const short = arg.slice(1)
      if (!knownShortFlags.has(short)) {
        const suggestion = suggestClosest(short, [...knownShortFlags])
        const hint = suggestion ? ` (did you mean -${suggestion}?)` : ''
        console.warn(`Warning: unknown flag "${arg}"${hint}`)
      }
    }
  }
}

/* ── Commands ── */

async function commandWarmup() {
  console.log('Installing Playwright chromium...')
  try {
    // Use playwright's own install mechanism rather than npx for reliability in global installs
    const playwrightPath = fileURLToPath(import.meta.resolve('playwright/cli'))
    const { execFileSync } = await import('node:child_process')
    execFileSync(process.execPath, [playwrightPath, 'install', 'chromium'], { stdio: 'inherit' })
  } catch {
    // Fallback to npx if direct resolution fails — execFileSync avoids shell injection
    const { execFileSync } = await import('node:child_process')
    execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' })
  }
  console.log('Done.')
}

/** Check if Playwright chromium browser is installed. Returns false if not needed (graphviz-only). */
async function ensurePlaywrightBrowser(needsBrowser: boolean): Promise<void> {
  if (!needsBrowser) return
  try {
    const { chromium } = await import('playwright')
    const execPath = chromium.executablePath()
    if (!existsSync(execPath)) {
      console.error(
        'Chromium browser not found. Run "diagramkit warmup" to install it.\n' +
          '  Expected: ' +
          execPath,
      )
      process.exit(1)
    }
  } catch {
    console.error(
      'Playwright is not installed. Run "npm install playwright" then "diagramkit warmup".',
    )
    process.exit(1)
  }
}

/** Returns true if the diagram type requires a browser (all except graphviz). */
function typeNeedsBrowser(type: import('../src/types').DiagramType): boolean {
  return type !== 'graphviz'
}

async function commandInit() {
  const useYes = getFlag('yes')
  const useTs = getFlag('ts')
  const { writeFileSync } = await import('node:fs')
  const { basename } = await import('node:path')
  const { getDefaultConfig } = await import('../src/config')
  const { getDiagramType, getExtensionMap } = await import('../src/extensions')
  const { findDiagramFiles } = await import('../src/discovery')
  const defaults = getDefaultConfig()
  const defaultConfigPath = resolve(useTs ? 'diagramkit.config.ts' : 'diagramkit.config.json5')
  const legacyPath = resolve('.diagramkitrc.json')
  if (existsSync(legacyPath)) {
    console.log('.diagramkitrc.json exists. Consider migrating to diagramkit.config.json5.')
    return
  }

  const toMinimalConfig = (cfg: DiagramkitConfig): Partial<DiagramkitConfig> => {
    const out: Partial<DiagramkitConfig> = {}
    if (cfg.outputDir !== defaults.outputDir) out.outputDir = cfg.outputDir
    if (cfg.defaultTheme !== defaults.defaultTheme) out.defaultTheme = cfg.defaultTheme
    if (cfg.defaultFormats.join(',') !== defaults.defaultFormats.join(',')) {
      out.defaultFormats = cfg.defaultFormats
    }
    return out
  }

  const toTsConfig = (
    cfg: Partial<DiagramkitConfig>,
  ): string => `import { defineConfig } from 'diagramkit'

export default defineConfig(${JSON.stringify(cfg, null, 2)})
`

  const toJson5Config = (cfg: Partial<DiagramkitConfig>): string => `{
  // diagramkit configuration
  // Docs: https://projects.sujeet.pro/diagramkit/guide/configuration
${Object.entries(cfg)
  .map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`)
  .join('\n')}
}
`

  const writeConfig = (cfg: DiagramkitConfig): void => {
    if (existsSync(defaultConfigPath)) {
      console.log(`${basename(defaultConfigPath)} already exists.`)
      return
    }
    const minimal = toMinimalConfig(cfg)
    const content = useTs ? toTsConfig(minimal) : toJson5Config(minimal)
    writeFileSync(defaultConfigPath, content)
    console.log(`Created ${basename(defaultConfigPath)}`)
  }

  if (useYes || !process.stdin.isTTY || !process.stdout.isTTY) {
    writeConfig(defaults)
    return
  }

  const typeOrder: DiagramType[] = ['mermaid', 'excalidraw', 'drawio', 'graphviz']
  const detectedTypes = new Set<DiagramType>()
  const extensionMap = getExtensionMap()
  for (const file of findDiagramFiles(process.cwd())) {
    const type = getDiagramType(basename(file.path), extensionMap)
    if (type) detectedTypes.add(type)
  }
  const initialTypeSelection = (
    detectedTypes.size > 0 ? [...detectedTypes] : typeOrder
  ) as DiagramType[]

  const { intro, outro, multiselect, select, text, confirm, cancel, isCancel, note } =
    await import('@clack/prompts')

  intro('diagramkit init')
  note(`Detected types: ${initialTypeSelection.join(', ')}`, 'Project scan')
  const selectedTypes = await multiselect({
    message: 'Which diagram types does this project use?',
    options: typeOrder.map((type) => ({ value: type, label: type })),
    initialValues: initialTypeSelection,
    required: false,
  })
  if (isCancel(selectedTypes)) {
    cancel('Aborted.')
    return
  }

  const formatChoice = await select({
    message: 'Preferred output format?',
    options: [
      { value: 'svg', label: 'SVG (default)' },
      { value: 'png', label: 'PNG' },
      { value: 'svg,png', label: 'SVG + PNG' },
    ],
    initialValue: 'svg',
  })
  if (isCancel(formatChoice)) {
    cancel('Aborted.')
    return
  }

  const themeChoice = await select({
    message: 'Preferred theme output?',
    options: [
      { value: 'both', label: 'Both (light + dark)' },
      { value: 'light', label: 'Light only' },
      { value: 'dark', label: 'Dark only' },
    ],
    initialValue: 'both',
  })
  if (isCancel(themeChoice)) {
    cancel('Aborted.')
    return
  }

  const outputChoice = await select({
    message: 'Output directory?',
    options: [
      { value: '.diagramkit', label: '.diagramkit (default)' },
      { value: 'images', label: 'images/' },
      { value: '__custom__', label: 'Custom path...' },
    ],
    initialValue: '.diagramkit',
  })
  if (isCancel(outputChoice)) {
    cancel('Aborted.')
    return
  }

  let outputDir = outputChoice as string
  if (outputDir === '__custom__') {
    const custom = await text({
      message: 'Enter output directory',
      placeholder: '.diagramkit',
      defaultValue: '.diagramkit',
    })
    if (isCancel(custom)) {
      cancel('Aborted.')
      return
    }
    outputDir = String(custom).trim() || '.diagramkit'
  }

  const useTsChoice = await select({
    message: 'Config file format?',
    options: [
      { value: 'json5', label: 'JSON5' },
      { value: 'ts', label: 'TypeScript' },
    ],
    initialValue: useTs ? 'ts' : 'json5',
  })
  if (isCancel(useTsChoice)) {
    cancel('Aborted.')
    return
  }

  const finalUseTs = useTsChoice === 'ts'
  const generatedConfig: DiagramkitConfig = {
    ...defaults,
    defaultFormats: parseFormats(String(formatChoice)),
    defaultTheme: validateEnum(String(themeChoice), VALID_THEMES, 'theme'),
    outputDir,
  }
  const previewContent = finalUseTs
    ? toTsConfig(toMinimalConfig(generatedConfig))
    : toJson5Config(toMinimalConfig(generatedConfig))

  note(
    previewContent,
    `Preview (${finalUseTs ? 'diagramkit.config.ts' : 'diagramkit.config.json5'})`,
  )
  note(`Selected types: ${(selectedTypes as string[]).join(', ') || '(none)'}`, 'Type selection')
  const shouldWrite = await confirm({ message: 'Write this config file?' })
  if (isCancel(shouldWrite) || !shouldWrite) {
    cancel('Aborted.')
    return
  }

  const finalPath = resolve(finalUseTs ? 'diagramkit.config.ts' : 'diagramkit.config.json5')
  if (existsSync(finalPath)) {
    console.log(`${basename(finalPath)} already exists.`)
    return
  }
  writeFileSync(finalPath, previewContent)
  outro(`Created ${basename(finalPath)}`)
}

async function commandInstallSkill() {
  const { mkdirSync } = await import('node:fs')
  const { DIAGRAMKIT_PROJECT_SKILL_FILES, getDiagramkitSkillContent } =
    await import('../src/agent-skill')
  const { atomicWrite } = await import('../src/output')

  const created: string[] = []
  const skipped: string[] = []
  const content = Buffer.from(getDiagramkitSkillContent(), 'utf-8')

  for (const relativePath of DIAGRAMKIT_PROJECT_SKILL_FILES) {
    const targetPath = resolve(relativePath)
    if (existsSync(targetPath)) {
      skipped.push(relativePath)
      continue
    }

    mkdirSync(dirname(targetPath), { recursive: true })
    atomicWrite(targetPath, content)
    created.push(relativePath)
  }

  if (created.length > 0) {
    console.log('Installed diagramkit project skills:')
    for (const file of created) {
      console.log(`  - ${file}`)
    }
  } else {
    console.log('No new diagramkit project skills were installed.')
  }

  if (skipped.length > 0) {
    console.log('Skipped existing files:')
    for (const file of skipped) {
      console.log(`  - ${file}`)
    }
  }

  console.log('Next steps:')
  console.log('  - Read node_modules/diagramkit/llms.txt for repo setup guidance')
  console.log('  - Add "render:diagrams": "diagramkit render ." to package.json')
  console.log('  - Run "npx diagramkit warmup" unless the repo is Graphviz-only')
}

function emitJson(payload: unknown): void {
  console.log(JSON.stringify(payload))
}

function buildRenderJsonEnvelope(input: {
  targetPath: string
  kind: 'file' | 'directory'
  dryRun: boolean
  plan: boolean
  options: Record<string, unknown>
  result?: unknown
  summary?: Record<string, unknown>
}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    command: 'render',
    target: {
      kind: input.kind,
      path: input.targetPath,
    },
    phase: input.dryRun || input.plan ? 'dry-run' : 'execute',
    options: input.options,
    ...(input.result ? { result: input.result } : {}),
    ...(input.summary ? { summary: input.summary } : {}),
  }
}

async function commandDoctor(jsonOutput: boolean): Promise<void> {
  const { runDoctor } = await import('../src/doctor')
  const result = await runDoctor()
  if (jsonOutput) {
    emitJson(result)
  } else {
    console.log(`diagramkit doctor (v${result.diagramkitVersion})`)
    for (const check of result.checks) {
      console.log(`[${check.status}] ${check.id}: ${check.message}`)
    }
  }
  if (!result.ok) process.exitCode = 1
}

async function commandRender() {
  // Find the first positional argument after "render" by skipping flags and their values
  let target = '.'
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      if (FLAGS_REQUIRING_VALUE.has(name)) i++ // skip the value too
      continue
    }
    if (arg.startsWith('-')) continue
    target = arg
    break
  }
  warnUnknownFlags()

  // Validate flag values
  const rawFormat = getFlagValue('format')
  const rawTheme = getFlagValue('theme')

  const rawType = getFlagValue('type')
  const type = rawType ? validateEnum(rawType, VALID_TYPES, 'type') : undefined

  const rawScale = getFlagValue('scale')
  const scale = rawScale ? validatePositiveNumber(rawScale, 'scale') : 2
  if (rawScale && scale > 10) {
    console.error(`Invalid scale: "${rawScale}". Must be greater than 0 and at most 10.`)
    process.exit(1)
  }

  const rawQuality = getFlagValue('quality')
  const quality = rawQuality ? validatePositiveNumber(rawQuality, 'quality') : 90
  if (rawQuality && (quality < 1 || quality > 100)) {
    console.warn('Warning: --quality should be between 1 and 100. Value will be clamped.')
  }

  const force = getFlag('force')
  const watchMode = getFlag('watch')
  const noContrast = args.includes('--no-contrast')
  const dryRun = args.includes('--dry-run')
  const plan = args.includes('--plan')
  const quiet = args.includes('--quiet')
  const jsonOutput = args.includes('--json')
  const strictConfig = args.includes('--strict-config')
  const rawLogLevel = getFlagValue('log-level')
  const logLevel = rawLogLevel
    ? validateEnum(rawLogLevel, VALID_LOG_LEVELS, 'log-level')
    : ('info' as const)

  // Config overrides from CLI flags
  const outputDir = getFlagValue('output-dir')
  const manifestFile = getFlagValue('manifest-file')
  const noManifest = args.includes('--no-manifest')
  const sameFolder = args.includes('--same-folder')
  const customOutput = getFlagValue('output')
  const configFilePath = getFlagValue('config')
  const maxTypeLanesRaw = getFlagValue('max-type-lanes')
  const maxTypeLanes = maxTypeLanesRaw
    ? Math.max(1, Math.min(4, validatePositiveNumber(maxTypeLanesRaw, 'max-type-lanes')))
    : undefined

  const configOverrides: Partial<import('../src/types').DiagramkitConfig> = {}
  if (outputDir) configOverrides.outputDir = outputDir
  if (manifestFile) configOverrides.manifestFile = manifestFile
  if (noManifest) configOverrides.useManifest = false
  if (sameFolder) configOverrides.sameFolder = true
  const outputPrefix = getFlagValue('output-prefix')
  const outputSuffix = getFlagValue('output-suffix')
  if (outputPrefix !== undefined) configOverrides.outputPrefix = outputPrefix
  if (outputSuffix !== undefined) configOverrides.outputSuffix = outputSuffix

  const resolvedTarget = resolve(target)

  if (!existsSync(resolvedTarget)) {
    console.error(`Path does not exist: ${resolvedTarget}`)
    process.exit(1)
  }

  // Check if target is a single file
  const stat = statSync(resolvedTarget)
  const { loadConfig } = await import('../src/config')
  const configRoot = stat.isFile() ? dirname(resolvedTarget) : resolvedTarget
  const resolvedConfigFile = configFilePath ? resolve(configFilePath) : undefined
  const resolvedConfig = loadConfig(configOverrides, configRoot, resolvedConfigFile, {
    strict: strictConfig,
  })

  // Parse formats: comma-separated or from config defaults
  const formats: OutputFormat[] = rawFormat
    ? parseFormats(rawFormat)
    : resolvedConfig.defaultFormats
  const theme = validateEnum(rawTheme ?? resolvedConfig.defaultTheme, VALID_THEMES, 'theme')

  if (stat.isFile()) {
    await renderSingleFile({
      target: resolvedTarget,
      formats,
      theme,
      scale,
      quality,
      noContrast,
      dryRun,
      quiet,
      jsonOutput,
      customOutput,
      config: resolvedConfig,
      logLevel,
    })
  } else {
    await renderDirectory({
      target: resolvedTarget,
      formats,
      theme,
      scale,
      quality,
      force,
      type,
      noContrast,
      dryRun,
      quiet,
      jsonOutput,
      watchMode,
      plan,
      customOutput,
      config: resolvedConfig,
      configOverrides,
      configFile: resolvedConfigFile,
      maxTypeLanes,
      strictConfig,
      logLevel,
    })
  }
}

/* ── Single-file render ── */

interface SingleFileOpts {
  target: string
  formats: OutputFormat[]
  theme: Theme
  scale: number
  quality: number
  noContrast: boolean
  dryRun: boolean
  quiet: boolean
  jsonOutput: boolean
  customOutput: string | undefined
  config: import('../src/types').DiagramkitConfig
  logLevel: import('../src/types').LogLevel
}

async function renderSingleFile(opts: SingleFileOpts) {
  const { target, formats, config: resolvedConfig, customOutput, jsonOutput, quiet } = opts
  const { createLeveledLogger } = await import('../src/logging')
  const cliLogger = createLeveledLogger(opts.logLevel)

  if (opts.dryRun) {
    if (jsonOutput) {
      emitJson(
        buildRenderJsonEnvelope({
          targetPath: target,
          kind: 'file',
          dryRun: true,
          plan: false,
          options: {
            formats,
            theme: opts.theme,
            scale: opts.scale,
            quality: opts.quality,
          },
          result: { wouldRender: true },
        }),
      )
    } else {
      cliLogger.info(`Would render: ${target}`)
    }
    return
  }

  const { getDiagramType: getType } = await import('../src/extensions')
  const { basename: bn } = await import('node:path')
  const fileType = getType(bn(target), resolvedConfig.extensionMap)
  if (fileType && typeNeedsBrowser(fileType)) {
    await ensurePlaywrightBrowser(true)
  }

  const { renderDiagramFileToDisk } = await import('../src/renderer')
  const { dispose } = await import('../src/pool')
  try {
    const [
      path,
      { ensureDiagramsDir, updateManifest, readManifest },
      { stripDiagramExtension },
      { getMatchedExtension },
    ] = await Promise.all([
      import('node:path'),
      import('../src/manifest'),
      import('../src/output'),
      import('../src/extensions'),
    ])

    const name = stripDiagramExtension(path.basename(target), resolvedConfig.extensionMap)
    const ext = getMatchedExtension(path.basename(target), resolvedConfig.extensionMap) ?? ''
    const fileDir = path.dirname(target)
    const outDir = customOutput ? resolve(customOutput) : ensureDiagramsDir(fileDir, resolvedConfig)

    // Accumulate formats from manifest (unless custom output, which skips manifest)
    let effectiveFormats = formats
    if (!customOutput && resolvedConfig.useManifest) {
      const manifest = readManifest(fileDir, resolvedConfig)
      const entry = manifest.diagrams[path.basename(target)]
      if (entry?.formats) {
        effectiveFormats = [...new Set([...formats, ...entry.formats])]
      }
    }

    const diagramFile = { path: target, name, dir: fileDir, ext }
    const written = await renderDiagramFileToDisk(diagramFile, {
      formats: effectiveFormats,
      theme: opts.theme,
      scale: opts.scale,
      quality: opts.quality,
      contrastOptimize: !opts.noContrast,
      config: resolvedConfig,
      outDir,
    })

    if (!customOutput) {
      updateManifest(
        [{ ...diagramFile, _effectiveFormats: effectiveFormats }],
        formats,
        resolvedConfig,
        opts.theme,
      )
    }

    if (jsonOutput) {
      emitJson(
        buildRenderJsonEnvelope({
          targetPath: target,
          kind: 'file',
          dryRun: false,
          plan: false,
          options: {
            formats,
            theme: opts.theme,
            scale: opts.scale,
            quality: opts.quality,
          },
          result: {
            rendered: written.map((f) => path.join(outDir, f)),
            skipped: [],
            failed: [],
            failedDetails: [],
          },
        }),
      )
    } else if (!quiet) {
      for (const fileName of written) {
        cliLogger.info(`  Written: ${path.join(outDir, fileName)}`)
      }
    }
  } finally {
    await dispose()
  }
}

/* ── Directory render ── */

interface DirectoryOpts {
  target: string
  formats: OutputFormat[]
  theme: Theme
  scale: number
  quality: number
  force: boolean
  type: import('../src/types').DiagramType | undefined
  noContrast: boolean
  dryRun: boolean
  quiet: boolean
  jsonOutput: boolean
  watchMode: boolean
  plan: boolean
  customOutput: string | undefined
  config: import('../src/types').DiagramkitConfig
  configOverrides: Partial<import('../src/types').DiagramkitConfig>
  configFile?: string
  maxTypeLanes?: number
  strictConfig?: boolean
  logLevel: import('../src/types').LogLevel
}

async function renderDirectory(opts: DirectoryOpts) {
  const { target, formats, config: resolvedConfig, customOutput, jsonOutput, quiet } = opts

  if (opts.dryRun || opts.plan) {
    const { findDiagramFiles, filterByType: filterByTypeFn } = await import('../src/discovery')
    const { filterStaleFiles, planStaleFiles } = await import('../src/manifest')
    let files = findDiagramFiles(target, resolvedConfig)
    if (opts.type) files = filterByTypeFn(files, opts.type, resolvedConfig)
    const stale = filterStaleFiles(files, opts.force, formats, resolvedConfig, opts.theme)
    const stalePlan = planStaleFiles(files, opts.force, formats, resolvedConfig, opts.theme)

    if (jsonOutput) {
      emitJson(
        buildRenderJsonEnvelope({
          targetPath: target,
          kind: 'directory',
          dryRun: opts.dryRun,
          plan: opts.plan,
          options: {
            formats,
            theme: opts.theme,
            force: opts.force,
            type: opts.type,
          },
          result: {
            stale: stale.map((f) => f.path),
            stalePlan,
            total: files.length,
            upToDate: files.length - stale.length,
          },
        }),
      )
    } else {
      console.log(`Found ${files.length} diagram files, ${stale.length} need rendering:`)
      for (const f of stalePlan) {
        const reasons = f.reasons.map((r) => r.code).join(',')
        console.log(`  ${f.path} [${reasons}]`)
      }
    }
    return
  }

  const { findDiagramFiles, filterByType: filterByTypeFn } = await import('../src/discovery')
  const { filterStaleFiles } = await import('../src/manifest')
  const { getDiagramType: getType, getExtensionMap } = await import('../src/extensions')
  const extensionMap = getExtensionMap(resolvedConfig.extensionMap)
  let discoveredFiles = findDiagramFiles(target, resolvedConfig)
  if (opts.type) discoveredFiles = filterByTypeFn(discoveredFiles, opts.type, resolvedConfig)
  const staleFiles = filterStaleFiles(
    discoveredFiles,
    opts.force,
    formats,
    resolvedConfig,
    opts.theme,
  )
  const browserCheckFiles = opts.watchMode ? discoveredFiles : staleFiles
  const needsBrowser = browserCheckFiles.some((file) => {
    const detectedType = getType(basename(file.path), extensionMap)
    return detectedType ? typeNeedsBrowser(detectedType) : false
  })
  if (needsBrowser) {
    await ensurePlaywrightBrowser(true)
  }

  const noop = () => {}
  const logger =
    quiet || jsonOutput
      ? { log: noop, warn: quiet ? noop : console.warn, error: quiet ? noop : console.error }
      : undefined

  const { renderAll } = await import('../src/render-all')
  const { dispose } = await import('../src/pool')

  const dirConfig = customOutput
    ? { ...resolvedConfig, sameFolder: false, outputDir: customOutput, useManifest: false }
    : resolvedConfig

  let renderResult
  try {
    renderResult = await renderAll({
      dir: target,
      formats,
      theme: opts.theme,
      scale: opts.scale,
      quality: opts.quality,
      force: opts.force,
      type: opts.type,
      contrastOptimize: !opts.noContrast,
      config: dirConfig,
      logger,
      logLevel: opts.logLevel,
      progress: !quiet && !jsonOutput,
      maxConcurrentLanes: opts.maxTypeLanes,
      includeMetrics: true,
    })
  } finally {
    if (!opts.watchMode) {
      await dispose()
    }
  }

  if (jsonOutput && renderResult) {
    emitJson(
      buildRenderJsonEnvelope({
        targetPath: target,
        kind: 'directory',
        dryRun: false,
        plan: false,
        options: {
          formats,
          theme: opts.theme,
          scale: opts.scale,
          quality: opts.quality,
          force: opts.force,
          type: opts.type,
          maxTypeLanes: opts.maxTypeLanes ?? 4,
        },
        result: renderResult,
      }),
    )
  }

  if (renderResult && renderResult.failed.length > 0 && !opts.watchMode) {
    process.exitCode = 1
  }

  if (opts.watchMode) {
    const { watchDiagrams } = await import('../src/watch')
    const watchConfig = customOutput
      ? { ...opts.configOverrides, sameFolder: false, outputDir: customOutput, useManifest: false }
      : opts.configOverrides
    const cleanup = watchDiagrams({
      dir: target,
      config: watchConfig,
      configFile: opts.configFile,
      logger,
      logLevel: opts.logLevel,
      strictConfig: opts.strictConfig,
      renderOptions: {
        formats,
        theme: opts.theme,
        scale: opts.scale,
        quality: opts.quality,
        contrastOptimize: !opts.noContrast,
      },
      onChange: (file) => {
        if (!quiet) console.log(`  Re-rendered: ${file}`)
      },
    })

    const onSignal = () => {
      void cleanup()
        .then(() => dispose())
        .then(() => process.exit(0))
    }
    process.once('SIGINT', onSignal)
    process.once('SIGTERM', onSignal)
  }
}

/* ── Main ── */

async function main() {
  if (args.length === 0 || getFlag('help')) {
    printHelp()
    return
  }

  if (getFlag('version')) {
    printVersion()
    return
  }

  if (getFlag('agent-help')) {
    printAgentHelp()
    return
  }

  if (getFlag('install-skill')) {
    await commandInstallSkill()
    return
  }

  if (
    args.length > 0 &&
    !args[0]!.startsWith('-') &&
    !['render', 'warmup', 'doctor', 'init'].includes(args[0]!)
  ) {
    const maybePath = resolve(args[0]!)
    if (existsSync(maybePath)) {
      args.unshift('render')
    }
  }

  const command = args[0]

  if (command === 'warmup') {
    await commandWarmup()
    return
  }

  if (command === 'doctor') {
    await commandDoctor(getFlag('json'))
    return
  }

  if (command === 'init') {
    await commandInit()
    return
  }

  if (command === 'render') {
    await commandRender()
    return
  }

  console.error(`Unknown command: ${command}`)
  console.error('Run "diagramkit --help" for usage.')
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
