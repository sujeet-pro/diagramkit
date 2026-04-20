/**
 * Pure (no-IO) helpers for the diagramkit-specific docs validators
 * implemented in `scripts/validate-pagesmith.ts`. Extracted so the
 * link-style and diagram-asset rules are unit-testable without spawning
 * the full `validate:pagesmith` pipeline.
 *
 * Both validators consume markdown SOURCE text (not the rendered HTML).
 * They strip fenced code blocks and inline-code spans before scanning so
 * documentation examples that *show* a forbidden link or asset reference
 * are not mistaken for real ones.
 */

import { extname } from 'node:path'

/**
 * Markdown image / source extensions plus the diagram-source extensions
 * diagramkit owns. Anything in this set is allowed as a non-`.md` link
 * target (a markdown link to a `.svg`, `.json5`, or `.dot` file is fine).
 */
export const SKIP_LINK_EXTENSIONS: ReadonlySet<string> = new Set([
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.ico',
  '.pdf',
  '.json',
  '.json5',
  '.txt',
  '.mermaid',
  '.dot',
  '.gv',
  '.drawio',
])

/** Markdown link regex: matches `[text](url)` and skips images (`![]()`). */
export const MARKDOWN_LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/g

/**
 * Strip fenced code blocks (``` ... ```) and inline-code spans (`...`).
 * Conservative: only matches fences whose opening AND closing backticks
 * sit at column 0. Indented fences (e.g. inside a list item) are left
 * intact, so any markdown link or `<picture>` snippet inside them will
 * still surface to the validator. Combined with the indented-code block
 * Markdown rule that says *every* line must share the indent, this keeps
 * the validator from leaking false negatives.
 */
export function stripCodeForScan(content: string): string {
  return content.replace(/^```[^\n]*\n[\s\S]*?\n```\s*$/gm, '').replace(/`[^`\n]*`/g, '')
}

export interface LinkStyleViolation {
  /** Original link target (URL portion of `[text](url)`). */
  url: string
}

/**
 * Scan markdown source for internal links that violate the
 * `./path/README.md` rule. Pagesmith rewrites `.md` and `.mdx` links to
 * clean URLs at build time (`<basePath>/path` or `<basePath>/path/`
 * depending on `trailingSlash`), but the SOURCE file must always point at
 * a real markdown source on disk so editors and `internalLinksMustBeMarkdown`
 * agree on the source of truth.
 *
 * Skipped (always allowed):
 *   - external links (`http:`, `https:`, `mailto:`, `tel:`, `vscode:`, …)
 *   - protocol-relative (`//cdn.example.com/x`)
 *   - in-page anchors (`#section`)
 *   - any link whose extension is in `SKIP_LINK_EXTENSIONS`
 *   - already-correct `.md` / `.mdx` links (with or without `#anchor`)
 *
 * Flagged:
 *   - `[x](/guide/cli)`     absolute, no extension
 *   - `[x](/guide/cli/)`    absolute, trailing slash
 *   - `[x](./cli)`          relative, no extension
 *   - `[x](../cli)`         relative parent, no extension
 *   - `[x](cli)`            bare token, no extension
 *   - `[x](./)`             current dir
 *   - `[x](./guide/)`       relative, trailing slash
 */
export function findLinkStyleViolations(markdown: string): LinkStyleViolation[] {
  const stripped = stripCodeForScan(markdown)
  const violations: LinkStyleViolation[] = []
  MARKDOWN_LINK_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = MARKDOWN_LINK_RE.exec(stripped)) !== null) {
    const url = match[2]
    if (!url) continue
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) continue // external (http:, mailto:, …)
    if (url.startsWith('//')) continue // protocol-relative
    if (url.startsWith('#')) continue // in-page anchor
    const cleanPath = url.split(/[?#]/)[0] ?? ''
    if (!cleanPath) continue
    const ext = extname(cleanPath).toLowerCase()
    if (SKIP_LINK_EXTENSIONS.has(ext)) continue
    if (ext === '.md' || ext === '.mdx') continue
    violations.push({ url })
  }
  return violations
}

/**
 * Diagramkit-asset reference pattern: matches `<picture>` / `<img>` /
 * `<source>` `src=`/`srcset=` attributes AND markdown image syntax
 * `![]()` whose target lives under a `.diagramkit/` directory. Used by
 * the diagram-asset cross-reference check.
 */
export const DIAGRAM_ASSET_RE =
  /(?:src|srcset)=(["'])([^"']*\.diagramkit\/[^"']+)\1|\]\(([^)]*\.diagramkit\/[^)]+)\)/g

export interface DiagramAssetReference {
  /** Raw reference string as it appeared in the markdown source (no fragment/query stripping). */
  raw: string
  /** Reference with any `?query` / `#fragment` removed; this is what should resolve on disk. */
  ref: string
}

/**
 * Extract every diagramkit asset reference from markdown source.
 * Caller is responsible for resolving each reference relative to the
 * source file and confirming it exists on disk (the disk check stays in
 * the script so this module remains pure).
 */
export function findDiagramAssetReferences(markdown: string): DiagramAssetReference[] {
  const stripped = stripCodeForScan(markdown)
  const refs: DiagramAssetReference[] = []
  DIAGRAM_ASSET_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = DIAGRAM_ASSET_RE.exec(stripped)) !== null) {
    const raw = match[2] ?? match[3] ?? ''
    if (!raw) continue
    if (/^[a-z]+:\/\//i.test(raw) || raw.startsWith('//')) continue
    const ref = raw.split(/[?#]/)[0] ?? raw
    refs.push({ raw, ref })
  }
  return refs
}

/**
 * Detect a leading YAML frontmatter block (`---\n…\n---`) in a Mermaid
 * source file. Mermaid silently swallows the frontmatter `title:` field —
 * it never reaches the SVG output — and the block hides the diagram
 * keyword from any tool that scans for it on the first non-comment line.
 * The fix is to replace the frontmatter with `%% Diagram: …` / `%% Type: …`
 * comments per `skills/diagramkit-mermaid/SKILL.md` Review Mode rule #1.
 *
 * Returns `true` only when the file STARTS with a `---` fence (allowing
 * an optional UTF-8 BOM). A `---` later in the file is fine — that's a
 * Markdown horizontal rule inside a label, not a frontmatter block.
 */
export function hasMermaidYamlFrontmatter(source: string): boolean {
  const stripped = source.replace(/^\uFEFF/, '')
  return /^---\s*\r?\n[\s\S]*?\r?\n---\s*(\r?\n|$)/.test(stripped)
}

/**
 * `mermaidLayout` config probe. Returns one of:
 *   - 'present-auto'    config has `mermaidLayout: { mode: 'auto', … }`
 *   - 'present-other'   config has a `mermaidLayout` block but mode != 'auto'
 *   - 'absent'          config exists but does not mention `mermaidLayout`
 *   - 'no-config'       no `diagramkit.config.json5` / `.ts` source string passed
 *
 * The probe is regex-based (no JSON5 parser) so it stays dependency-free
 * and works on both `diagramkit.config.json5` and `diagramkit.config.ts`
 * sources. It tolerates whitespace, single/double quotes, and trailing
 * commas.
 */
export type MermaidLayoutConfigState = 'present-auto' | 'present-other' | 'absent' | 'no-config'

export function detectMermaidLayoutConfig(configSource: string | null): MermaidLayoutConfigState {
  if (configSource == null) return 'no-config'
  const blockMatch = configSource.match(/mermaidLayout\s*:\s*\{([\s\S]*?)\}/)
  if (!blockMatch) return 'absent'
  const body = blockMatch[1] ?? ''
  if (/\bmode\s*:\s*['"]auto['"]/.test(body)) return 'present-auto'
  return 'present-other'
}
