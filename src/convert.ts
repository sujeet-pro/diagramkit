import { DiagramkitError, type ConvertOptions } from './types'

/**
 * Convert an SVG buffer/string to a raster format using sharp.
 * sharp is dynamically imported — only required when raster output is needed.
 */
export async function convertSvg(svg: Buffer | string, options: ConvertOptions): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sharp's type varies by version; we validate at runtime
  let sharp: any
  try {
    const mod = await import('sharp')
    sharp = mod.default ?? mod
  } catch {
    throw new DiagramkitError(
      'MISSING_DEPENDENCY',
      `sharp is required for ${options.format} output. Install: npm install sharp`,
    )
  }

  const rawScale = options.scale ?? 2
  if (rawScale <= 0 || rawScale > 10) {
    throw new DiagramkitError(
      'CONFIG_INVALID',
      `scale must be greater than 0 and at most 10, got ${rawScale}`,
    )
  }
  const density = rawScale * 72 // sharp uses DPI, SVG base is 72
  const quality = Math.max(1, Math.min(100, options.quality ?? 90))
  const input = Buffer.isBuffer(svg) ? svg : Buffer.from(svg)

  let pipeline = sharp(input, { density })

  switch (options.format) {
    case 'png':
      // PNG is lossless, so `quality` does not apply; tune the deflate compression
      // and CPU effort for the smallest output. Callers may override either knob.
      pipeline = pipeline.png({ compressionLevel: 9, effort: 10, ...options.png })
      break
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality })
      break
    case 'webp':
      // effort 6 (max) is the smallest WebP; quality follows the render option.
      pipeline = pipeline.webp({ quality, effort: 6, ...options.webp })
      break
    case 'avif':
      // effort 6 balances the smallest AVIF against encode time; quality follows
      // the render option.
      pipeline = pipeline.avif({ quality, effort: 6, ...options.avif })
      break
    default: {
      const _exhaustive: never = options.format
      throw new Error(`Unsupported format: ${String(_exhaustive)}`)
    }
  }

  return pipeline.toBuffer()
}
