import * as csstree from 'css-tree'
import { optimize as svgoOptimize, type Config as SvgoConfig } from 'svgo'
import type { DiagramType } from './types'

/* ── SVGO configuration ── */

/**
 * Curated, accessibility-preserving SVGO configuration.
 *
 * Preserved on purpose (the a11y validator and CSS/`url(#…)` references depend on them):
 * - `viewBox` — `removeViewBox` is not part of `preset-default` in SVGO v3+, so it stays.
 * - `width`/`height` — `removeDimensions` is not enabled.
 * - `role`/`aria-*`/`<title>`/`foreignObject` attributes — `removeUnknownsAndDefaults` is
 *   disabled so it cannot strip attributes it does not recognise.
 * - `<desc>` — `removeDesc` is disabled.
 * - `<style>` rules and every element/attribute `id` — `inlineStyles` and `cleanupIds`
 *   are disabled so ids referenced only from CSS selectors, `aria-labelledby`, or `<use>`
 *   are never minified or dropped. Unused Mermaid rules are pruned by
 *   {@link stripUnusedMermaidCss} instead, which is reference-aware.
 *
 * The configuration is deterministic — it enables no id-prefixing or randomised plugin,
 * so identical input always produces byte-identical output.
 */
function buildSvgoConfig(): SvgoConfig {
  return {
    multipass: false,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            // Never mangle/drop ids — they may be referenced from CSS selectors,
            // aria-labelledby/describedby, or <use> in ways cleanupIds cannot see.
            cleanupIds: false,
            // Keep <style> blocks intact; inlining changes document semantics and
            // can break media queries / pseudo-classes the a11y validator relies on.
            inlineStyles: false,
            // Would strip role/aria-*/foreignObject attributes it does not know about.
            removeUnknownsAndDefaults: false,
            // <desc> is part of the accessibility surface.
            removeDesc: false,
            // Minify the kept CSS but never remove rules by usage detection — the
            // Mermaid pre-pass owns (conservative) rule removal.
            minifyStyles: { usage: false },
          },
        },
      },
    ],
  }
}

/* ── Public API ── */

export interface OptimizeSvgOptions {
  /**
   * Whether to run optimization. When `false` the input is returned unchanged.
   * Defaults to `true`.
   */
  svg?: boolean
  /** Diagram type. The Mermaid CSS-pruning pre-pass runs only for `'mermaid'`. */
  type?: DiagramType
}

/**
 * Optimize a rendered SVG string before it is written to disk.
 *
 * For Mermaid diagrams, unused `<style>` rules are pruned first (Mermaid embeds ~21 KB
 * of boilerplate classes per SVG, most matching nothing), then SVGO runs with the
 * accessibility-preserving configuration in {@link buildSvgoConfig}. Optimization never
 * throws: if SVGO fails on a pathological document the (possibly CSS-pruned) input is
 * returned so a render is never lost to optimization.
 *
 * @returns the optimized SVG string, or the original when `options.svg === false`.
 */
export function optimizeSvg(svg: string, options: OptimizeSvgOptions = {}): string {
  if (options.svg === false) return svg

  // The whole pipeline — including the Mermaid CSS pre-pass — is wrapped so a
  // throw anywhere (e.g. csstree choking on a pathological stylesheet) falls
  // back to the best input available rather than losing the render entirely.
  let input = svg
  try {
    if (options.type === 'mermaid') {
      input = stripUnusedMermaidCss(input)
    }
    return svgoOptimize(input, buildSvgoConfig()).data
  } catch {
    return input
  }
}

/* ── Mermaid <style> pruning ── */

interface SvgTokens {
  tags: Set<string>
  classes: Set<string>
  ids: Set<string>
}

/** Collect every tag name, class token, and id present anywhere in the SVG markup. */
function collectSvgTokens(svg: string): SvgTokens {
  const tags = new Set<string>()
  const classes = new Set<string>()
  const ids = new Set<string>()

  for (const m of svg.matchAll(/<([a-zA-Z][\w:.-]*)/g)) {
    tags.add(m[1]!.toLowerCase())
  }
  for (const m of svg.matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const value = m[1] ?? m[2] ?? ''
    for (const token of value.split(/\s+/)) {
      if (token) classes.add(token)
    }
  }
  for (const m of svg.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const value = m[1] ?? m[2] ?? ''
    if (value) ids.add(value)
  }

  return { tags, classes, ids }
}

interface SelectorEval {
  /**
   * Whether every simple part of the selector is understood well enough to decide
   * absence. When `false` the rule is always kept (we never drop what we cannot
   * confidently evaluate).
   */
  confident: boolean
  classes: string[]
  ids: string[]
  tags: string[]
}

/** Decompose one complex selector into the class/id/tag tokens it requires. */
function evaluateSelector(selector: csstree.Selector): SelectorEval {
  const result: SelectorEval = { confident: true, classes: [], ids: [], tags: [] }

  selector.children.forEach((node) => {
    switch (node.type) {
      case 'ClassSelector':
        result.classes.push(node.name)
        break
      case 'IdSelector':
        result.ids.push(node.name)
        break
      case 'TypeSelector':
        // Universal '*' matches anything → contributes no absence signal.
        if (node.name !== '*') result.tags.push(node.name.toLowerCase())
        break
      case 'Combinator':
        break
      case 'PseudoClassSelector':
        // Functional pseudo-classes (:not(), :is(), :where(), :has(), :nth-*()) can
        // reference other elements — do not attempt to evaluate them.
        if (node.children) result.confident = false
        // Argument-less pseudo-classes (:root, :hover, :first-child) add no signal.
        break
      case 'PseudoElementSelector':
        // ::before/::after etc. still require the compound's element to exist, which
        // the class/id/tag parts already check — no extra signal.
        break
      default:
        // AttributeSelector, NestingSelector, Raw, or anything unexpected → give up.
        result.confident = false
        break
    }
  })

  return result
}

function selectorCouldMatch(evaluated: SelectorEval, tokens: SvgTokens): boolean {
  if (!evaluated.confident) return true
  for (const cls of evaluated.classes) if (!tokens.classes.has(cls)) return false
  for (const id of evaluated.ids) if (!tokens.ids.has(id)) return false
  for (const tag of evaluated.tags) if (!tokens.tags.has(tag)) return false
  return true
}

/**
 * A rule is kept when at least one of its selectors could match an element present in
 * the document, or when its prelude cannot be evaluated as a selector list at all.
 */
function ruleShouldBeKept(rule: csstree.Rule, tokens: SvgTokens): boolean {
  const prelude = rule.prelude
  if (prelude.type !== 'SelectorList') return true

  let sawSelector = false
  let anyCouldMatch = false
  prelude.children.forEach((child) => {
    if (child.type !== 'Selector') {
      anyCouldMatch = true
      return
    }
    sawSelector = true
    if (selectorCouldMatch(evaluateSelector(child), tokens)) anyCouldMatch = true
  })

  return sawSelector ? anyCouldMatch : true
}

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/** Collect `@keyframes` / `@font-face` names referenced by a kept rule's declarations. */
function collectReferences(
  rule: csstree.Rule,
  keyframeRefs: Set<string>,
  fontRefs: Set<string>,
): void {
  const block = rule.block
  if (block.type !== 'Block') return

  block.children.forEach((node) => {
    if (node.type !== 'Declaration') return
    const property = node.property.toLowerCase()
    const value = csstree.generate(node.value)

    if (property === 'animation' || property === 'animation-name') {
      for (const token of value.split(/[\s,]+/)) {
        if (token) keyframeRefs.add(token)
      }
    }
    if (property === 'font-family' || property === 'font') {
      for (const part of value.split(',')) {
        const name = stripQuotes(part)
        if (name) fontRefs.add(name)
      }
    }
  })
}

function keyframesName(atrule: csstree.Atrule): string {
  return atrule.prelude ? csstree.generate(atrule.prelude).trim() : ''
}

function fontFaceFamily(atrule: csstree.Atrule): string | null {
  const block = atrule.block
  if (!block || block.type !== 'Block') return null
  let family: string | null = null
  block.children.forEach((node) => {
    if (node.type === 'Declaration' && node.property.toLowerCase() === 'font-family') {
      family = stripQuotes(csstree.generate(node.value))
    }
  })
  return family
}

const STYLE_RE = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi

interface ParsedStyle {
  open: string
  close: string
  raw: string
  ast: csstree.CssNode | null
}

/**
 * Prune unused CSS rules from a Mermaid SVG's `<style>` blocks.
 *
 * Mermaid embeds a large fixed stylesheet; most rules target classes that a given
 * diagram never renders. This keeps only rules whose selectors could match an element
 * actually present in the SVG. It is deliberately conservative:
 * - a rule is dropped only when every one of its selectors can be confidently evaluated
 *   and none can match (a required class/id/tag is absent from the document);
 * - selectors with attribute selectors, functional pseudo-classes, or unparsable
 *   preludes are always kept;
 * - `@keyframes` / `@font-face` at-rules are kept only when referenced by a kept rule;
 * - all other at-rules (`@media`, `@supports`, …), `:root`, and universal selectors are
 *   kept unconditionally;
 * - if a `<style>` block fails to parse, it is left untouched.
 *
 * @returns the SVG with pruned `<style>` blocks; input returned unchanged if none.
 */
export function stripUnusedMermaidCss(svg: string): string {
  if (!svg.includes('<style')) return svg

  const tokens = collectSvgTokens(svg)

  // Locate and parse every <style> block up front so at-rule references can be resolved
  // across all blocks before any rule is dropped.
  const parsed: ParsedStyle[] = []
  const keepRuleSets: Set<csstree.CssNode>[] = []
  const keyframeRefs = new Set<string>()
  const fontRefs = new Set<string>()

  for (const match of svg.matchAll(STYLE_RE)) {
    let ast: csstree.CssNode | null = null
    try {
      ast = csstree.parse(match[2]!)
    } catch {
      ast = null
    }
    parsed.push({ open: match[1]!, raw: match[2]!, close: match[3]!, ast })

    const keepSet = new Set<csstree.CssNode>()
    if (ast && ast.type === 'StyleSheet') {
      ast.children.forEach((node) => {
        if (node.type === 'Rule' && ruleShouldBeKept(node, tokens)) {
          keepSet.add(node)
          collectReferences(node, keyframeRefs, fontRefs)
        }
      })
    }
    keepRuleSets.push(keepSet)
  }

  if (parsed.length === 0) return svg

  // Rewrite each <style> block. Reuse the pre-computed matches by walking the source
  // again with the same regex so indices line up with `parsed`.
  let index = 0
  return svg.replace(STYLE_RE, () => {
    const entry = parsed[index]!
    const keepSet = keepRuleSets[index]!
    index++

    if (!entry.ast || entry.ast.type !== 'StyleSheet') {
      return `${entry.open}${entry.raw}${entry.close}`
    }

    const ast = entry.ast
    ast.children = ast.children.filter((node) => {
      if (node.type === 'Rule') return keepSet.has(node)
      if (node.type === 'Atrule') {
        const name = node.name.toLowerCase()
        if (name.endsWith('keyframes')) return keyframeRefs.has(keyframesName(node))
        if (name === 'font-face') {
          const family = fontFaceFamily(node)
          return family !== null && fontRefs.has(family)
        }
      }
      // Comments, @media, @supports, and anything else are kept unconditionally.
      return true
    })

    return `${entry.open}${csstree.generate(ast)}${entry.close}`
  })
}
