import { randomBytes } from 'node:crypto'
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { getExtensionMap, getMatchedExtension } from './extensions'
import type { DiagramType, OutputFormat, RenderResult, Theme } from './types'

type OutputVariant = 'light' | 'dark'

export function atomicWrite(path: string, content: Buffer): void {
  const tmp = path + '.tmp.' + randomBytes(4).toString('hex')
  try {
    writeFileSync(tmp, content)
    renameSync(tmp, path)
  } catch (err) {
    try {
      unlinkSync(tmp)
    } catch {}
    throw err
  }
}

export function getOutputVariants(theme: Theme = 'both'): OutputVariant[] {
  if (theme === 'light') return ['light']
  if (theme === 'dark') return ['dark']
  return ['light', 'dark']
}

export function getOutputFileName(
  name: string,
  variant: OutputVariant,
  format: OutputFormat = 'svg',
): string {
  return `${name}-${variant}.${format}`
}

export function getExpectedOutputNames(
  name: string,
  format: OutputFormat = 'svg',
  theme: Theme = 'both',
): string[] {
  return getOutputVariants(theme).map((variant) => getOutputFileName(name, variant, format))
}

/**
 * Strip the full diagram extension, including multi-part aliases like `.drawio.xml`.
 * This keeps CLI naming aligned with discovery and manifest naming.
 */
export function stripDiagramExtension(
  filename: string,
  extensionOverrides?: Record<string, DiagramType>,
): string {
  const ext = getMatchedExtension(filename, getExtensionMap(extensionOverrides))
  return ext ? basename(filename, ext) : filename.replace(/\.[^.]+$/, '')
}

/**
 * Write whichever variants were returned by the renderer.
 * We derive filenames from the actual render result so callers do not need to keep theme state in sync.
 */
export function writeRenderResult(name: string, outDir: string, result: RenderResult): string[] {
  mkdirSync(outDir, { recursive: true })

  const written: string[] = []
  if (result.light) {
    const fileName = getOutputFileName(name, 'light', result.format)
    atomicWrite(join(outDir, fileName), result.light)
    written.push(fileName)
  }

  if (result.dark) {
    const fileName = getOutputFileName(name, 'dark', result.format)
    atomicWrite(join(outDir, fileName), result.dark)
    written.push(fileName)
  }

  return written
}
