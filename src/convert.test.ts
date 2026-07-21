import { describe, expect, it, vi } from 'vite-plus/test'
import { convertSvg } from './convert'

const minimalSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'

describe('convertSvg', () => {
  it('throws when sharp is not available', async () => {
    vi.doMock('sharp', () => {
      throw new Error('Cannot find module')
    })
    // Re-import to pick up the mock
    const { convertSvg: convertWithoutSharp } = await import('./convert')
    await expect(convertWithoutSharp(minimalSvg, { format: 'png' })).rejects.toThrow(
      'sharp is required',
    )
    vi.doUnmock('sharp')
  })

  it('throws for scale of 0', async () => {
    await expect(convertSvg(minimalSvg, { format: 'png', scale: 0 })).rejects.toThrow(
      'scale must be greater than 0 and at most 10',
    )
  })

  it('throws for negative scale', async () => {
    await expect(convertSvg(minimalSvg, { format: 'png', scale: -1 })).rejects.toThrow(
      'scale must be greater than 0 and at most 10',
    )
  })

  it('throws for scale exceeding 10', async () => {
    await expect(convertSvg(minimalSvg, { format: 'png', scale: 11 })).rejects.toThrow(
      'scale must be greater than 0 and at most 10',
    )
  })

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

  it('respects scale option', async () => {
    const low = await convertSvg(minimalSvg, { format: 'png', scale: 1 })
    const high = await convertSvg(minimalSvg, { format: 'png', scale: 3 })
    // Higher scale produces larger output
    expect(high.length).toBeGreaterThan(low.length)
  })

  it('uses default scale when not specified', async () => {
    // Default scale is 2; this should produce a valid PNG without specifying scale
    const result = await convertSvg(minimalSvg, { format: 'png' })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // PNG magic bytes
    expect(result[0]).toBe(0x89)
    expect(result[1]).toBe(0x50)
    // Default scale (2) should produce a larger image than scale 1
    const lowScale = await convertSvg(minimalSvg, { format: 'png', scale: 1 })
    expect(result.length).toBeGreaterThan(lowScale.length)
  })

  it('clamps quality below 1 to 1 and produces valid JPEG output', async () => {
    const result = await convertSvg(minimalSvg, { format: 'jpeg', quality: -50 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // JPEG magic bytes
    expect(result[0]).toBe(0xff)
    expect(result[1]).toBe(0xd8)
  })

  it('clamps quality above 100 to 100 and produces valid JPEG output', async () => {
    const result = await convertSvg(minimalSvg, { format: 'jpeg', quality: 999 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // JPEG magic bytes
    expect(result[0]).toBe(0xff)
    expect(result[1]).toBe(0xd8)
  })

  it('clamps quality below 1 to 1 and produces valid WebP output', async () => {
    const result = await convertSvg(minimalSvg, { format: 'webp', quality: 0 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // WebP starts with RIFF
    expect(result.toString('ascii', 0, 4)).toBe('RIFF')
  })

  it('clamps quality above 100 to 100 and produces valid WebP output', async () => {
    const result = await convertSvg(minimalSvg, { format: 'webp', quality: 200 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // WebP starts with RIFF
    expect(result.toString('ascii', 0, 4)).toBe('RIFF')
  })

  it('converts SVG string to AVIF buffer', async () => {
    const result = await convertSvg(minimalSvg, { format: 'avif', quality: 80 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    // AVIF files start with a 'ftyp' box — the 4th-7th bytes contain 'ftyp'
    expect(result.toString('ascii', 4, 8)).toBe('ftyp')
  })

  it('clamps AVIF quality below 1 to 1', async () => {
    const result = await convertSvg(minimalSvg, { format: 'avif', quality: -10 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('clamps AVIF quality above 100 to 100', async () => {
    const result = await convertSvg(minimalSvg, { format: 'avif', quality: 999 })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('convertSvg sharp encoder tuning', () => {
  /**
   * Capture the options passed to each sharp encoder without touching the real codec,
   * so we can assert the tuned defaults and that caller overrides win.
   */
  async function captureEncoderCall(
    options: Parameters<typeof convertSvg>[1],
  ): Promise<Record<string, unknown>> {
    const calls: Record<string, unknown> = {}
    const pipeline: Record<string, (o?: unknown) => unknown> = {
      png: (o) => ((calls.png = o), pipeline),
      jpeg: (o) => ((calls.jpeg = o), pipeline),
      webp: (o) => ((calls.webp = o), pipeline),
      avif: (o) => ((calls.avif = o), pipeline),
      toBuffer: async () => Buffer.from([0]),
    }
    vi.doMock('sharp', () => ({ default: () => pipeline }))
    try {
      const { convertSvg: convert } = await import('./convert')
      await convert(minimalSvg, options)
    } finally {
      vi.doUnmock('sharp')
    }
    return calls
  }

  it('applies tuned PNG defaults (compressionLevel 9, effort 10)', async () => {
    const calls = await captureEncoderCall({ format: 'png' })
    expect(calls.png).toEqual({ compressionLevel: 9, effort: 10 })
  })

  it('lets caller PNG overrides win over the tuned defaults', async () => {
    const calls = await captureEncoderCall({ format: 'png', png: { compressionLevel: 3 } })
    expect(calls.png).toEqual({ compressionLevel: 3, effort: 10 })
  })

  it('applies tuned WebP defaults (effort 6) and forwards quality', async () => {
    const calls = await captureEncoderCall({ format: 'webp', quality: 80 })
    expect(calls.webp).toEqual({ quality: 80, effort: 6 })
  })

  it('lets caller WebP overrides win', async () => {
    const calls = await captureEncoderCall({
      format: 'webp',
      quality: 80,
      webp: { effort: 3, lossless: true },
    })
    expect(calls.webp).toEqual({ quality: 80, effort: 3, lossless: true })
  })

  it('applies tuned AVIF defaults (effort 6) and forwards quality', async () => {
    const calls = await captureEncoderCall({ format: 'avif', quality: 50 })
    expect(calls.avif).toEqual({ quality: 50, effort: 6 })
  })

  it('lets caller AVIF overrides win', async () => {
    const calls = await captureEncoderCall({ format: 'avif', quality: 50, avif: { effort: 2 } })
    expect(calls.avif).toEqual({ quality: 50, effort: 2 })
  })
})
