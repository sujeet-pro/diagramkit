/**
 * WCAG 2.2 contrast ratio utilities and a lightweight SVG text-contrast scanner.
 *
 * The scanner is intentionally regex/stack based — pulling in a real XML parser would
 * inflate the install size and the renderer already produces well-formed SVG. The goal
 * is to flag clearly-failing combinations (e.g. light grey text on a light background),
 * not to perfectly model every SVG corner case.
 */

import { hexToRgb, hslToHex } from './convert'
import { relativeLuminance } from './luminance'

/** Contrast ratio required for normal-size text under WCAG 2.2 AA. */
export const WCAG_AA_NORMAL = 4.5
/** Contrast ratio required for large text (>= 18pt or 14pt bold) under WCAG 2.2 AA. */
export const WCAG_AA_LARGE = 3.0
/** Contrast ratio required for non-text UI components under WCAG 2.2 AA (1.4.11). */
export const WCAG_AA_NON_TEXT = 3.0

/**
 * Compute the WCAG 2.x contrast ratio between two RGB colors.
 * Returns a value in [1, 21]. 1 = identical, 21 = black/white.
 */
export function contrastRatio(
  fg: readonly [number, number, number],
  bg: readonly [number, number, number],
): number {
  const lf = relativeLuminance(fg[0], fg[1], fg[2])
  const lb = relativeLuminance(bg[0], bg[1], bg[2])
  const [light, dark] = lf > lb ? [lf, lb] : [lb, lf]
  return (light + 0.05) / (dark + 0.05)
}

/** Convenience wrapper: takes hex strings, returns the ratio or `null` if either is unparseable. */
export function contrastRatioHex(fgHex: string, bgHex: string): number | null {
  const fg = hexToRgb(fgHex)
  const bg = hexToRgb(bgHex)
  if (!fg || !bg) return null
  return contrastRatio(fg, bg)
}

export interface SvgContrastIssue {
  /** First ~40 chars of the text content for human identification. */
  textSample: string
  /** Resolved foreground color in `#rrggbb` form. */
  textColor: string
  /** Resolved background color in `#rrggbb` form. */
  backgroundColor: string
  /** Computed contrast ratio (rounded to 2 decimals). */
  ratio: number
  /** Threshold this combination failed (4.5 for normal, 3 for large). */
  required: number
  /** True when the text qualifies as "large text" per WCAG (font-size derived). */
  isLargeText: boolean
}

export interface SvgContrastOptions {
  /** Effective page/canvas background when no explicit ancestor fill is present. */
  defaultBackground: string
  /** Default text color when no explicit `fill` is set. Mermaid normally emits one. */
  defaultTextColor?: string
  /** Override the AA threshold for normal text (default 4.5). */
  aaNormal?: number
  /** Override the AA threshold for large text (default 3.0). */
  aaLarge?: number
  /** When true, fonts >= this px count as "large" (default 18). */
  largeFontPx?: number
  /** When true, bold fonts >= this px count as "large" (default 14). */
  largeBoldFontPx?: number
}

/* ── Internal: tag tokenization ── */

type Tag =
  | { kind: 'open'; name: string; attrs: Record<string, string>; selfClosing: boolean; raw: string }
  | { kind: 'close'; name: string }
  | { kind: 'text'; value: string }

const TAG_RE = /<\/?([A-Za-z][\w-]*)([^>]*)>|<!--[\s\S]*?-->/g
const ATTR_RE = /([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  ATTR_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = ATTR_RE.exec(raw)) !== null) {
    out[m[1]!] = m[3] ?? m[4] ?? ''
  }
  return out
}

function tokenize(svg: string): Tag[] {
  const out: Tag[] = []
  let lastIndex = 0
  TAG_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TAG_RE.exec(svg)) !== null) {
    if (m.index > lastIndex) {
      const text = svg.slice(lastIndex, m.index)
      if (text.trim()) out.push({ kind: 'text', value: text })
    }
    const raw = m[0]
    if (raw.startsWith('<!--')) {
      lastIndex = TAG_RE.lastIndex
      continue
    }
    const name = m[1]!
    const tail = m[2] ?? ''
    if (raw.startsWith('</')) {
      out.push({ kind: 'close', name })
    } else {
      const selfClosing = tail.trimEnd().endsWith('/')
      out.push({ kind: 'open', name, attrs: parseAttrs(tail), selfClosing, raw })
    }
    lastIndex = TAG_RE.lastIndex
  }
  return out
}

/* ── Internal: CSS class → declarations parser ── */

interface CssRule {
  fill?: string
  color?: string
}

interface ParsedCss {
  /** Map of class name → fill/color when the selector's *final compound* is exactly that class. */
  classes: Map<string, CssRule>
  /**
   * Map keyed by `${ancestorClass}>${tag}` → fill, capturing rules like
   * `.cluster rect { fill: #1e1e1e }` so we can resolve a rect's effective fill
   * when one of its ancestors carries `ancestorClass`.
   */
  tagInClass: Map<string, CssRule>
  /** Plain tag-only fill defaults (e.g. `text { fill: #333 }`). */
  tags: Map<string, CssRule>
}

/**
 * Parse `<style>...</style>` blocks. Mermaid emits scoped selectors like
 * `#abc-light .cluster rect { fill: ... }`. We strip the `#scope` prefix and
 * record three kinds of mappings so contrast resolution stays accurate:
 *
 * 1. `.foo { fill: X }` → classes["foo"]
 * 2. `.foo bar { fill: X }` → tagInClass["foo>bar"]
 * 3. `bar { fill: X }` → tags["bar"]
 *
 * Anything more elaborate (combinator chains, attribute selectors, pseudo
 * classes) is intentionally skipped — those rarely change diagram contrast and
 * trying to interpret them with regexes leads to false positives.
 */
function parseStyleClasses(svg: string): ParsedCss {
  const classes = new Map<string, CssRule>()
  const tagInClass = new Map<string, CssRule>()
  const tags = new Map<string, CssRule>()
  const styleBlocks = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/g) ?? []
  for (const block of styleBlocks) {
    // Mermaid serializes `>` and `<` inside <style> as HTML entities (&gt;,
    // &lt;) when they appear in selectors like `text.actor > tspan`. Unescape
    // common ones so the selector parser sees real CSS combinators.
    const inner = block
      .replace(/^<style[^>]*>/, '')
      .replace(/<\/style>$/, '')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g
    let m: RegExpExecArray | null
    while ((m = ruleRe.exec(inner)) !== null) {
      const selectorList = m[1]!
      const body = m[2]!
      const decls: CssRule = {}
      for (const decl of body.split(';')) {
        const [propRaw, valRaw] = decl.split(':')
        if (!propRaw || !valRaw) continue
        const prop = propRaw.trim().toLowerCase()
        const val = valRaw.replace(/!important/i, '').trim()
        if (prop === 'fill') decls.fill = val
        else if (prop === 'color') decls.color = val
      }
      if (decls.fill === undefined && decls.color === undefined) continue
      for (const selector of selectorList.split(',')) {
        // Strip leading `#scope ` (Mermaid scopes everything by graph id).
        const stripped = selector.replace(/^\s*#[A-Za-z_][\w-]*\s+/, '').trim()
        // Treat both whitespace and direct-child `>` as compound separators —
        // for contrast resolution we don't need to distinguish them.
        const parts = stripped
          .split(/\s*>\s*|\s+/)
          .map((p) => p.trim())
          .filter(Boolean)
        if (parts.length === 0) continue

        function compoundClasses(part: string): string[] {
          const out: string[] = []
          for (const m of part.matchAll(/\.([A-Za-z_-][\w-]*)/g)) out.push(m[1]!)
          return out
        }
        function compoundTag(part: string): string | null {
          const m = part.match(/^([a-zA-Z][\w-]*)/)
          return m ? m[1]!.toLowerCase() : null
        }
        // Reject parts with attribute selectors, pseudo classes, or ids — too
        // ambiguous to resolve reliably with our regex pipeline.
        const messy = parts.some((p) => /[[\]:#]/.test(p))
        if (messy) continue

        const final = parts[parts.length - 1]!
        const finalClasses = compoundClasses(final)
        const finalTag = compoundTag(final)

        // (a) Pure class selector `.foo` (or compound `.foo.bar`) — apply to
        //     any element with all of those classes; we approximate by keying
        //     each class to the same rule (hits when any one matches).
        if (!finalTag && finalClasses.length > 0) {
          for (const cls of finalClasses) {
            classes.set(cls, { ...classes.get(cls), ...decls })
          }
          continue
        }

        // (b) Tag-only selector `bar` at the very end with no preceding parts.
        if (finalTag && finalClasses.length === 0 && parts.length === 1) {
          tags.set(finalTag, { ...tags.get(finalTag), ...decls })
          continue
        }

        // (c) `tag.class` final compound (e.g. `text.actor`) at end of chain.
        //     Treat as "any element of this tag with this class".
        if (finalTag && finalClasses.length > 0) {
          for (const cls of finalClasses) {
            const key = `${cls}>${finalTag}`
            tagInClass.set(key, { ...tagInClass.get(key), ...decls })
          }
          continue
        }

        // (d) Tag-only final compound with EXACTLY ONE ancestor compound that
        //     contains at least one class (e.g. `.layer rect` or `text.actor
        //     tspan`). The ancestor *may* also have a tag — we only need its
        //     classes to key the rule. We deliberately skip multi-ancestor
        //     chains like `.icon-shape .label rect`: the stack model can't
        //     enforce that *both* ancestors are present, so we'd over-match.
        if (finalTag && finalClasses.length === 0 && parts.length === 2) {
          const ancestorClasses = compoundClasses(parts[0]!)
          if (ancestorClasses.length > 0) {
            for (const cls of ancestorClasses) {
              const key = `${cls}>${finalTag}`
              tagInClass.set(key, { ...tagInClass.get(key), ...decls })
            }
          }
          continue
        }
      }
    }
  }
  return { classes, tagInClass, tags }
}

/* ── Internal: color resolution ── */

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const RGB_RE = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/i
const HSL_RE = /^hsla?\(\s*(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%\s*,?\s*(\d+(?:\.\d+)?)%/i

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
}

/** Normalize any supported color string to a 6-digit hex, or `null` if unsupported. */
function normalizeColor(input: string | undefined): string | null {
  if (!input) return null
  const value = input.trim().toLowerCase()
  if (
    value === 'none' ||
    value === 'transparent' ||
    value === 'currentcolor' ||
    value === 'inherit'
  )
    return null
  if (HEX_RE.test(value)) {
    if (value.length === 4) {
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    }
    return value
  }
  const rgb = value.match(RGB_RE)
  if (rgb) {
    const r = Math.min(255, Math.round(parseFloat(rgb[1]!)))
    const g = Math.min(255, Math.round(parseFloat(rgb[2]!)))
    const b = Math.min(255, Math.round(parseFloat(rgb[3]!)))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
  const hsl = value.match(HSL_RE)
  if (hsl) {
    const h = (parseFloat(hsl[1]!) % 360) / 360
    const s = parseFloat(hsl[2]!) / 100
    const l = parseFloat(hsl[3]!) / 100
    return hslToHex(h, s, l)
  }
  if (NAMED_COLORS[value]) return NAMED_COLORS[value]!
  return null
}

function readStyleProp(style: string | undefined, prop: string): string | undefined {
  if (!style) return undefined
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i')
  const m = style.match(re)
  return m
    ? m[1]!
        .trim()
        .replace(/!important/i, '')
        .trim()
    : undefined
}

type FillSource = 'inline' | 'attr' | 'class' | 'tagInClass' | 'tag'

interface ResolvedFill {
  color: string | null
  source: FillSource | null
}

/**
 * Resolve the effective fill for an element given:
 * - inline `style="fill:..."`
 * - attribute `fill="..."`
 * - any class-only CSS rule that targets a class on this element
 * - any tag-only CSS rule for this element's tag (only when no class hit)
 * - any `.ancestorClass tag` rule when one of `ancestorClasses` matches
 *
 * Returns the resolved color and the source so callers can distinguish
 * "explicit" fills (inline/attr/class) from "implicit" fills derived from
 * ancestor-tag CSS rules. The contrast walker uses that distinction to avoid
 * letting a generic descendant rule (e.g. `.node rect { fill: #ECECFF }`)
 * override a more specific sibling fill (e.g. a stadium-shape `<path>` whose
 * own inline style sets the visible node color).
 */
function resolveFill(
  tag: string,
  attrs: Record<string, string>,
  parsed: ParsedCss,
  ancestorClasses: ReadonlySet<string>,
): ResolvedFill {
  const inlineStyleFill = readStyleProp(attrs.style, 'fill')
  if (inlineStyleFill !== undefined) {
    return { color: normalizeColor(inlineStyleFill), source: 'inline' }
  }
  if (attrs.fill !== undefined) return { color: normalizeColor(attrs.fill), source: 'attr' }
  const ownClasses = attrs.class ? attrs.class.split(/\s+/).filter(Boolean) : []
  for (const cls of ownClasses) {
    const rule = parsed.classes.get(cls)
    if (rule?.fill) {
      const c = normalizeColor(rule.fill)
      if (c) return { color: c, source: 'class' }
    }
  }
  const tagLower = tag.toLowerCase()
  const ancestorList = [...ancestorClasses]
  for (let i = ancestorList.length - 1; i >= 0; i--) {
    const ancestor = ancestorList[i]!
    const rule = parsed.tagInClass.get(`${ancestor}>${tagLower}`)
    if (rule?.fill) {
      const c = normalizeColor(rule.fill)
      if (c) return { color: c, source: 'tagInClass' }
    }
  }
  const tagRule = parsed.tags.get(tagLower)
  if (tagRule?.fill) {
    const c = normalizeColor(tagRule.fill)
    if (c) return { color: c, source: 'tag' }
  }
  return { color: null, source: null }
}

function resolveFontSize(attrs: Record<string, string>): number | null {
  const inline = readStyleProp(attrs.style, 'font-size') ?? attrs['font-size']
  if (!inline) return null
  const m = inline.match(/(\d+(?:\.\d+)?)\s*(px|pt|em|rem)?/i)
  if (!m) return null
  const value = parseFloat(m[1]!)
  const unit = (m[2] ?? 'px').toLowerCase()
  switch (unit) {
    case 'px':
      return value
    case 'pt':
      return value * (96 / 72)
    case 'em':
    case 'rem':
      return value * 16
    default:
      return value
  }
}

function resolveFontWeight(attrs: Record<string, string>): number | null {
  const inline = readStyleProp(attrs.style, 'font-weight') ?? attrs['font-weight']
  if (!inline) return null
  if (/^bold(er)?$/i.test(inline)) return 700
  const n = parseInt(inline, 10)
  return Number.isFinite(n) ? n : null
}

function isLarge(
  fontSize: number | null,
  fontWeight: number | null,
  opts: Required<SvgContrastOptions>,
): boolean {
  const size = fontSize ?? 16
  const isBold = (fontWeight ?? 400) >= 700
  if (isBold && size >= opts.largeBoldFontPx) return true
  if (size >= opts.largeFontPx) return true
  return false
}

/**
 * Collect text content that is a *direct* child of the element at `startIdx`
 * — text inside nested tags (e.g. an inner `<tspan>`) is excluded so each
 * leaf can be evaluated against its own resolved fill.
 */
function collectDirectText(tokens: Tag[], startIdx: number, endIdx: number): string {
  const parts: string[] = []
  let depth = 0
  for (let i = startIdx + 1; i < endIdx; i++) {
    const t = tokens[i]
    if (!t) continue
    if (t.kind === 'open' && !t.selfClosing) depth++
    else if (t.kind === 'close') depth--
    else if (t.kind === 'text' && depth === 0) parts.push(t.value)
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/* ── Public scanner ── */

/**
 * Scan an SVG for text elements whose computed contrast against their effective
 * background fails WCAG 2.2 AA. Returns one issue per failing text node.
 *
 * The scanner walks tags as a stack and keeps a `currentBackground` resolved from
 * the nearest ancestor that has a non-transparent fill (rect, g, or path with a
 * solid fill). When no ancestor sets a fill, `defaultBackground` is used.
 */
export function findSvgContrastIssues(
  svg: string,
  options: SvgContrastOptions,
): SvgContrastIssue[] {
  const opts: Required<SvgContrastOptions> = {
    defaultBackground: options.defaultBackground,
    defaultTextColor: options.defaultTextColor ?? '#000000',
    aaNormal: options.aaNormal ?? WCAG_AA_NORMAL,
    aaLarge: options.aaLarge ?? WCAG_AA_LARGE,
    largeFontPx: options.largeFontPx ?? 18,
    largeBoldFontPx: options.largeBoldFontPx ?? 14,
  }

  const parsed = parseStyleClasses(svg)
  const tokens = tokenize(svg)
  const issues: SvgContrastIssue[] = []
  const dedupe = new Set<string>()

  // Each open container (<svg>, <g>, ...) pushes a frame. Shapes (rect, path,
  // circle, ellipse, polygon) inside the same container with an opaque fill
  // update that frame's `localBg`, so any sibling <text> inside the container
  // computes against the most recent shape fill. This matches the Mermaid /
  // Graphviz emission pattern of `<g><rect fill=.../><text fill=.../></g>`.
  interface Frame {
    localBg: string
    /** True when localBg was set by an explicit own-fill (inline/attr/class). */
    localBgExplicit: boolean
    inheritedText: string | null
    fontSize: number | null
    fontWeight: number | null
    /** All ancestor classes accumulated along the stack — used for `.foo bar` CSS rules. */
    ancestorClasses: Set<string>
  }

  const initialBg = normalizeColor(opts.defaultBackground) ?? '#ffffff'
  const initialText = normalizeColor(opts.defaultTextColor)
  const stack: Frame[] = [
    {
      localBg: initialBg,
      localBgExplicit: false,
      inheritedText: initialText,
      fontSize: null,
      fontWeight: null,
      ancestorClasses: new Set(),
    },
  ]
  const top = () => stack[stack.length - 1]!

  const SIBLING_BG_TAGS = new Set(['rect', 'path', 'circle', 'ellipse', 'polygon'])
  const CONTAINER_TAGS = new Set([
    'svg',
    'g',
    'a',
    'symbol',
    'defs',
    'pattern',
    'mask',
    'foreignObject',
  ])

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (t.kind === 'open') {
      const parent = top()
      const ownClasses = t.attrs.class ? t.attrs.class.split(/\s+/).filter(Boolean) : []
      // For descendant CSS resolution we need the parent's ancestor set + this
      // element's own classes (so a rect inside <g class="cluster"> picks up
      // `.cluster rect { fill }`).
      const ancestorClasses = new Set(parent.ancestorClasses)
      for (const c of ownClasses) ancestorClasses.add(c)

      const ownFillResolved = resolveFill(t.name, t.attrs, parsed, ancestorClasses)
      const ownFill = ownFillResolved.color
      const ownFillExplicit =
        ownFillResolved.source === 'inline' ||
        ownFillResolved.source === 'attr' ||
        ownFillResolved.source === 'class'
      const ownFontSize = resolveFontSize(t.attrs)
      const ownFontWeight = resolveFontWeight(t.attrs)

      // Sibling-shape: update the *current* frame's localBg so subsequent text
      // siblings (within the same container) compute against this shape's fill.
      // An *explicit* own-fill always wins. An *implicit* fill (derived from a
      // descendant CSS rule like `.node rect { fill: ... }`) only counts when
      // we haven't already locked in a more-specific sibling fill — that lets
      // a `<path style="fill: ...">` (the visible node body) keep its color
      // even when an inner placeholder `<rect>` would otherwise inherit a
      // generic `.node rect` rule.
      if (SIBLING_BG_TAGS.has(t.name) && ownFill) {
        if (ownFillExplicit) {
          parent.localBg = ownFill
          parent.localBgExplicit = true
        } else if (!parent.localBgExplicit) {
          parent.localBg = ownFill
        }
      }

      // Evaluate contrast at every element that actually paints visible glyphs:
      //   <text> with direct text content, OR
      //   <tspan> with direct text content.
      //
      // Mermaid frequently wraps the visible string in `<tspan>` and styles it
      // via `text.actor > tspan { fill: ... }` — evaluating only at <text>
      // would resolve the wrong color in that case.
      if ((t.name === 'text' || t.name === 'tspan') && !t.selfClosing) {
        const closeIdx = findClosingTag(tokens, i, t.name)
        const directText = collectDirectText(tokens, i, closeIdx)
        if (directText) {
          const textColor = ownFill ?? parent.inheritedText
          const effectiveSize = ownFontSize ?? parent.fontSize
          const effectiveWeight = ownFontWeight ?? parent.fontWeight
          const bgColor = parent.localBg
          const ratio = textColor ? contrastRatioHex(textColor, bgColor) : null
          if (textColor && ratio !== null) {
            const large = isLarge(effectiveSize, effectiveWeight, opts)
            const required = large ? opts.aaLarge : opts.aaNormal
            if (ratio + 1e-6 < required) {
              const key = `${textColor}|${bgColor}|${directText}`
              if (!dedupe.has(key)) {
                dedupe.add(key)
                issues.push({
                  textSample: directText.length > 40 ? directText.slice(0, 37) + '...' : directText,
                  textColor,
                  backgroundColor: bgColor,
                  ratio: Math.round(ratio * 100) / 100,
                  required,
                  isLargeText: large,
                })
              }
            }
          }
        }
      }

      if (!t.selfClosing) {
        const isContainer = CONTAINER_TAGS.has(t.name)
        const containerHasExplicitFill = isContainer && ownFill && ownFillExplicit
        const newFrame: Frame = {
          // Container with an own fill establishes its own bg; otherwise inherit.
          localBg: containerHasExplicitFill ? ownFill : parent.localBg,
          localBgExplicit: containerHasExplicitFill ? true : false,
          inheritedText:
            t.name === 'text' || t.name === 'tspan'
              ? (ownFill ?? parent.inheritedText)
              : containerHasExplicitFill
                ? ownFill
                : parent.inheritedText,
          fontSize: ownFontSize ?? parent.fontSize,
          fontWeight: ownFontWeight ?? parent.fontWeight,
          ancestorClasses,
        }
        stack.push(newFrame)
      }
    } else if (t.kind === 'close') {
      if (stack.length > 1) stack.pop()
    }
  }

  return issues
}

function findClosingTag(tokens: Tag[], startIdx: number, name: string): number {
  let depth = 1
  for (let i = startIdx + 1; i < tokens.length; i++) {
    const t = tokens[i]!
    if (t.kind === 'open' && t.name === name && !t.selfClosing) depth++
    else if (t.kind === 'close' && t.name === name) {
      depth--
      if (depth === 0) return i
    }
  }
  return tokens.length
}

/**
 * Pick a sensible default page/canvas background for an SVG given its filename.
 * Filenames produced by diagramkit always carry a `-light` / `-dark` suffix.
 *
 * Returns `#ffffff` for unknown variants so contrast checks default to a strict
 * (light-mode) baseline rather than silently passing.
 */
export function defaultBackgroundForFile(filePath: string | undefined): string {
  if (!filePath) return '#ffffff'
  const lower = filePath.toLowerCase()
  if (lower.includes('-dark.svg') || lower.endsWith('-dark.svg')) return '#111111'
  return '#ffffff'
}
