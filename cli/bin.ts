#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const args = process.argv.slice(2)

/* ── Help ── */

function printHelp() {
  console.log(`
diagramkit — Render .mermaid, .excalidraw, and .drawio files to SVG/PNG/JPEG/WebP

Usage:
  diagramkit render <file-or-dir> [options]
  diagramkit warmup
  diagramkit init
  diagramkit install-skills [--global]
  diagramkit --version
  diagramkit --help

Commands:
  render <file-or-dir>     Render diagram file(s) to images
  warmup                   Pre-install Playwright chromium browser
  init                     Create a .diagramkitrc.json config file
  install-skills           Copy diagramkit skills to .claude/skills/ (or ~/.claude/skills/ with --global)

Render options:
  --format <svg|png|jpeg|webp>      Output format (default: svg)
  --theme <light|dark|both>         Theme variants (default: both)
  --scale <number>                  Scale factor for raster output (default: 2)
  --quality <number>                JPEG/WebP quality 1-100 (default: 90)
  --force                           Re-render all, ignore manifest
  --watch                           Watch for changes and re-render
  --no-contrast                     Disable dark SVG contrast optimization
  --type <mermaid|excalidraw|drawio> Filter to specific diagram type
  --output <dir>                    Custom output directory (single file and directory)
  --dry-run                         Show what would be rendered without rendering

Configuration options:
  --output-dir <name>               Output folder name (default: .diagrams)
  --manifest-file <name>            Manifest filename (default: diagrams.manifest.json)
  --no-manifest                     Disable manifest tracking
  --same-folder                     Output in same folder as source files

Output options:
  --quiet                           Suppress informational output, only show errors
  --json                            Output results as JSON (for CI/scripting)

General:
  -h, --help                        Show this help
  -v, --version                     Show version

Examples:
  diagramkit render .                                  # Render all in cwd
  diagramkit render flow.mermaid                       # Single file
  diagramkit render arch.drawio --format png           # Draw.io to PNG
  diagramkit render ./docs --format webp --scale 3     # High-res WebPs
  diagramkit render . --watch                          # Watch mode
  diagramkit render . --same-folder --no-manifest      # Flat output
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
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1]
  return undefined
}

/* ── Validation ── */

const VALID_FORMATS = ['svg', 'png', 'jpeg', 'webp'] as const
const VALID_THEMES = ['light', 'dark', 'both'] as const
const VALID_TYPES = ['mermaid', 'excalidraw', 'drawio'] as const

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

/* ── Commands ── */

async function commandWarmup() {
  console.log('Installing Playwright chromium...')
  try {
    // Use playwright's own install mechanism rather than npx for reliability in global installs
    const playwrightPath = fileURLToPath(import.meta.resolve('playwright/cli'))
    const { execFileSync } = await import('child_process')
    execFileSync(process.execPath, [playwrightPath, 'install', 'chromium'], { stdio: 'inherit' })
  } catch {
    // Fallback to npx if direct resolution fails
    const { execSync } = await import('child_process')
    execSync('npx playwright install chromium', { stdio: 'inherit' })
  }
  console.log('Done.')
}

async function commandInit() {
  const configPath = resolve('.diagramkitrc.json')
  if (existsSync(configPath)) {
    console.log('.diagramkitrc.json already exists.')
    return
  }

  const { writeFileSync } = await import('fs')
  const config = {
    outputDir: '.diagrams',
    manifestFile: 'diagrams.manifest.json',
    useManifest: true,
    sameFolder: false,
    defaultFormat: 'svg',
    defaultTheme: 'both',
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  console.log('Created .diagramkitrc.json')
}

async function commandInstallSkills() {
  const isGlobal = args.includes('--global')
  const { mkdirSync, cpSync } = await import('fs')
  const { join, dirname } = await import('path')

  // Find skills directory relative to this package
  const pkgCandidates = [
    new URL('../skills', import.meta.url),
    new URL('../../skills', import.meta.url),
  ]

  let skillsSource: string | null = null
  for (const url of pkgCandidates) {
    const path = fileURLToPath(url)
    if (existsSync(path)) {
      skillsSource = path
      break
    }
  }

  if (!skillsSource) {
    console.error('Could not find skills directory in diagramkit package.')
    process.exit(1)
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE || ''
  const targetBase = isGlobal
    ? join(homeDir, '.claude', 'skills')
    : join(process.cwd(), '.claude', 'skills')

  const targetDir = join(targetBase, 'diagramkit')

  mkdirSync(targetDir, { recursive: true })

  // Copy claude-code skills
  const claudeCodeSource = join(skillsSource, 'claude-code')
  if (existsSync(claudeCodeSource)) {
    cpSync(claudeCodeSource, targetDir, { recursive: true })
  }

  const location = isGlobal ? `~/.claude/skills/diagramkit/` : `.claude/skills/diagramkit/`
  console.log(`Skills installed to ${location}`)
  console.log(`\nAvailable skills:`)
  console.log(`  /diagrams       — Engine selection orchestrator`)
  console.log(`  /diagram-mermaid    — Mermaid authoring`)
  console.log(`  /diagram-excalidraw — Excalidraw authoring`)
  console.log(`  /diagram-drawio     — Draw.io authoring`)
  console.log(`  /diagramkit         — CLI quick reference`)
  console.log(`  /image-convert      — SVG to raster conversion`)
}

async function commandRender() {
  const target = args[1] ?? '.'

  // Validate flag values
  const rawFormat = getFlagValue('format') ?? 'svg'
  const format = validateEnum(rawFormat, VALID_FORMATS, 'format')

  const rawTheme = getFlagValue('theme') ?? 'both'
  const theme = validateEnum(rawTheme, VALID_THEMES, 'theme')

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

  const configOverrides: Partial<import('../src/types').DiagramkitConfig> = {}
  if (outputDir) configOverrides.outputDir = outputDir
  if (manifestFile) configOverrides.manifestFile = manifestFile
  if (noManifest) configOverrides.useManifest = false
  if (sameFolder) configOverrides.sameFolder = true
  configOverrides.defaultFormat = format
  configOverrides.defaultTheme = theme

  const resolvedTarget = resolve(target)

  // Check if target is a single file
  const stat = existsSync(resolvedTarget) ? (await import('fs')).statSync(resolvedTarget) : null

  if (stat?.isFile()) {
    // Single file render
    const { renderFile, dispose } = await import('../src/index')
    try {
      if (dryRun) {
        console.log(`Would render: ${resolvedTarget}`)
        return
      }

      const result = await renderFile(resolvedTarget, {
        format,
        theme,
        scale,
        quality,
        contrastOptimize: !noContrast,
        config: configOverrides,
      })

      // Write output files
      const path = await import('path')
      const { ensureDiagramsDir } = await import('../src/manifest')
      const { loadConfig } = await import('../src/config')
      const { stripDiagramExtension, writeRenderResult } = await import('../src/output')
      const config = loadConfig(configOverrides, path.dirname(resolvedTarget))
      const outDir = customOutput
        ? resolve(customOutput)
        : ensureDiagramsDir(path.dirname(resolvedTarget), config)
      const name = stripDiagramExtension(path.basename(resolvedTarget))
      const written = writeRenderResult(name, outDir, result)

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
    const { findDiagramFiles, filterByType: filterByTypeFn } = await import('../src/index')
    const { filterStaleFiles } = await import('../src/manifest')
    const { loadConfig } = await import('../src/config')
    const config = loadConfig(configOverrides, resolvedTarget)
    let files = findDiagramFiles(resolvedTarget, config)
    if (type) files = filterByTypeFn(files, type, config)
    const stale = filterStaleFiles(files, force, format, config, theme)

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

  // Suppress console.log in quiet mode
  const origLog = console.log
  const origWarn = console.warn
  if (quiet && !jsonOutput) {
    console.log = () => {}
  }

  const { renderAll, dispose } = await import('../src/index')

  let renderResult
  try {
    renderResult = await renderAll({
      dir: resolvedTarget,
      format,
      theme,
      scale,
      quality,
      force,
      type,
      contrastOptimize: !noContrast,
      config: configOverrides,
    })

    if (customOutput && renderResult.rendered.length > 0) {
      // When --output is provided for directory mode, copy outputs to the specified directory
      const path = await import('path')
      const { mkdirSync, cpSync, readdirSync } = await import('fs')
      const outDir = resolve(customOutput)
      mkdirSync(outDir, { recursive: true })

      // Find all .diagrams dirs and copy their contents to the output dir
      const { getDiagramsDir } = await import('../src/manifest')
      const { loadConfig } = await import('../src/config')
      const config = loadConfig(configOverrides, resolvedTarget)
      const dirs = new Set(renderResult.rendered.map((f) => path.dirname(f)))
      for (const dir of dirs) {
        const diagDir = getDiagramsDir(dir, config)
        if (existsSync(diagDir)) {
          for (const file of readdirSync(diagDir)) {
            if (file.endsWith('.tmp') || file.endsWith('.json')) continue
            cpSync(path.join(diagDir, file), path.join(outDir, file))
          }
        }
      }
    }
  } finally {
    // Restore console
    if (quiet) {
      console.log = origLog
      console.warn = origWarn
    }

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
    const { watchDiagrams } = await import('../src/index')
    const cleanup = watchDiagrams({
      dir: resolvedTarget,
      config: configOverrides,
      renderOptions: { format, theme, scale, quality, contrastOptimize: !noContrast },
      onChange: (file) => {
        if (!quiet) console.log(`  Re-rendered: ${file}`)
      },
    })

    // Keep process alive, clean up on exit
    process.on('SIGINT', () => {
      cleanup()
      void import('../src/index').then(({ dispose }) => dispose())
      process.exit(0)
    })
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

  const command = args[0]

  if (command === 'warmup') {
    await commandWarmup()
    return
  }

  if (command === 'init') {
    await commandInit()
    return
  }

  if (command === 'install-skills') {
    await commandInstallSkills()
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
