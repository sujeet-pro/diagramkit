import type { ConvertOptions } from './types'

/**
 * Convert an SVG buffer/string to a raster format using sharp.
 * sharp is dynamically imported — only required when raster output is needed.
 */
export async function convertSvg(svg: Buffer | string, options: ConvertOptions): Promise<Buffer> {
  let sharp: any
  try {
    const mod = await import('sharp')
    sharp = mod.default ?? mod
  } catch {
    throw new Error(`sharp is required for ${options.format} output. Install: npm add sharp`)
  }

  const rawDensity = options.density ?? 2
  if (rawDensity <= 0 || rawDensity > 10) {
    throw new Error(`density must be between 0 and 10, got ${rawDensity}`)
  }
  const density = rawDensity * 72 // sharp uses DPI, SVG base is 72
  const quality = Math.max(1, Math.min(100, options.quality ?? 90))
  const input = Buffer.isBuffer(svg) ? svg : Buffer.from(svg)

  let pipeline = sharp(input, { density })

  switch (options.format) {
    case 'png':
      pipeline = pipeline.png()
      break
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality })
      break
    case 'webp':
      pipeline = pipeline.webp({ quality })
      break
    case 'avif':
      pipeline = pipeline.avif({ quality })
      break
  }

  return pipeline.toBuffer()
}
