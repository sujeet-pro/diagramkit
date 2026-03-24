import { describe, expect, it } from 'vite-plus/test'
import { convertSvg } from './convert'

const minimalSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'

describe('convertSvg', () => {
  it('converts SVG string to PNG buffer', async () => {
    const result = await convertSvg(minimalSvg, { format: 'png' })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // PNG magic bytes
    expect(result[0]).toBe(0x89)
    expect(result[1]).toBe(0x50)
  })

  it('converts SVG string to JPEG buffer', async () => {
    const result = await convertSvg(minimalSvg, { format: 'jpeg', quality: 80 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // JPEG magic bytes
    expect(result[0]).toBe(0xff)
    expect(result[1]).toBe(0xd8)
  })

  it('converts SVG string to WebP buffer', async () => {
    const result = await convertSvg(minimalSvg, { format: 'webp', quality: 80 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // WebP starts with RIFF
    expect(result.toString('ascii', 0, 4)).toBe('RIFF')
  })

  it('converts SVG Buffer to PNG', async () => {
    const svgBuf = Buffer.from(minimalSvg)
    const result = await convertSvg(svgBuf, { format: 'png' })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('respects density option', async () => {
    const low = await convertSvg(minimalSvg, { format: 'png', density: 1 })
    const high = await convertSvg(minimalSvg, { format: 'png', density: 3 })
    // Higher density produces larger output
    expect(high.length).toBeGreaterThan(low.length)
  })

  it('uses default density when not specified', async () => {
    // Default density is 2; this should produce a valid PNG without specifying density
    const result = await convertSvg(minimalSvg, { format: 'png' })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // PNG magic bytes
    expect(result[0]).toBe(0x89)
    expect(result[1]).toBe(0x50)
    // Default density (2) should produce a larger image than density 1
    const lowDensity = await convertSvg(minimalSvg, { format: 'png', density: 1 })
    expect(result.length).toBeGreaterThan(lowDensity.length)
  })
})
