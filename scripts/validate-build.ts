#!/usr/bin/env -S node --experimental-strip-types --no-warnings

/**
 * Post-build validation.
 *
 * Runs as the final step of `npm run cicd`. Exits non-zero on any failure
 * so CI (and local cicd) surface breakage immediately. Checks:
 *
 * 1. Every SKILL.md under .agents/skills/, .claude/skills/, .cursor/skills/,
 *    and skills/ has valid YAML frontmatter with non-empty `name` and
 *    `description`, and the name matches its directory.
 * 2. Client mirrors (.claude/skills/, .cursor/skills/) exist for every
 *    canonical .agents/skills/prj-<name>/, and their frontmatter descriptions
 *    match the canonical exactly.
 * 3. package.json `files` entries all exist on disk.
 * 4. package.json `exports` targets exist on disk (skipped if dist/ is absent
 *    — the build:lib step is expected to populate it first).
 * 5. gh-pages/ (if present) has no obvious broken internal links to removed
 *    reference paths (/reference/cli, /reference/api, etc.).
 * 6. Required published JSON schemas exist under schemas/ and parse cleanly.
 * 7. Every SVG under docs/.../.diagramkit/ passes the validator's WCAG 2.2 AA
 *    contrast scan — protects the docs site from regressing on hard-to-read
 *    text/background combinations as authors edit diagram sources.
 * 8. Every Mermaid source under docs/ has no leading YAML frontmatter block
 *    — frontmatter is silently dropped during render and breaks the
 *    "first non-comment line is the diagram keyword" rule from
 *    skills/diagramkit-mermaid/SKILL.md Review Mode.
 * 9. If docs/ contains any Mermaid source, the project root has a
 *    diagramkit.config.json5 (or .ts) with `mermaidLayout: { mode: 'auto' }`
 *    set. Without it the renderer cannot auto-flip / ELK-rebalance, and
 *    every ASPECT_RATIO_EXTREME warning has to be fixed source-by-source.
 *    Surfaced as a warning (not a failure) so projects that genuinely opt
 *    out can keep the build green.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { detectMermaidLayoutConfig, hasMermaidYamlFrontmatter } from './lib/docs-rules.ts'

const root = process.cwd()
let failures = 0

function fail(message: string): void {
  failures += 1
  console.error(`[validate-build] FAIL: ${message}`)
}

function info(message: string): void {
  console.log(`[validate-build] ${message}`)
}

/* ── SKILL.md frontmatter ── */

type SkillFrontmatter = {
  name: string
  description: string
  raw: string
}

function parseSkillFrontmatter(path: string): SkillFrontmatter | null {
  const content = readFileSync(path, 'utf-8')
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!match) return null
  const raw = match[1] ?? ''
  const lines = raw.split('\n')
  const out: Record<string, string> = {}
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_-]+):\s*(.*)$/)
    if (!m) continue
    out[m[1]!] = (m[2] ?? '').trim()
  }
  if (!out.name || !out.description) return null
  return { name: out.name, description: out.description, raw }
}

function collectSkills(dir: string): Array<{ path: string; dirName: string }> {
  const absDir = resolve(root, dir)
  if (!existsSync(absDir)) return []
  const results: Array<{ path: string; dirName: string }> = []
  for (const name of readdirSync(absDir)) {
    const entryPath = join(absDir, name)
    const s = statSync(entryPath)
    if (!s.isDirectory()) continue
    const skillPath = join(entryPath, 'SKILL.md')
    if (existsSync(skillPath)) {
      results.push({ path: skillPath, dirName: name })
    }
  }
  return results
}

function validateSkillTree(dir: string): Map<string, SkillFrontmatter> {
  const byName = new Map<string, SkillFrontmatter>()
  for (const { path, dirName } of collectSkills(dir)) {
    const fm = parseSkillFrontmatter(path)
    if (!fm) {
      fail(`${relative(root, path)}: missing or malformed frontmatter (need name + description)`)
      continue
    }
    if (fm.name !== dirName) {
      fail(
        `${relative(root, path)}: frontmatter name "${fm.name}" does not match directory "${dirName}"`,
      )
    }
    if (byName.has(fm.name)) {
      fail(`${relative(root, path)}: duplicate skill name "${fm.name}" within ${dir}`)
    }
    byName.set(fm.name, fm)
  }
  return byName
}

function validateMirrors(
  canonical: Map<string, SkillFrontmatter>,
  mirrorDir: string,
  label: string,
): void {
  const mirrors = validateSkillTree(mirrorDir)
  for (const [name] of canonical) {
    if (!mirrors.has(name)) {
      fail(`${label} is missing a mirror for .agents/skills/${name}/ at ${mirrorDir}/${name}/`)
      continue
    }
    const m = mirrors.get(name)!
    const c = canonical.get(name)!
    if (m.description !== c.description) {
      fail(
        `${label} skill "${name}" description does not match canonical. Update ${mirrorDir}/${name}/SKILL.md frontmatter.`,
      )
    }
  }
}

/* ── package.json checks ── */

type PackageManifest = {
  files?: string[]
  exports?: unknown
}

function visitExportTargets(value: unknown, visit: (target: string) => void): void {
  if (typeof value === 'string') {
    if (value.includes('*')) return
    visit(value)
    return
  }
  if (!value || typeof value !== 'object') return
  for (const nested of Object.values(value as Record<string, unknown>)) {
    visitExportTargets(nested, visit)
  }
}

function validatePackageJson(): void {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')) as PackageManifest
  for (const entry of pkg.files ?? []) {
    if (entry.startsWith('!')) continue
    const abs = resolve(root, entry)
    if (!existsSync(abs)) {
      fail(`package.json "files" entry does not exist: ${entry}`)
    }
  }
  const distExists = existsSync(resolve(root, 'dist'))
  if (!distExists) {
    info('dist/ not present — skipping exports target check (run build:lib first)')
    return
  }
  const missing: string[] = []
  visitExportTargets(pkg.exports, (target) => {
    const abs = resolve(root, target)
    if (!existsSync(abs)) missing.push(target)
  })
  for (const t of missing) fail(`package.json "exports" target does not exist: ${t}`)
}

/* ── Schemas ── */

const REQUIRED_SCHEMAS = [
  'schemas/diagramkit-cli-render.v1.json',
  'schemas/diagramkit-config.v1.json',
] as const

function validateSchemas(): void {
  for (const rel of REQUIRED_SCHEMAS) {
    const abs = resolve(root, rel)
    if (!existsSync(abs)) {
      fail(`Required schema is missing: ${rel}`)
      continue
    }
    try {
      const parsed = JSON.parse(readFileSync(abs, 'utf-8')) as Record<string, unknown>
      if (typeof parsed.$schema !== 'string' || typeof parsed.title !== 'string') {
        fail(`Schema ${rel} is missing $schema or title`)
      }
    } catch (err) {
      fail(`Schema ${rel} is not valid JSON: ${(err as Error).message}`)
    }
  }
}

/* ── gh-pages broken-link spot-check ── */

function validateGhPagesLinks(): void {
  const ghDir = resolve(root, 'gh-pages')
  if (!existsSync(ghDir)) {
    info('gh-pages/ not present — skipping docs link spot-check')
    return
  }
  const offendingPaths = [
    '/reference/cli',
    '/reference/api',
    '/reference/config',
    '/reference/types',
    '/reference/overview',
  ]
  const visited: string[] = []
  function walk(current: string): void {
    for (const entry of readdirSync(current)) {
      const p = join(current, entry)
      const s = statSync(p)
      if (s.isDirectory()) walk(p)
      else if (entry.endsWith('.html')) visited.push(p)
    }
  }
  walk(ghDir)
  for (const htmlPath of visited) {
    const content = readFileSync(htmlPath, 'utf-8')
    for (const bad of offendingPaths) {
      // require the bad path appears as an href (so we don't match substrings)
      const re = new RegExp(
        `href=["'][^"']*${bad.replace(/\//g, '\\/')}(?!/?diagramkit|/?how-it-works)[^"']*["']`,
      )
      if (re.test(content)) {
        fail(`${relative(root, htmlPath)} still references removed reference path "${bad}"`)
      }
    }
  }
}

/* ── Docs SVGs: WCAG 2.2 AA contrast scan ── */

async function validateDocsContrast(): Promise<void> {
  const docsDir = resolve(root, 'docs')
  if (!existsSync(docsDir)) {
    info('docs/ not present — skipping docs contrast scan')
    return
  }
  const distValidate = resolve(root, 'dist/validate.mjs')
  if (!existsSync(distValidate)) {
    info('dist/validate.mjs not present — skipping docs contrast scan (run build:lib first)')
    return
  }
  const { validateSvgDirectory } = (await import(distValidate)) as typeof import('../src/validate')
  const results = validateSvgDirectory(docsDir, { recursive: true })
  let contrastFailures = 0
  for (const r of results) {
    const lowContrast = r.issues.filter((i) => i.code === 'LOW_CONTRAST_TEXT')
    if (lowContrast.length === 0) continue
    contrastFailures += lowContrast.length
    for (const issue of lowContrast) {
      fail(`${relative(root, r.file ?? '')}: ${issue.message}`)
    }
  }
  if (contrastFailures === 0) {
    info(`Docs contrast scan: ${results.length} SVG(s) checked, all pass WCAG 2.2 AA`)
  }
}

/* ── Mermaid source-file lint ── */

const MERMAID_SOURCE_EXTENSIONS = new Set(['.mermaid', '.mmd', '.mmdc'])

function collectMermaidSources(dir: string): string[] {
  const out: string[] = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.name === 'node_modules' || entry.name === '.diagramkit') continue
    if (entry.isDirectory()) {
      out.push(...collectMermaidSources(full))
    } else if (MERMAID_SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      out.push(full)
    }
  }
  return out
}

function validateMermaidSources(): void {
  const docsDir = resolve(root, 'docs')
  if (!existsSync(docsDir)) {
    info('docs/ not present — skipping Mermaid source-file lint')
    return
  }
  const sources = collectMermaidSources(docsDir)
  if (sources.length === 0) {
    info('No Mermaid sources under docs/ — skipping source-file lint')
    return
  }
  let frontmatterFailures = 0
  for (const source of sources) {
    if (hasMermaidYamlFrontmatter(readFileSync(source, 'utf-8'))) {
      frontmatterFailures += 1
      fail(
        `${relative(root, source)}: starts with a YAML frontmatter block. Mermaid silently drops the title at render time and the block hides the diagram keyword from source scanners. Replace with %% Diagram: … / %% Type: … comments (skills/diagramkit-mermaid/SKILL.md Review Mode rule #1).`,
      )
    }
  }
  if (frontmatterFailures === 0) {
    info(
      `Mermaid source-file lint: ${sources.length} source(s) checked, no leading YAML frontmatter`,
    )
  }
}

/* ── Project-level diagramkit.config check ── */

function validateMermaidLayoutConfig(): void {
  const docsDir = resolve(root, 'docs')
  if (!existsSync(docsDir)) return
  const sources = collectMermaidSources(docsDir)
  if (sources.length === 0) return
  const candidates = [
    'diagramkit.config.json5',
    'diagramkit.config.ts',
    'diagramkit.config.js',
    'diagramkit.config.mjs',
  ]
  let configSource: string | null = null
  let configPath = ''
  for (const candidate of candidates) {
    const abs = resolve(root, candidate)
    if (existsSync(abs)) {
      configSource = readFileSync(abs, 'utf-8')
      configPath = candidate
      break
    }
  }
  const state = detectMermaidLayoutConfig(configSource)
  if (state === 'present-auto') {
    info(`mermaidLayout config: ${configPath} sets mode: 'auto' (auto-flip / ELK enabled)`)
    return
  }
  // Surface as a console warning rather than a hard failure so opt-outs are possible.
  // The skills (audit-checklist + diagramkit-mermaid Review Mode) explain why this matters.
  const reason =
    state === 'no-config'
      ? `no diagramkit.config.* at the repo root`
      : state === 'absent'
        ? `${configPath} does not set mermaidLayout`
        : `${configPath} sets mermaidLayout but mode is not 'auto'`
  console.warn(
    `[validate-build] WARN: docs/ has ${sources.length} Mermaid source(s) but ${reason}. ` +
      `Add \`mermaidLayout: { mode: 'auto' }\` so the renderer auto-flips LR↔TB and tries ELK; this clears most ASPECT_RATIO_EXTREME warnings before any per-source edit. ` +
      `See skills/diagramkit-review/references/audit-checklist.md (Mermaid section).`,
  )
}

/* ── Run ── */

info('Validating SKILL.md frontmatter under .agents/skills/')
const canonical = validateSkillTree('.agents/skills')

info('Validating client mirrors (.claude/skills/, .cursor/skills/)')
validateMirrors(canonical, '.claude/skills', '.claude/skills')
validateMirrors(canonical, '.cursor/skills', '.cursor/skills')

info('Validating consumer skills frontmatter under skills/')
validateSkillTree('skills')

info('Validating package.json files[] and exports targets')
validatePackageJson()

info('Validating shipped JSON schemas under schemas/')
validateSchemas()

info('Spot-checking gh-pages/ for old reference URLs')
validateGhPagesLinks()

info('Scanning docs/ SVGs for WCAG 2.2 AA contrast regressions')
await validateDocsContrast()

info('Linting Mermaid sources under docs/ for stray YAML frontmatter')
validateMermaidSources()

info('Checking project-level mermaidLayout config')
validateMermaidLayoutConfig()

if (failures > 0) {
  console.error(`\n[validate-build] ${failures} check(s) failed`)
  process.exit(1)
}

console.log('\n[validate-build] OK')
