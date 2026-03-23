#!/usr/bin/env node

import { readFileSync } from 'fs'
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
  diagramkit --version
  diagramkit --help

Commands:
  render <file-or-dir>   Render diagram file(s) to images
  warmup                 Pre-install Playwright chromium browser

Render options:
  --format <svg|png|jpeg|webp>      Output format (default: svg)
  --theme <light|dark|both>         Theme variants (default: both)
  --scale <number>                  Scale factor for raster output (default: 2)
  --quality <number>                JPEG/WebP quality 1-100 (default: 90)
  --force                           Re-render all, ignore manifest
  --watch                           Watch for changes and re-render
  --no-contrast                     Disable dark SVG contrast optimization
  --type <mermaid|excalidraw|drawio> Filter to specific diagram type
  --output <dir>                    Custom output directory (default: .diagrams sibling)

Configuration options:
  --output-dir <name>               Output folder name (default: .diagrams)
  --manifest-file <name>            Manifest filename (default: diagrams.manifest.json)
  --no-manifest                     Disable manifest tracking
  --same-folder                     Output in same folder as source files

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
`)
}

/* ── Version ── */

function printVersion() {
  try {
    const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url))
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    console.log(`diagramkit v${pkg.version}`)
  } catch {
    console.log('diagramkit (unknown version)')
  }
}

/* ── Arg parsing ── */

function getFlag(name: string): boolean {
  return args.includes(`--${name}`) || args.includes(`-${name[0]}`)
}

function getFlagValue(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`)
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1]
  return undefined
}

/* ── Main ── */

async function main() {
  if (args.length === 0 || getFlag('help') || getFlag('h')) {
    printHelp()
    return
  }

  if (getFlag('version') || getFlag('v')) {
    printVersion()
    return
  }

  const command = args[0]

  if (command === 'warmup') {
    console.log('Installing Playwright chromium...')
    const { execSync } = await import('child_process')
    execSync('npx playwright install chromium', { stdio: 'inherit' })
    console.log('Done.')
    return
  }

  if (command === 'render') {
    const target = args[1] ?? '.'
    const format = (getFlagValue('format') ?? 'svg') as 'svg' | 'png' | 'jpeg' | 'webp'
    const theme = (getFlagValue('theme') ?? 'both') as 'light' | 'dark' | 'both'
    const scale = getFlagValue('scale') ? parseFloat(getFlagValue('scale')!) : 2
    const quality = getFlagValue('quality') ? parseInt(getFlagValue('quality')!) : 90
    const force = getFlag('force')
    const watchMode = getFlag('watch')
    const noContrast = args.includes('--no-contrast')
    const type = getFlagValue('type') as 'mermaid' | 'excalidraw' | 'drawio' | undefined

    // Config overrides from CLI flags
    const outputDir = getFlagValue('output-dir')
    const manifestFile = getFlagValue('manifest-file')
    const noManifest = args.includes('--no-manifest')
    const sameFolder = args.includes('--same-folder')

    const configOverrides: Record<string, any> = {}
    if (outputDir) configOverrides.outputDir = outputDir
    if (manifestFile) configOverrides.manifestFile = manifestFile
    if (noManifest) configOverrides.useManifest = false
    if (sameFolder) configOverrides.sameFolder = true
    configOverrides.defaultFormat = format
    configOverrides.defaultTheme = theme

    const resolvedTarget = resolve(target)

    // Check if target is a single file
    const { existsSync, statSync } = await import('fs')
    const stat = existsSync(resolvedTarget) ? statSync(resolvedTarget) : null

    if (stat?.isFile()) {
      // Single file render
      const { renderFile, dispose } = await import('../src/index')
      try {
        const result = await renderFile(resolvedTarget, {
          format,
          theme,
          scale,
          quality,
          contrastOptimize: !noContrast,
          config: configOverrides,
        })

        // Write output files
        const { writeFileSync } = await import('fs')
        const path = await import('path')
        const { ensureDiagramsDir } = await import('../src/manifest')
        const { loadConfig } = await import('../src/config')
        const config = loadConfig(configOverrides, path.dirname(resolvedTarget))
        const ext = result.format
        const name = path.basename(resolvedTarget).replace(/\.[^.]+$/, '')
        const outDir = getFlagValue('output')
          ? resolve(getFlagValue('output')!)
          : ensureDiagramsDir(path.dirname(resolvedTarget), config)

        if (result.light) {
          const outPath = path.join(outDir, `${name}-light.${ext}`)
          writeFileSync(outPath, result.light)
          console.log(`  Written: ${outPath}`)
        }
        if (result.dark) {
          const outPath = path.join(outDir, `${name}-dark.${ext}`)
          writeFileSync(outPath, result.dark)
          console.log(`  Written: ${outPath}`)
        }
      } finally {
        await dispose()
      }
      return
    }

    // Directory render
    const { renderAll, dispose } = await import('../src/index')

    try {
      await renderAll({
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
    } finally {
      if (!watchMode) {
        await dispose()
      }
    }

    if (watchMode) {
      const { watchDiagrams } = await import('../src/index')
      const cleanup = watchDiagrams({
        dir: resolvedTarget,
        config: configOverrides,
        renderOptions: { format, theme, scale, quality, contrastOptimize: !noContrast },
        onChange: (file) => {
          console.log(`  Re-rendered: ${file}`)
        },
      })

      // Keep process alive, clean up on exit
      process.on('SIGINT', () => {
        cleanup()
        void import('../src/index').then(({ dispose }) => dispose())
        process.exit(0)
      })
    }

    return
  }

  console.error(`Unknown command: ${command}`)
  console.error('Run "diagramkit --help" for usage.')
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
