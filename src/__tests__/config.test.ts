import { describe, expect, it } from 'vite-plus/test'
import { getDefaultConfig, loadConfig } from '../config'

describe('getDefaultConfig', () => {
  it('returns expected defaults', () => {
    const config = getDefaultConfig()
    expect(config.outputDir).toBe('.diagrams')
    expect(config.manifestFile).toBe('diagrams.manifest.json')
    expect(config.useManifest).toBe(true)
    expect(config.sameFolder).toBe(false)
    expect(config.defaultFormat).toBe('svg')
    expect(config.defaultTheme).toBe('both')
  })
})

describe('loadConfig', () => {
  it('returns defaults when no config files exist', () => {
    const config = loadConfig(undefined, '/nonexistent/path')
    expect(config.outputDir).toBe('.diagrams')
    expect(config.manifestFile).toBe('diagrams.manifest.json')
  })

  it('applies overrides', () => {
    const config = loadConfig({
      outputDir: 'images',
      useManifest: false,
      defaultFormat: 'png',
    })
    expect(config.outputDir).toBe('images')
    expect(config.useManifest).toBe(false)
    expect(config.defaultFormat).toBe('png')
    // Non-overridden values keep defaults
    expect(config.manifestFile).toBe('diagrams.manifest.json')
    expect(config.sameFolder).toBe(false)
  })

  it('overrides take precedence over defaults', () => {
    const config = loadConfig({ sameFolder: true })
    expect(config.sameFolder).toBe(true)
    expect(config.outputDir).toBe('.diagrams')
  })
})
