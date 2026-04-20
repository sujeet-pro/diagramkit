/**
 * Pure helpers for the mermaid aspect-ratio rebalance pipeline.
 *
 * The renderer in `src/render-engines.ts` uses these to:
 *   1. measure the rendered SVG aspect ratio,
 *   2. detect whether the source is a flowchart that can be flipped,
 *   3. rewrite the source for a flip-direction or ELK retry,
 *   4. pick the candidate whose ratio is closest to the configured target.
 *
 * These functions are deliberately pure (no I/O, no browser) so they can be
 * unit-tested without a Playwright pool.
 */

export type FlowchartDirection = 'TB' | 'TD' | 'BT' | 'LR' | 'RL'

export interface FlowchartDirective {
  /** The directive keyword used in the source (`flowchart` or `graph`). */
  kind: 'flowchart' | 'graph'
  /** The declared direction. */
  dir: FlowchartDirection
  /** The original directive line, verbatim (without trailing newline). */
  raw: string
  /** Character index where the directive line starts inside the source. */
  index: number
  /** Character index where the directive line ends (exclusive of any trailing `\n`). */
  endIndex: number
}

const FLOWCHART_DIRECTIVE_RE = /^(flowchart|graph)\s+(TB|TD|BT|LR|RL)\b/i

/**
 * Parse the rendered SVG and return its width/height ratio, or `null` if it
 * cannot be determined. Prefers `viewBox` (which mermaid always emits) and
 * falls back to numeric `width`/`height` attributes.
 */
export function parseSvgViewBoxRatio(svg: string): number | null {
  const dims = parseSvgViewBoxDimensions(svg)
  if (!dims) return null
  return dims.width / dims.height
}

/**
 * Extract the rendered width × height of an SVG (in user units, typically pixels).
 * Prefers the `viewBox` attribute (which is the *intrinsic* canvas size used by
 * the renderer) and falls back to numeric `width="…"` / `height="…"` attributes.
 *
 * Used by both the aspect-ratio check (which divides them) and the absolute-width
 * check (which compares `width` against a doc-column threshold). Splitting the
 * helper out keeps the two checks consistent on what counts as the "rendered"
 * size — they can never disagree on which attribute they parsed.
 */
export function parseSvgViewBoxDimensions(svg: string): { width: number; height: number } | null {
  if (!svg) return null
  const tagMatch = svg.match(/<svg[^>]*>/)
  if (!tagMatch) return null
  const tag = tagMatch[0]

  const vb = tag.match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/)
  if (vb) {
    const w = Number.parseFloat(vb[1]!)
    const h = Number.parseFloat(vb[2]!)
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: w, height: h }
    }
  }

  const wMatch = tag.match(/width="(\d+(?:\.\d+)?)\s*(?:px)?"/)
  const hMatch = tag.match(/height="(\d+(?:\.\d+)?)\s*(?:px)?"/)
  if (wMatch && hMatch) {
    const w = Number.parseFloat(wMatch[1]!)
    const h = Number.parseFloat(hMatch[1]!)
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: w, height: h }
    }
  }
  return null
}

/**
 * Locate the first `flowchart`/`graph` directive line in a mermaid source.
 * Skips leading whitespace, comments (`%%`), and `%%{init}%%` configuration
 * blocks. Returns `null` for non-flowchart diagram types (sequence, gantt,
 * journey, state, class, ER, pie, timeline, mindmap, sankey, quadrantChart,
 * c4Context, requirementDiagram, gitGraph, etc.) where flipping the direction
 * does not make sense.
 */
export function getFlowchartDirective(source: string): FlowchartDirective | null {
  if (!source) return null
  let cursor = 0
  while (cursor < source.length) {
    // Find end of current line
    const nl = source.indexOf('\n', cursor)
    const endOfLine = nl === -1 ? source.length : nl
    const lineStart = cursor
    const line = source.slice(lineStart, endOfLine)
    const trimmed = line.trim()

    // Skip blank lines and comments. A `%%{...}%%` directive is also a comment line
    // for our purposes — the diagram type marker is what we are looking for.
    if (trimmed.length === 0 || trimmed.startsWith('%%')) {
      cursor = endOfLine + 1
      continue
    }

    const match = trimmed.match(FLOWCHART_DIRECTIVE_RE)
    if (!match) return null

    const kind = match[1]!.toLowerCase() as 'flowchart' | 'graph'
    const dir = match[2]!.toUpperCase() as FlowchartDirection
    return { kind, dir, raw: line, index: lineStart, endIndex: endOfLine }
  }
  return null
}

/**
 * Return a copy of the mermaid source with the flowchart direction swapped:
 * `LR ↔ TB`, `RL ↔ BT`, and `TD → BT` (treating `TD` as the alias of `TB`).
 *
 * Returns `null` when the source is not an eligible flowchart/graph diagram.
 */
export function flipFlowchartDirection(source: string): string | null {
  const directive = getFlowchartDirective(source)
  if (!directive) return null

  const flipped = flipDirection(directive.dir)
  // Preserve the original whitespace inside the directive line by replacing only
  // the direction token at the end of the matched expression.
  const replaced = directive.raw.replace(new RegExp(`\\b${directive.dir}\\b`, 'i'), flipped)
  return source.slice(0, directive.index) + replaced + source.slice(directive.endIndex)
}

function flipDirection(dir: FlowchartDirection): FlowchartDirection {
  switch (dir) {
    case 'LR':
      return 'TB'
    case 'RL':
      return 'BT'
    case 'TB':
      return 'LR'
    case 'TD':
      return 'LR'
    case 'BT':
      return 'RL'
  }
}

/**
 * Prepend a mermaid `%%{init}%%` directive that asks for the ELK layout engine
 * with an `aspectRatio` hint. Idempotent: if the source already declares
 * `layout` or a `flowchart.defaultRenderer` in an `%%{init}%%` block, the
 * source is returned unchanged so that author intent always wins.
 */
export function injectElkInit(source: string, aspectRatio: number): string {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return source

  if (hasExistingLayoutInit(source)) return source

  // Use a compact, single-line init directive so it survives mermaid's parser
  // even when inserted at the very top of the file.
  const init = `%%{init: {"layout":"elk","flowchart":{"defaultRenderer":"elk"},"elk":{"algorithm":"layered","aspectRatio":${aspectRatio}}}}%%\n`
  return init + source
}

const EXISTING_LAYOUT_RE = /%%\{[^}]*("layout"\s*:|"defaultRenderer"\s*:|"elk"\s*:)/

function hasExistingLayoutInit(source: string): boolean {
  return EXISTING_LAYOUT_RE.test(source)
}

export interface RatioCandidate<T = unknown> {
  /** The candidate's measured aspect ratio (width / height). */
  ratio: number
  /** Free-form payload (e.g. the SVG, or an identifier label). */
  payload: T
}

/**
 * Pick whichever candidate has the ratio closest to `target` on a log scale,
 * so that 4:1 and 1:4 are treated as equally far from a 1:1 target. Returns
 * `null` for an empty input.
 */
export function pickClosestToTarget<T>(
  target: number,
  candidates: ReadonlyArray<RatioCandidate<T>>,
): RatioCandidate<T> | null {
  if (candidates.length === 0) return null
  if (!Number.isFinite(target) || target <= 0) return candidates[0]!
  const targetLog = Math.log(target)
  let best = candidates[0]!
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.ratio) || candidate.ratio <= 0) continue
    const distance = Math.abs(Math.log(candidate.ratio) - targetLog)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

/**
 * Return `true` when the measured ratio falls inside `[target/tolerance, target*tolerance]`.
 * `tolerance` must be > 1 (validated upstream by `resolveMermaidLayout`).
 */
export function isRatioInBand(ratio: number, target: number, tolerance: number): boolean {
  if (!Number.isFinite(ratio) || ratio <= 0) return true
  if (!Number.isFinite(target) || target <= 0) return true
  if (!Number.isFinite(tolerance) || tolerance <= 1) return true
  const lower = target / tolerance
  const upper = target * tolerance
  return ratio >= lower && ratio <= upper
}
