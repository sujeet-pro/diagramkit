import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
  WCAG_AA_LARGE,
  WCAG_AA_NORMAL,
  defaultBackgroundForFile,
  findSvgContrastIssues,
} from './color/wcag'
import { parseSvgViewBoxDimensions, parseSvgViewBoxRatio } from './mermaid-layout'

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
  | 'LOW_CONTRAST_TEXT'
  | 'ASPECT_RATIO_EXTREME'
  | 'SVG_VIEWBOX_TOO_WIDE'

export interface SvgValidationResult {
  file?: string
  valid: boolean
  issues: SvgIssue[]
}

export interface SvgValidateOptions {
  /**
   * Whether to run the WCAG 2.2 AA contrast scan against rendered text.
   * Defaults to `true` for SVG outputs because the renderer can be told to skip
   * via `--no-contrast`. Pass `false` for hand-authored sources that legitimately
   * use translucent fills (e.g. annotation overlays).
   */
  checkContrast?: boolean
  /**
   * Effective canvas/page background. When omitted, the validator infers from the
   * filename suffix (`-light.svg` → white, `-dark.svg` → near-black).
   */
  backgroundOverride?: string
  /**
   * Aspect-ratio sanity check. When the rendered SVG ratio (width/height) falls
   * outside `[target / tolerance, target * tolerance]`, the validator emits an
   * `ASPECT_RATIO_EXTREME` warning so the agent loop can rebalance / split / swap
   * engine. Pass `false` to skip the check entirely (e.g. for full-page banners
   * that are intentionally extreme).
   *
   * Default: `{ target: 4 / 3, tolerance: 2.5 }` — accepts any ratio between
   * roughly 1:1.9 and 3.3:1 against a 4:3 visual target. This matches the
   * default `mermaidLayout` band so the in-renderer rebalance and the
   * post-render validator agree on what counts as "extreme".
   */
  aspectRatio?: { target: number; tolerance: number } | false
  /**
   * Absolute viewBox-width sanity check. When the rendered SVG's intrinsic
   * width exceeds `maxWidth` (default 800 user units / px), the validator
   * emits a `SVG_VIEWBOX_TOO_WIDE` warning. This catches diagrams whose
   * aspect ratio is technically inside the readable band but whose absolute
   * width forces an unreadable downscale at typical content-column widths.
   *
   * The default 800px threshold is calibrated against an empirically common
   * Pagesmith-style content column of ~500px (`--doc-content-max-width: 100ch`
   * resolves to roughly 500px in proportional sans-serif fonts). At 800px,
   * the SVG only needs a ~1.6× downscale into a 500px column — text drops to
   * ~63% of native size, which stays readable on standard displays. Beyond
   * 800px the downscale grows past 1.6× and text legibility falls off
   * sharply.
   *
   * The aspect-ratio check alone misses this case because a 1200×800 SVG
   * has a "good" 1.5:1 ratio but is still unreadable when scaled into a
   * 500px column. Pass `false` to skip (e.g. for hero banners whose
   * horizontal scrolling is acceptable), or raise the threshold for sites
   * with wider content columns.
   */
  maxWidth?: number | false
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
 *
 * Includes a WCAG 2.2 AA contrast scan for text elements. The scan is skipped
 * for raster validation paths because pixel-level OCR is unreliable; for SVGs
 * we can resolve the actual fill/background of every text node.
 */
export function validateSvg(
  svg: string,
  filePath?: string,
  options: SvgValidateOptions = {},
): SvgValidationResult {
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

  if (options.aspectRatio !== false) {
    const ratioConfig = options.aspectRatio ?? { target: 4 / 3, tolerance: 2.5 }
    const aspectIssue = checkAspectRatio(svg, ratioConfig)
    if (aspectIssue) issues.push(aspectIssue)
  }

  if (options.maxWidth !== false) {
    const maxWidth = options.maxWidth ?? 800
    const widthIssue = checkViewBoxWidth(svg, maxWidth)
    if (widthIssue) issues.push(widthIssue)
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

  if (options.checkContrast !== false) {
    const background = options.backgroundOverride ?? defaultBackgroundForFile(filePath)
    // Mermaid emits its primary text fill via a global CSS rule that our
    // resolver doesn't always match (e.g. `#scope .label text`). Seed the
    // walker with diagramkit's known defaults per variant so unset text fills
    // don't fall back to plain black/white and produce false positives.
    const defaultTextColor = background === '#111111' ? '#e5e5e5' : '#333333'
    const contrastIssues = findSvgContrastIssues(svg, {
      defaultBackground: background,
      defaultTextColor,
    })
    if (contrastIssues.length > 0) {
      // Group issues by (textColor, backgroundColor) so a thousand mermaid tspans
      // with identical styling collapse into one actionable warning instead of
      // flooding the report.
      const grouped = new Map<
        string,
        { count: number; samples: string[]; ratio: number; required: number }
      >()
      for (const issue of contrastIssues) {
        const key = `${issue.textColor}|${issue.backgroundColor}|${issue.required}`
        const existing = grouped.get(key)
        if (existing) {
          existing.count++
          if (existing.samples.length < 3) existing.samples.push(issue.textSample)
        } else {
          grouped.set(key, {
            count: 1,
            samples: [issue.textSample],
            ratio: issue.ratio,
            required: issue.required,
          })
        }
      }

      for (const [key, group] of grouped) {
        const [textColor, bgColor] = key.split('|')
        const samplesPreview = group.samples.map((s) => `"${s}"`).join(', ')
        issues.push({
          code: 'LOW_CONTRAST_TEXT',
          severity: 'warning',
          message:
            `Text color ${textColor} on ${bgColor} has contrast ratio ${group.ratio.toFixed(2)}:1, ` +
            `below WCAG 2.2 AA threshold of ${group.required}:1 ` +
            `(${group.count} text element${group.count === 1 ? '' : 's'}: ${samplesPreview}` +
            (group.count > group.samples.length ? ', ...' : '') +
            ')',
          suggestion:
            'Use a higher-contrast color from the diagramkit mid-tone palette ' +
            '(e.g. #4C78A8/#fff for primary, #2d2d2d/#e5e5e5 for dark mode actors). ' +
            'Required ratios: ' +
            `${WCAG_AA_NORMAL}:1 for normal text, ${WCAG_AA_LARGE}:1 for large text (>=18px / 14px bold). ` +
            'Avoid white-on-pastel and grey-on-grey combinations.',
        })
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error')
  return { file: filePath, valid: !hasErrors, issues }
}

/**
 * Validate an SVG file on disk. Reads the file and delegates to validateSvg().
 */
export function validateSvgFile(
  filePath: string,
  options: SvgValidateOptions = {},
): SvgValidationResult {
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
  return validateSvg(content, filePath, options)
}

/**
 * Validate all SVG files in a directory (non-recursive by default).
 */
export function validateSvgDirectory(
  dir: string,
  options: { recursive?: boolean } & SvgValidateOptions = {},
): SvgValidationResult[] {
  const { recursive, ...validateOptions } = options
  const results: SvgValidationResult[] = []

  function walk(d: string) {
    if (!existsSync(d)) return
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory() && recursive) {
        walk(full)
      } else if (entry.name.endsWith('.svg')) {
        results.push(validateSvgFile(full, validateOptions))
      }
    }
  }

  walk(dir)
  return results
}

/**
 * Detect SVGs whose aspect ratio is extreme enough to harm readability when
 * embedded at typical doc widths (~650–800px). Mermaid-Sonar reports that a
 * 1302px-wide diagram squeezed into an 800px viewport loses ~39% of text
 * legibility — we surface a warning so the agent loop can flip / split / swap
 * engine before that happens.
 */
function checkAspectRatio(
  svg: string,
  config: { target: number; tolerance: number },
): SvgIssue | null {
  if (!Number.isFinite(config.target) || config.target <= 0) return null
  if (!Number.isFinite(config.tolerance) || config.tolerance <= 1) return null

  const ratio = parseSvgViewBoxRatio(svg)
  if (ratio === null) return null

  const lower = config.target / config.tolerance
  const upper = config.target * config.tolerance
  if (ratio >= lower && ratio <= upper) return null

  const formatRatio = (r: number): string =>
    r >= 1 ? `${r.toFixed(2)}:1` : `1:${(1 / r).toFixed(2)}`

  return {
    code: 'ASPECT_RATIO_EXTREME',
    severity: 'warning',
    message:
      `SVG aspect ratio ${formatRatio(ratio)} is outside the readable band ` +
      `[${formatRatio(lower)}, ${formatRatio(upper)}] (target ${formatRatio(config.target)}). ` +
      `Diagrams that overflow typical doc widths (~650–800px) lose ~39% text legibility when scaled down.`,
    suggestion:
      'Mermaid: flip the directive (`flowchart LR` ↔ `flowchart TB`) or enable `mermaidLayout: { mode: "auto" }` in diagramkit.config.json5. ' +
      'Any engine: split into multiple smaller diagrams (overview + detail) or reduce node count (target ≤50 nodes dense / ≤100 sparse, ≤8 parallel branches, ≤100 connections). ' +
      'If still extreme, switch engine: drawio for icon/precision-heavy layouts, graphviz for pure DAGs.',
  }
}

/**
 * Detect SVGs whose absolute intrinsic width is too large to render legibly
 * inside a typical content column. Pagesmith-style sites set
 * `--doc-content-max-width: 100ch`, which resolves to ~500px in common
 * proportional sans-serif fonts, so we calibrate against that baseline.
 *
 * The aspect-ratio check alone cannot catch these because a near-square
 * 1200×800 SVG sits at a "fine" 1.5:1 ratio but still scales by ~2.4× at a
 * 500 px column, dropping text to ~42% of native size — well below the
 * ~60% threshold where readability collapses on standard displays.
 *
 * The default threshold (800 px) keeps the worst-case downscale at ~1.6×
 * for a 500 px column (text stays ~63% of native), which the human visual
 * system tolerates. Sites with wider columns can raise the threshold via
 * `--max-width <px>` (CLI) or `maxWidth: <number>` (API).
 */
function checkViewBoxWidth(svg: string, maxWidth: number): SvgIssue | null {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return null
  const dims = parseSvgViewBoxDimensions(svg)
  if (!dims) return null
  if (dims.width <= maxWidth) return null

  // Calibrated against a Pagesmith-style ~500 px content column. Sites with
  // wider columns should raise `maxWidth` rather than disabling the check.
  const docWidth = 500
  const downscale = dims.width / docWidth
  const textPct = 100 / downscale

  return {
    code: 'SVG_VIEWBOX_TOO_WIDE',
    severity: 'warning',
    message:
      `SVG viewBox width ${dims.width.toFixed(0)}px exceeds the readable threshold (${maxWidth}px). ` +
      `At a typical ~${docWidth}px content column the browser will downscale this diagram by ~${downscale.toFixed(1)}×, ` +
      `dropping text to ~${textPct.toFixed(0)}% of native size and harming legibility. ` +
      `The aspect-ratio check passes because absolute width is the issue, not the ratio.`,
    suggestion:
      'Mermaid: flip `flowchart LR` → `flowchart TB`, set inner subgraphs to `direction TB`, or enable `mermaidLayout: { mode: "auto" }`. ' +
      'Any engine: split into overview + detail diagrams, or reduce horizontal fan-out (≤8 parallel branches per node). ' +
      'Drawio: reflow `<mxGeometry>` rows to columns. ' +
      'Graphviz: add `ratio="0.75"` to the `graph [...]` block or flip `rankdir`. ' +
      'If the diagram is intentionally wide (e.g. a long pipeline banner), pass `--no-max-width` (CLI) or `maxWidth: false` (API) to suppress, or raise the threshold with `--max-width <px>` for sites with wider columns.',
  }
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
