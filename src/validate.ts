import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

/* ── Validation result types ── */

export type SvgIssueSeverity = 'error' | 'warning'

export interface SvgIssue {
  code: SvgIssueCode
  severity: SvgIssueSeverity
  message: string
  suggestion?: string
}

export type SvgIssueCode =
  | 'EMPTY_FILE'
  | 'MISSING_SVG_TAG'
  | 'MISSING_SVG_CLOSE'
  | 'MISSING_WIDTH'
  | 'MISSING_HEIGHT'
  | 'NO_VISUAL_ELEMENTS'
  | 'CONTAINS_SCRIPT'
  | 'CONTAINS_FOREIGN_OBJECT'
  | 'MISSING_XMLNS'
  | 'EXTERNAL_RESOURCE'
  | 'INVALID_VIEWBOX'
  | 'SVG_TOO_LARGE'

export interface SvgValidationResult {
  file?: string
  valid: boolean
  issues: SvgIssue[]
}

const VISUAL_ELEMENT_RE =
  /<(rect|path|circle|ellipse|line|polygon|polyline|text|g|use|image|tspan)\b/
const SVG_OPEN_RE = /<svg\b[^>]*>/
const SVG_CLOSE_RE = /<\/svg\s*>/
const SCRIPT_RE = /<script\b/i
const FOREIGN_OBJECT_RE = /<foreignObject\b/i
const XMLNS_RE = /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/
const EXTERNAL_HREF_RE = /(?:xlink:)?href\s*=\s*["'](https?:\/\/[^"']+)["']/g
const WIDTH_RE = /width\s*=\s*["']([^"']*)["']/
const HEIGHT_RE = /height\s*=\s*["']([^"']*)["']/
const VIEWBOX_RE = /viewBox\s*=\s*["']([^"']*)["']/

const MAX_SVG_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

/**
 * Validate SVG content for correctness and img-tag renderability.
 * Returns structured issues with codes, messages, and suggestions.
 */
export function validateSvg(svg: string, filePath?: string): SvgValidationResult {
  const issues: SvgIssue[] = []

  if (!svg || svg.trim().length === 0) {
    issues.push({
      code: 'EMPTY_FILE',
      severity: 'error',
      message: 'SVG content is empty',
      suggestion: 'Re-render the diagram source file. The render may have failed silently.',
    })
    return { file: filePath, valid: false, issues }
  }

  if (filePath) {
    try {
      const size = statSync(filePath).size
      if (size > MAX_SVG_SIZE_BYTES) {
        issues.push({
          code: 'SVG_TOO_LARGE',
          severity: 'warning',
          message: `SVG file is ${(size / 1024 / 1024).toFixed(1)} MB — may cause slow rendering`,
          suggestion: 'Simplify the source diagram or split into multiple diagrams.',
        })
      }
    } catch {}
  }

  const svgTagMatch = svg.match(SVG_OPEN_RE)
  if (!svgTagMatch) {
    issues.push({
      code: 'MISSING_SVG_TAG',
      severity: 'error',
      message: 'No <svg> opening tag found',
      suggestion:
        'The file does not appear to be an SVG document. ' +
        'Check that the render completed successfully and the file was not corrupted.',
    })
    return { file: filePath, valid: false, issues }
  }

  if (!SVG_CLOSE_RE.test(svg)) {
    issues.push({
      code: 'MISSING_SVG_CLOSE',
      severity: 'error',
      message: 'No closing </svg> tag found — file may be truncated',
      suggestion:
        'The SVG was likely written incompletely. ' +
        'Re-render with --force. If the issue persists, check disk space and file permissions.',
    })
  }

  const tag = svgTagMatch[0]

  if (!XMLNS_RE.test(tag)) {
    issues.push({
      code: 'MISSING_XMLNS',
      severity: 'warning',
      message: 'Missing xmlns="http://www.w3.org/2000/svg" on <svg> tag',
      suggestion:
        'Browsers may still render it, but the SVG spec requires the namespace. ' +
        'Some embedding contexts (e.g., <img> or <object>) may reject it.',
    })
  }

  const hasWidth = WIDTH_RE.test(tag)
  const hasHeight = HEIGHT_RE.test(tag)
  const viewBoxMatch = tag.match(VIEWBOX_RE)

  if (!hasWidth && !viewBoxMatch) {
    issues.push({
      code: 'MISSING_WIDTH',
      severity: 'error',
      message: 'SVG has no width attribute and no viewBox — dimensions are unknown',
      suggestion:
        'The SVG will not size correctly in <img> tags. ' +
        'The source diagram renderer may have produced invalid output. Re-render or check the source file.',
    })
  }

  if (!hasHeight && !viewBoxMatch) {
    issues.push({
      code: 'MISSING_HEIGHT',
      severity: 'error',
      message: 'SVG has no height attribute and no viewBox — dimensions are unknown',
      suggestion:
        'The SVG will not size correctly in <img> tags. ' +
        'The source diagram renderer may have produced invalid output. Re-render or check the source file.',
    })
  }

  if (viewBoxMatch) {
    const parts = viewBoxMatch[1]!.trim().split(/[\s,]+/)
    if (parts.length !== 4 || parts.some((p) => isNaN(Number(p)))) {
      issues.push({
        code: 'INVALID_VIEWBOX',
        severity: 'warning',
        message: `Invalid viewBox value: "${viewBoxMatch[1]}"`,
        suggestion: 'viewBox must have exactly 4 numeric values: "minX minY width height".',
      })
    }
  }

  if (!VISUAL_ELEMENT_RE.test(svg)) {
    issues.push({
      code: 'NO_VISUAL_ELEMENTS',
      severity: 'error',
      message: 'SVG contains no visual elements (rect, path, circle, text, etc.)',
      suggestion:
        'The render produced an empty SVG shell. ' +
        'Check the source diagram for syntax errors and re-render.',
    })
  }

  if (SCRIPT_RE.test(svg)) {
    issues.push({
      code: 'CONTAINS_SCRIPT',
      severity: 'error',
      message: 'SVG contains a <script> tag — will not execute when loaded via <img>',
      suggestion:
        'Browsers block script execution in SVGs loaded via <img> for security. ' +
        'If interactivity is needed, embed via <object> or inline <svg>. ' +
        'For static rendering, the script should not be present — re-render with diagramkit.',
    })
  }

  if (FOREIGN_OBJECT_RE.test(svg)) {
    issues.push({
      code: 'CONTAINS_FOREIGN_OBJECT',
      severity: 'warning',
      message: 'SVG contains <foreignObject> — may not render in all contexts',
      suggestion:
        'Some browsers and embedding methods (especially <img>) do not render foreignObject content. ' +
        "If using Mermaid, add %%{init: {'htmlLabels': false}}%% to the source file.",
    })
  }

  let match
  const externalUrls: string[] = []
  while ((match = EXTERNAL_HREF_RE.exec(svg)) !== null) {
    externalUrls.push(match[1]!)
  }
  if (externalUrls.length > 0) {
    issues.push({
      code: 'EXTERNAL_RESOURCE',
      severity: 'warning',
      message: `SVG references ${externalUrls.length} external resource(s): ${externalUrls.slice(0, 3).join(', ')}${externalUrls.length > 3 ? '...' : ''}`,
      suggestion:
        'External resources are blocked when SVG is loaded via <img>. ' +
        'Inline the resources or use a different embedding method.',
    })
  }

  const hasErrors = issues.some((i) => i.severity === 'error')
  return { file: filePath, valid: !hasErrors, issues }
}

/**
 * Validate an SVG file on disk. Reads the file and delegates to validateSvg().
 */
export function validateSvgFile(filePath: string): SvgValidationResult {
  if (!existsSync(filePath)) {
    return {
      file: filePath,
      valid: false,
      issues: [
        {
          code: 'EMPTY_FILE',
          severity: 'error',
          message: `File does not exist: ${filePath}`,
          suggestion: 'Check the file path. The render may not have produced this output.',
        },
      ],
    }
  }

  const content = readFileSync(filePath, 'utf-8')
  return validateSvg(content, filePath)
}

/**
 * Validate all SVG files in a directory (non-recursive by default).
 */
export function validateSvgDirectory(
  dir: string,
  options: { recursive?: boolean } = {},
): SvgValidationResult[] {
  const results: SvgValidationResult[] = []

  function walk(d: string) {
    if (!existsSync(d)) return
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory() && options.recursive) {
        walk(full)
      } else if (entry.name.endsWith('.svg')) {
        results.push(validateSvgFile(full))
      }
    }
  }

  walk(dir)
  return results
}

/**
 * Format a validation result into human-readable output lines.
 */
export function formatValidationResult(result: SvgValidationResult): string {
  const lines: string[] = []
  const label = result.file ? basename(result.file) : 'SVG'
  const status = result.valid ? 'PASS' : 'FAIL'

  lines.push(`[${status}] ${result.file ?? label}`)

  for (const issue of result.issues) {
    const prefix = issue.severity === 'error' ? '  ERROR' : '  WARN '
    lines.push(`  ${prefix} [${issue.code}]: ${issue.message}`)
    if (issue.suggestion) {
      lines.push(`         → ${issue.suggestion}`)
    }
  }

  if (result.issues.length === 0 && result.valid) {
    lines.push('  All checks passed')
  }

  return lines.join('\n')
}
