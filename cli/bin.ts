#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { OutputFormat } from '../src/types'

const args = process.argv.slice(2)

/* ── Help ── */

function printHelp() {
  console.log(`
diagramkit — Render .mermaid, .excalidraw, .drawio, and Graphviz .dot/.gv files to SVG/PNG/JPEG/WebP/AVIF

Usage:
  diagramkit render <file-or-dir> [options]
  diagramkit warmup
  diagramkit init [--ts]
  diagramkit --version
  diagramkit --help
  diagramkit --agent-help

Commands:
  render <file-or-dir>     Render diagram file(s) to images
  warmup                   Pre-install Playwright chromium browser
  init [--ts]              Create a diagramkit.config.json5 config file (--ts for TypeScript)

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

Configuration options:
  --config <path>                     Path to config file (skip auto-discovery)
  --output-dir <name>                 Output folder name (default: .diagramkit)
  --manifest-file <name>              Manifest filename (default: manifest.json)
  --no-manifest                       Disable manifest tracking
  --same-folder                       Output in same folder as source files

Output options:
  --quiet                             Suppress informational output, only show errors
  --json                              Output results as JSON (for CI/scripting)

General:
  -h, --help                          Show this help
  -v, --version                       Show version
  --agent-help                        Output full reference for LLM agents

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
const SHORT_FLAGS: Record<string, string> = { h: 'help', v: 'version', f: 'force', w: 'watch' }

function getFlag(name: string): boolean {
  if (args.includes(`--${name}`)) return true
  for (const [short, long] of Object.entries(SHORT_FLAGS)) {
    if (long === name && args.includes(`-${short}`)) return true
  }
  return false
}

function getFlagValue(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`)
  if (idx !== -1 && idx + 1 < args.length) {
    const value = args[idx + 1]!
    if (value.startsWith('--')) {
      console.error(`Missing value for --${name}`)
      process.exit(1)
    }
    return value
  }
  return undefined
}

/* ── Validation ── */

const VALID_FORMATS = ['svg', 'png', 'jpeg', 'jpg', 'webp', 'avif'] as const
const VALID_THEMES = ['light', 'dark', 'both'] as const
const VALID_TYPES = ['mermaid', 'excalidraw', 'drawio', 'graphviz'] as const

/** Normalize format name (e.g. 'jpg' → 'jpeg') */
function normalizeFormat(f: string): OutputFormat {
  if (f === 'jpg') return 'jpeg'
  return f as OutputFormat
}

function validateEnum<T extends string>(value: string, valid: readonly T[], label: string): T {
  if (!valid.includes(value as T)) {
    console.error(`Invalid ${label}: "${value}". Must be one of: ${valid.join(', ')}`)
    process.exit(1)
  }
  return value as T
}

function validatePositiveNumber(value: string, label: string): number {
  const num = parseFloat(value)
  if (isNaN(num) || num <= 0) {
    console.error(`Invalid ${label}: "${value}". Must be a positive number.`)
    process.exit(1)
  }
  return num
}

/** Parse comma-separated formats, validate each, and normalize (e.g. jpg → jpeg). */
function parseFormats(raw: string): OutputFormat[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    console.error('--format requires at least one format')
    process.exit(1)
  }
  return parts.map((f) => {
    validateEnum(f, VALID_FORMATS, 'format')
    return normalizeFormat(f)
  })
}

/* ── Unknown flag detection ── */

function warnUnknownFlags() {
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
    'quiet',
    'json',
    'config',
    'output-dir',
    'manifest-file',
    'no-manifest',
    'same-folder',
    'help',
    'version',
    'agent-help',
    'ts',
  ])
  const knownShortFlags = new Set(Object.keys(SHORT_FLAGS))

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      if (!knownFlags.has(name)) {
        console.warn(`Warning: unknown flag "${arg}"`)
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const short = arg.slice(1)
      if (!knownShortFlags.has(short)) {
        console.warn(`Warning: unknown flag "${arg}"`)
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

async function commandInit() {
  const useTs = args.includes('--ts')
  const { writeFileSync } = await import('node:fs')

  if (useTs) {
    const configPath = resolve('diagramkit.config.ts')
    if (existsSync(configPath)) {
      console.log('diagramkit.config.ts already exists.')
      return
    }
    const content = `import { defineConfig } from 'diagramkit'

export default defineConfig({
  outputDir: '.diagramkit',
  defaultFormats: ['svg'],
  defaultTheme: 'both',
})
`
    writeFileSync(configPath, content)
    console.log('Created diagramkit.config.ts')
  } else {
    const configPath = resolve('diagramkit.config.json5')
    if (existsSync(configPath)) {
      console.log('diagramkit.config.json5 already exists.')
      return
    }
    // Also check for legacy config
    if (existsSync(resolve('.diagramkitrc.json'))) {
      console.log('.diagramkitrc.json exists. Consider migrating to diagramkit.config.json5.')
      return
    }
    const content = `{
  // diagramkit configuration
  // Docs: https://projects.sujeet.pro/diagramkit/guide/configuration
  outputDir: '.diagramkit',
  defaultFormats: ['svg'],
  defaultTheme: 'both',
}
`
    writeFileSync(configPath, content)
    console.log('Created diagramkit.config.json5')
  }
}

async function commandRender() {
  // Find the first positional argument after "render" by skipping flags and their values
  const FLAGS_WITH_VALUES = new Set([
    'format',
    'theme',
    'scale',
    'quality',
    'type',
    'output',
    'config',
    'output-dir',
    'manifest-file',
  ])
  let target = '.'
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      if (FLAGS_WITH_VALUES.has(name)) i++ // skip the value too
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

  const rawQuality = getFlagValue('quality')
  const quality = rawQuality ? validatePositiveNumber(rawQuality, 'quality') : 90

  const force = getFlag('force')
  const watchMode = getFlag('watch')
  const noContrast = args.includes('--no-contrast')
  const dryRun = args.includes('--dry-run')
  const quiet = args.includes('--quiet')
  const jsonOutput = args.includes('--json')

  // Config overrides from CLI flags
  const outputDir = getFlagValue('output-dir')
  const manifestFile = getFlagValue('manifest-file')
  const noManifest = args.includes('--no-manifest')
  const sameFolder = args.includes('--same-folder')
  const customOutput = getFlagValue('output')
  const configFilePath = getFlagValue('config')

  const configOverrides: Partial<import('../src/types').DiagramkitConfig> = {}
  if (outputDir) configOverrides.outputDir = outputDir
  if (manifestFile) configOverrides.manifestFile = manifestFile
  if (noManifest) configOverrides.useManifest = false
  if (sameFolder) configOverrides.sameFolder = true

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
  const resolvedConfig = loadConfig(configOverrides, configRoot, resolvedConfigFile)

  // Parse formats: comma-separated or from config defaults
  const formats: OutputFormat[] = rawFormat
    ? parseFormats(rawFormat)
    : resolvedConfig.defaultFormats
  const theme = validateEnum(rawTheme ?? resolvedConfig.defaultTheme, VALID_THEMES, 'theme')

  if (stat.isFile()) {
    // Single file render
    const { renderDiagramFileToDisk } = await import('../src/renderer')
    const { dispose } = await import('../src/pool')
    try {
      if (dryRun) {
        console.log(`Would render: ${resolvedTarget}`)
        return
      }

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

      const name = stripDiagramExtension(path.basename(resolvedTarget), resolvedConfig.extensionMap)
      const ext =
        getMatchedExtension(path.basename(resolvedTarget), resolvedConfig.extensionMap) ?? ''
      const fileDir = path.dirname(resolvedTarget)
      const outDir = customOutput
        ? resolve(customOutput)
        : ensureDiagramsDir(fileDir, resolvedConfig)

      // Accumulate formats from manifest (unless custom output, which skips manifest)
      let effectiveFormats = formats
      if (!customOutput && resolvedConfig.useManifest) {
        const manifest = readManifest(fileDir, resolvedConfig)
        const entry = manifest.diagrams[path.basename(resolvedTarget)]
        if (entry?.formats) {
          effectiveFormats = [...new Set([...formats, ...entry.formats])]
        }
      }

      // Render using multi-format renderDiagramFileToDisk
      const diagramFile = { path: resolvedTarget, name, dir: fileDir, ext }
      const written = await renderDiagramFileToDisk(diagramFile, {
        formats: effectiveFormats,
        theme,
        scale,
        quality,
        contrastOptimize: !noContrast,
        config: resolvedConfig,
        outDir,
      })

      // Update manifest for incremental builds (skip for custom output dirs)
      if (!customOutput) {
        updateManifest(
          [{ ...diagramFile, _effectiveFormats: effectiveFormats }],
          formats,
          resolvedConfig,
          theme,
        )
      }

      if (jsonOutput) {
        console.log(JSON.stringify({ rendered: written.map((f) => path.join(outDir, f)) }))
      } else if (!quiet) {
        for (const fileName of written) {
          const outPath = path.join(outDir, fileName)
          console.log(`  Written: ${outPath}`)
        }
      }
    } finally {
      await dispose()
    }
    return
  }

  // Directory render
  if (dryRun) {
    const { findDiagramFiles, filterByType: filterByTypeFn } = await import('../src/discovery')
    const { filterStaleFiles } = await import('../src/manifest')
    let files = findDiagramFiles(resolvedTarget, resolvedConfig)
    if (type) files = filterByTypeFn(files, type, resolvedConfig)
    const stale = filterStaleFiles(files, force, formats, resolvedConfig, theme)

    if (jsonOutput) {
      console.log(
        JSON.stringify({
          total: files.length,
          stale: stale.map((f) => f.path),
          upToDate: files.length - stale.length,
        }),
      )
    } else {
      console.log(`Found ${files.length} diagram files, ${stale.length} need rendering:`)
      for (const f of stale) {
        console.log(`  ${f.path}`)
      }
    }
    return
  }

  // Use the logger option to suppress output in quiet mode instead of monkey-patching console
  const noop = () => {}
  const logger = quiet || jsonOutput ? { log: noop, warn: quiet ? noop : console.warn } : undefined

  const { renderAll } = await import('../src/renderer')
  const { dispose } = await import('../src/pool')

  // When --output is used for directory, set sameFolder + outputDir to redirect everything
  const dirConfigOverrides = customOutput
    ? { ...resolvedConfig, sameFolder: false, outputDir: customOutput, useManifest: false }
    : resolvedConfig

  let renderResult
  try {
    renderResult = await renderAll({
      dir: resolvedTarget,
      formats,
      theme,
      scale,
      quality,
      force,
      type,
      contrastOptimize: !noContrast,
      config: dirConfigOverrides,
      logger,
    })
  } finally {
    if (!watchMode) {
      await dispose()
    }
  }

  if (jsonOutput && renderResult) {
    console.log(JSON.stringify(renderResult))
  }

  // Exit with code 1 if any renders failed
  if (renderResult && renderResult.failed.length > 0 && !watchMode) {
    process.exitCode = 1
  }

  if (watchMode) {
    const { watchDiagrams } = await import('../src/watch')
    const cleanup = watchDiagrams({
      dir: resolvedTarget,
      config: configOverrides,
      renderOptions: { formats, theme, scale, quality, contrastOptimize: !noContrast },
      onChange: (file) => {
        if (!quiet) console.log(`  Re-rendered: ${file}`)
      },
    })

    // Keep process alive, clean up on exit — dispose() must complete before exit to avoid zombie Chromium
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

  const command = args[0]

  if (command === 'warmup') {
    await commandWarmup()
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

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
