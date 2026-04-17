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
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

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

if (failures > 0) {
  console.error(`\n[validate-build] ${failures} check(s) failed`)
  process.exit(1)
}

console.log('\n[validate-build] OK')
