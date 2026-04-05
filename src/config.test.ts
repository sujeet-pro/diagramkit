/**
 * User scenario:
 * A team can define defaults in the library, override them globally for a machine, refine them
 * per repository with `diagramkit.config.json5`, and still override everything for one render call.
 *
 * What this file verifies:
 * - built-in defaults are stable
 * - local config files are discovered by walking parent directories
 * - merge precedence remains defaults -> global -> env -> local -> per-call overrides
 * - json5 and legacy .diagramkitrc.json configs are both supported
 * - environment variable overrides work
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test'
import { defineConfig, getDefaultConfig, loadConfig } from './config'
import { DiagramkitError } from './types'

describe('config loading', () => {
  const originalEnv = {
    HOME: process.env.HOME,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    DIAGRAMKIT_FORMAT: process.env.DIAGRAMKIT_FORMAT,
    DIAGRAMKIT_THEME: process.env.DIAGRAMKIT_THEME,
    DIAGRAMKIT_OUTPUT_DIR: process.env.DIAGRAMKIT_OUTPUT_DIR,
    DIAGRAMKIT_NO_MANIFEST: process.env.DIAGRAMKIT_NO_MANIFEST,
  }
  const tempDirs: string[] = []

  afterEach(() => {
    // Restore env vars, using delete for originally-undefined values
    // (process.env coerces undefined to string 'undefined')
    for (const [key, val] of Object.entries(originalEnv)) {
      if (val === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = val
      }
    }

    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns expected defaults', () => {
    const config = getDefaultConfig()
    expect(config).toEqual({
      outputDir: '.diagramkit',
      manifestFile: 'manifest.json',
      useManifest: true,
      sameFolder: false,
      defaultFormats: ['svg'],
      defaultTheme: 'both',
      outputPrefix: '',
      outputSuffix: '',
    })
  })

  it('returns defaults when no config files exist', () => {
    const config = loadConfig(undefined, '/nonexistent/path')
    expect(config.outputDir).toBe('.diagramkit')
    expect(config.manifestFile).toBe('manifest.json')
  })

  it('defineConfig is an identity function', () => {
    const input = { outputDir: 'custom', defaultTheme: 'dark' as const }
    expect(defineConfig(input)).toBe(input)
  })

  it('finds the nearest local json5 config by walking parent directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-config-json5-'))
    const nested = join(root, 'docs', 'diagrams')
    tempDirs.push(root)

    mkdirSync(nested, { recursive: true })
    writeFileSync(
      join(root, 'diagramkit.config.json5'),
      `{
        // json5 config with comments
        outputDir: '_generated',
        defaultTheme: 'dark',
      }`,
    )

    const config = loadConfig(undefined, nested)
    expect(config.outputDir).toBe('_generated')
    expect(config.defaultTheme).toBe('dark')
  })

  it('finds the nearest legacy .diagramkitrc.json by walking parent directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-config-local-'))
    const nested = join(root, 'docs', 'diagrams')
    tempDirs.push(root)

    mkdirSync(nested, { recursive: true })
    writeFileSync(
      join(root, '.diagramkitrc.json'),
      JSON.stringify({ outputDir: '_generated', defaultTheme: 'dark' }),
    )

    const config = loadConfig(undefined, nested)
    expect(config.outputDir).toBe('_generated')
    expect(config.defaultTheme).toBe('dark')
  })

  it('applies overrides on top of merged config', () => {
    const config = loadConfig({
      outputDir: 'images',
      useManifest: false,
      defaultFormats: ['png'],
    })

    expect(config.outputDir).toBe('images')
    expect(config.useManifest).toBe(false)
    expect(config.defaultFormats).toEqual(['png'])
    expect(config.manifestFile).toBe('manifest.json')
    expect(config.sameFolder).toBe(false)
  })

  it('migrates old defaultFormat (string) to defaultFormats (array)', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-config-migrate-'))
    tempDirs.push(root)

    writeFileSync(join(root, '.diagramkitrc.json'), JSON.stringify({ defaultFormat: 'png' }))

    const config = loadConfig(undefined, root)
    expect(config.defaultFormats).toEqual(['png'])
  })

  it('reads env var overrides', () => {
    process.env.DIAGRAMKIT_FORMAT = 'png,webp'
    process.env.DIAGRAMKIT_THEME = 'dark'
    process.env.DIAGRAMKIT_OUTPUT_DIR = '_env_output'
    process.env.DIAGRAMKIT_NO_MANIFEST = 'true'

    const config = loadConfig()
    expect(config.defaultFormats).toEqual(['png', 'webp'])
    expect(config.defaultTheme).toBe('dark')
    expect(config.outputDir).toBe('_env_output')
    expect(config.useManifest).toBe(false)
  })

  it('local config overrides env vars', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-config-envlocal-'))
    tempDirs.push(root)

    process.env.DIAGRAMKIT_OUTPUT_DIR = '_env_output'
    writeFileSync(join(root, 'diagramkit.config.json5'), `{ outputDir: '_local_output' }`)

    const config = loadConfig(undefined, root)
    expect(config.outputDir).toBe('_local_output')
  })

  it('merges defaults, global config, env, local config, and overrides in the documented order', () => {
    const home = mkdtempSync(join(tmpdir(), 'diagramkit-config-home-'))
    const repo = mkdtempSync(join(tmpdir(), 'diagramkit-config-repo-'))
    const nested = join(repo, 'docs', 'api')
    tempDirs.push(home, repo)

    process.env.HOME = home
    process.env.XDG_CONFIG_HOME = join(home, '.config')

    mkdirSync(join(home, '.config', 'diagramkit'), { recursive: true })
    mkdirSync(nested, { recursive: true })

    writeFileSync(
      join(home, '.config', 'diagramkit', 'config.json'),
      JSON.stringify({
        outputDir: '_global',
        manifestFile: 'global.manifest.json',
        defaultTheme: 'dark',
      }),
    )
    writeFileSync(
      join(repo, '.diagramkitrc.json'),
      JSON.stringify({
        outputDir: '_local',
        useManifest: false,
      }),
    )

    const config = loadConfig(
      {
        manifestFile: 'override.manifest.json',
        defaultFormats: ['webp'],
      },
      nested,
    )

    expect(config).toEqual({
      outputDir: '_local',
      manifestFile: 'override.manifest.json',
      useManifest: false,
      sameFolder: false,
      defaultFormats: ['webp'],
      defaultTheme: 'dark',
      outputPrefix: '',
      outputSuffix: '',
    })
  })

  it('ignores malformed JSON in global config and falls back to defaults', () => {
    const home = mkdtempSync(join(tmpdir(), 'diagramkit-config-badglobal-'))
    tempDirs.push(home)

    process.env.HOME = home
    process.env.XDG_CONFIG_HOME = join(home, '.config')

    mkdirSync(join(home, '.config', 'diagramkit'), { recursive: true })
    writeFileSync(join(home, '.config', 'diagramkit', 'config.json'), '{invalid json!!!')

    // Malformed global config should be ignored — defaults still apply
    const config = loadConfig(undefined, '/nonexistent/path')
    expect(config.outputDir).toBe('.diagramkit')
    expect(config.manifestFile).toBe('manifest.json')
  })

  it('ignores malformed JSON in local config and falls back to defaults', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-config-badlocal-'))
    tempDirs.push(root)

    writeFileSync(join(root, '.diagramkitrc.json'), 'not valid json {{{')

    // Malformed local config should be ignored — defaults still apply
    const config = loadConfig(undefined, root)
    expect(config.outputDir).toBe('.diagramkit')
    expect(config.manifestFile).toBe('manifest.json')
  })

  it('skips malformed nearest config and keeps searching parent directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-config-fallback-'))
    const nested = join(root, 'a', 'b')
    tempDirs.push(root)

    mkdirSync(nested, { recursive: true })
    writeFileSync(join(root, 'diagramkit.config.json5'), `{ outputDir: '_root' }`)
    writeFileSync(join(nested, 'diagramkit.config.json5'), '{ broken json5 ')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const config = loadConfig(undefined, nested)

    expect(config.outputDir).toBe('_root')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping file'))
  })

  it('deep-merges extensionMap so layers accumulate', () => {
    const home = mkdtempSync(join(tmpdir(), 'diagramkit-config-extmap-'))
    const repo = mkdtempSync(join(tmpdir(), 'diagramkit-config-extmap-repo-'))
    tempDirs.push(home, repo)

    process.env.HOME = home
    process.env.XDG_CONFIG_HOME = join(home, '.config')

    mkdirSync(join(home, '.config', 'diagramkit'), { recursive: true })
    writeFileSync(
      join(home, '.config', 'diagramkit', 'config.json'),
      JSON.stringify({ extensionMap: { '.puml': 'mermaid' } }),
    )
    writeFileSync(
      join(repo, '.diagramkitrc.json'),
      JSON.stringify({ extensionMap: { '.d2': 'mermaid' } }),
    )

    const config = loadConfig({ extensionMap: { '.custom': 'excalidraw' } }, repo)

    // All three layers should be present
    expect(config.extensionMap).toEqual(
      expect.objectContaining({
        '.puml': 'mermaid',
        '.d2': 'mermaid',
        '.custom': 'excalidraw',
      }),
    )
  })

  it('validates outputPrefix and outputSuffix as strings', () => {
    const config = loadConfig({ outputPrefix: 'diagram-', outputSuffix: '-v2' })
    expect(config.outputPrefix).toBe('diagram-')
    expect(config.outputSuffix).toBe('-v2')
  })

  it('resets invalid option types to defaults and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const config = loadConfig({
      outputDir: '../escape' as unknown as string,
      manifestFile: 123 as unknown as string,
      useManifest: 'yes' as unknown as boolean,
      sameFolder: 'no' as unknown as boolean,
      defaultFormats: [] as unknown as ['svg'],
      defaultTheme: 42 as unknown as 'both',
    })

    expect(config.outputDir).toBe('.diagramkit')
    expect(config.manifestFile).toBe('manifest.json')
    expect(config.useManifest).toBe(true)
    expect(config.sameFolder).toBe(false)
    expect(config.defaultFormats).toEqual(['svg'])
    expect(config.defaultTheme).toBe('both')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('resets invalid theme values to defaults', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const config = loadConfig({
      defaultTheme: 'neon' as unknown as 'both',
    })

    expect(config.defaultTheme).toBe('both')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid config value for defaultTheme'),
    )
  })

  it('throws in strict mode for invalid override values', () => {
    expect(() =>
      loadConfig({ outputDir: '../escape' as unknown as string }, undefined, undefined, {
        strict: true,
      }),
    ).toThrow(DiagramkitError)
  })

  it('throws in strict mode for malformed local config', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-config-strict-bad-'))
    tempDirs.push(root)

    writeFileSync(join(root, 'diagramkit.config.json5'), '{ broken json5 ')
    expect(() => loadConfig(undefined, root, undefined, { strict: true })).toThrow(DiagramkitError)
  })
})

describe('getFileOverrides', () => {
  let getFileOverrides: typeof import('./config').getFileOverrides

  beforeAll(async () => {
    const mod = await import('./config')
    getFileOverrides = mod.getFileOverrides
  })

  it('returns undefined when no overrides are configured', () => {
    expect(getFileOverrides('/repo/docs/flow.mermaid', {})).toBeUndefined()
  })

  it('matches by exact filename', () => {
    const override = { formats: ['png'] as import('./types').OutputFormat[] }
    const result = getFileOverrides('/repo/docs/flow.mermaid', {
      overrides: { 'flow.mermaid': override },
    })
    expect(result).toEqual(override)
  })

  it('matches by relative path when rootDir is provided', () => {
    const override = { theme: 'dark' as const }
    const result = getFileOverrides(
      '/repo/docs/arch.mermaid',
      { overrides: { 'docs/arch.mermaid': override } },
      '/repo',
    )
    expect(result).toEqual(override)
  })

  it('matches simple glob patterns with wildcard', () => {
    const override = { scale: 3 }
    const result = getFileOverrides(
      '/repo/docs/flow.mermaid',
      { overrides: { '*.mermaid': override } },
      '/repo',
    )
    expect(result).toEqual(override)
  })

  it('matches globstar patterns', () => {
    const override = { quality: 80 }
    const result = getFileOverrides(
      '/repo/docs/sub/flow.excalidraw',
      { overrides: { 'docs/**/*.excalidraw': override } },
      '/repo',
    )
    expect(result).toEqual(override)
  })
})
