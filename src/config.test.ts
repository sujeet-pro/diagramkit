/**
 * User scenario:
 * A team can define defaults in the library, override them globally for a machine, refine them
 * per repository with `.diagramkitrc.json`, and still override everything for one render call.
 *
 * What this file verifies:
 * - built-in defaults are stable
 * - local config files are discovered by walking parent directories
 * - merge precedence remains defaults -> global -> local -> per-call overrides
 *
 * These tests keep configuration behavior honest without needing to spin up a browser.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { getDefaultConfig, loadConfig } from './config'

describe('config loading', () => {
  const originalEnv = {
    HOME: process.env.HOME,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  }
  const tempDirs: string[] = []

  afterEach(() => {
    process.env.HOME = originalEnv.HOME
    process.env.XDG_CONFIG_HOME = originalEnv.XDG_CONFIG_HOME

    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns expected defaults', () => {
    const config = getDefaultConfig()
    expect(config).toEqual({
      outputDir: '.diagrams',
      manifestFile: 'diagrams.manifest.json',
      useManifest: true,
      sameFolder: false,
      defaultFormat: 'svg',
      defaultTheme: 'both',
    })
  })

  it('returns defaults when no config files exist', () => {
    const config = loadConfig(undefined, '/nonexistent/path')
    expect(config.outputDir).toBe('.diagrams')
    expect(config.manifestFile).toBe('diagrams.manifest.json')
  })

  it('finds the nearest local config by walking parent directories', () => {
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
      defaultFormat: 'png',
    })

    expect(config.outputDir).toBe('images')
    expect(config.useManifest).toBe(false)
    expect(config.defaultFormat).toBe('png')
    expect(config.manifestFile).toBe('diagrams.manifest.json')
    expect(config.sameFolder).toBe(false)
  })

  it('merges defaults, global config, local config, and overrides in the documented order', () => {
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
        defaultFormat: 'webp',
      },
      nested,
    )

    expect(config).toEqual({
      outputDir: '_local',
      manifestFile: 'override.manifest.json',
      useManifest: false,
      sameFolder: false,
      defaultFormat: 'webp',
      defaultTheme: 'dark',
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
    expect(config.outputDir).toBe('.diagrams')
    expect(config.manifestFile).toBe('diagrams.manifest.json')
  })

  it('ignores malformed JSON in local config and falls back to defaults', () => {
    const root = mkdtempSync(join(tmpdir(), 'diagramkit-config-badlocal-'))
    tempDirs.push(root)

    writeFileSync(join(root, '.diagramkitrc.json'), 'not valid json {{{')

    // Malformed local config should be ignored — defaults still apply
    const config = loadConfig(undefined, root)
    expect(config.outputDir).toBe('.diagrams')
    expect(config.manifestFile).toBe('diagrams.manifest.json')
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
})
