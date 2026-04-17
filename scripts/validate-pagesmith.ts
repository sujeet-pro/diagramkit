#!/usr/bin/env -S node --experimental-strip-types --no-warnings

/**
 * Diagramkit docs validation orchestrator.
 *
 * Runs both content validation (markdown source under docs/) and
 * build-output validation (gh-pages/) using the published `@pagesmith/docs`
 * validator. Adds two diagramkit-specific cross-reference checks:
 *
 *   1. Every diagram referenced from `docs/**` via a `<picture>` element or
 *      `![]()` syntax should resolve to a `.diagramkit/` source so that
 *      `diagramkit render docs/` keeps the rendered SVG fresh.
 *
 *   2. Every internal markdown link inside `docs/**` must use the explicit
 *      `./path/README.md` (or `./file.md` / `./file.mdx`) form. Extension-less
 *      absolute or relative paths (`/guide/cli`, `./watch-mode`) are rejected
 *      so that the source file always points at a real markdown source on
 *      disk and pagesmith can rewrite it to a clean URL at build time.
 *
 * Usage:
 *   npm run validate:pagesmith              full check
 *   npm run validate:pagesmith -- --content content only
 *   npm run validate:pagesmith -- --build   build output only
 *   npm run validate:pagesmith -- --full    enable opt-in strict checks
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { validateDocs } from '@pagesmith/docs'

const repoRoot = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const slice = args.find((arg) => arg === '--content' || arg === '--build')
const skipContent = slice === '--build'
const skipBuild = slice === '--content'
const fullPreset = args.includes('--full')

const result = await validateDocs({
  configPath: resolve(repoRoot, 'pagesmith.config.json5'),
  skipContent,
  skipBuild,
  // Always enforce that internal links resolve to a real markdown file on disk.
  // The `./path/README.md` rule is enforced by the project-level check below.
  internalLinksMustBeMarkdown: true,
  // The strict trailing-slash check (both forms must work) and the modern-raster
  // requirement are still opt-in via `--full` because they only make sense for
  // releases that opt into both URL forms.
  requireBothTrailingSlashForms: fullPreset,
  requireRasterModernFormats: fullPreset,
})

let totalErrors = result.errors
let totalWarnings = result.warnings

// ── diagramkit-specific cross-reference: every <picture>/img diagram source
//    should live in a sibling `.diagramkit/` directory so render runs
//    pick it up.
if (!skipContent) {
  console.log(`\n[diagramkit-cross-references]`)
  const projectErrors: string[] = []
  const docsDir = resolve(repoRoot, 'docs')

  function walk(dir: string): string[] {
    const out: string[] = []
    if (!existsSync(dir)) return out
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) out.push(...walk(full))
      else if (extname(entry.name) === '.md' || extname(entry.name) === '.mdx') {
        out.push(full)
      }
    }
    return out
  }

  const mdFiles = walk(docsDir)
  // Strip fenced code blocks and inline-code spans before matching so
  // documentation examples that *show* a `<picture>` snippet are not
  // mistaken for real asset references.
  const stripCode = (content: string): string =>
    content.replace(/^```[^\n]*\n[\s\S]*?\n```\s*$/gm, '').replace(/`[^`\n]*`/g, '')
  for (const file of mdFiles) {
    const content = stripCode(readFileSync(file, 'utf-8'))
    // Find any image reference (in markdown ![]() or in <img>/<source>) that
    // looks like a generated diagram and ensure the rendered SVG exists.
    const candidatePattern =
      /(?:src|srcset)=(["'])([^"']*\.diagramkit\/[^"']+)\1|\]\(([^)]*\.diagramkit\/[^)]+)\)/g
    let match: RegExpExecArray | null
    while ((match = candidatePattern.exec(content)) !== null) {
      const ref = (match[2] ?? match[3] ?? '').split(/[?#]/)[0]
      if (!ref) continue
      // Only check local refs (skip external).
      if (/^[a-z]+:\/\//i.test(ref) || ref.startsWith('//')) continue
      const absolute = ref.startsWith('/')
        ? join(repoRoot, 'docs', ref.replace(/^\/+/, ''))
        : resolve(file, '..', ref)
      if (!existsSync(absolute)) {
        projectErrors.push(`${relative(repoRoot, file)} references missing diagram asset: ${ref}`)
      }
    }
  }

  if (projectErrors.length === 0) {
    console.log(`  every <picture>/img source under .diagramkit/ exists on disk.`)
  } else {
    for (const message of projectErrors) console.log(`  \u2717 ${message}`)
  }
  totalErrors += projectErrors.length

  // ── diagramkit-specific link-style rule ──────────────────────────────────
  // All internal links to other docs pages MUST be authored as relative
  // `./path/README.md` (or `./file.md` / `./file.mdx`). pagesmith already
  // rewrites these to clean URLs (`<basePath>/path` or `<basePath>/path/`
  // depending on the trailing-slash setting) at build time, but the SOURCE
  // file must still point at a real markdown source on disk.
  //
  // Rejected forms (with examples that previously slipped through):
  //   `[CLI](/guide/cli)`                       (absolute, no extension)
  //   `[CLI](/guide/cli/)`                      (absolute, trailing slash)
  //   `[CLI](./cli)`                            (relative, no extension)
  //   `[CLI](../cli)`                           (relative, no extension)
  //   `[CLI](cli)`                              (bare, no extension)
  //
  // Accepted forms:
  //   `[CLI](./cli/README.md)`
  //   `[CLI](./README.md)`
  //   `[CLI](../guide/cli/README.md)`
  //   `[CLI](./watch-mode/README.md#anchor)`
  //   `[CLI](./design-principles.md)` (top-level standalone .md)
  //   `[Repo](https://github.com/...)` (external) — skipped
  //   `[CLI](#section)` (in-page anchor) — skipped
  //   `[Diagram](.diagramkit/foo-light.svg)` (image asset) — skipped
  console.log(`\n[diagramkit-link-style]`)
  const linkStyleErrors: string[] = []
  // Markdown link regex covering inline links and references. Matches `[text](url)`
  // but skips already-skipped patterns like images (`![]()`), code blocks, and
  // inline code (which we strip via stripCode above).
  const LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/g
  // Recognized fenced-asset extensions that aren't markdown but are valid local refs.
  const SKIP_EXTENSIONS = new Set([
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
  for (const file of mdFiles) {
    const content = stripCode(readFileSync(file, 'utf-8'))
    let match: RegExpExecArray | null
    while ((match = LINK_RE.exec(content)) !== null) {
      const url = match[2]!
      if (!url) continue
      // Skip external links (http://, https://, mailto:, tel:, etc.)
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) continue
      // Skip protocol-relative links and in-page anchors / queries only
      if (url.startsWith('//')) continue
      if (url.startsWith('#')) continue
      // Strip fragment + query for extension analysis
      const cleanPath = url.split(/[?#]/)[0] ?? ''
      if (!cleanPath) continue
      // Allow image / diagram-source / json / pdf etc. references
      const ext = extname(cleanPath).toLowerCase()
      if (SKIP_EXTENSIONS.has(ext)) continue
      // Reject anything that isn't already a `.md`/`.mdx` link
      if (ext === '.md' || ext === '.mdx') continue
      linkStyleErrors.push(
        `${relative(repoRoot, file)}: internal link "${url}" must use ./path/README.md form ` +
          `(or .md / .mdx). Pagesmith rewrites .md links to clean URLs at build time; ` +
          `bare paths bypass the source-of-truth check.`,
      )
    }
  }
  if (linkStyleErrors.length === 0) {
    console.log(`  every internal link uses ./path/README.md form.`)
  } else {
    for (const message of linkStyleErrors) console.log(`  \u2717 ${message}`)
  }
  totalErrors += linkStyleErrors.length
}

console.log(
  `\nSummary: ${totalErrors} error(s), ${totalWarnings} warning(s) — ${
    totalErrors === 0 ? 'PASSED' : 'FAILED'
  }`,
)
process.exit(totalErrors === 0 ? 0 : 1)
