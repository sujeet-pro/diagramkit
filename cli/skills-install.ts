/**
 * `diagramkit skills install` — write versioned-pointer skill stubs into a
 * consumer repo.
 *
 * Unlike a copy-based installer, this never duplicates skill bodies into the
 * repo. For every skill shipped in `node_modules/diagramkit/skills/<name>/`, it
 * writes a canonical pointer stub at `.agents/skills/<name>/SKILL.md` plus thin
 * mirrors under each detected/requested harness dir (`.claude/skills`,
 * `.cursor/skills`, `.codex/skills`, `.continue/skills`). The stub bodies point
 * back at the version-pinned original in `node_modules`, so every agent reads
 * exactly the skill that matches the installed CLI.
 *
 * Stubs carry an HTML-comment marker so re-runs are idempotent (created /
 * updated / unchanged), version bumps are detected as drift, and orphaned stubs
 * (skills removed from a newer diagramkit) can be swept — but only within the
 * managed `diagramkit-*` namespace, and only stubs we actually generated.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/* ── Public types ── */

export type HarnessName = 'claude' | 'cursor' | 'codex' | 'continue'

/** Parent dir for each harness (mirrors live under `<dir>/skills/`). */
export const HARNESS_PARENT_DIRS: Record<HarnessName, string> = {
  claude: '.claude',
  cursor: '.cursor',
  codex: '.codex',
  continue: '.continue',
}

export const ALL_HARNESSES: readonly HarnessName[] = ['claude', 'cursor', 'codex', 'continue']

/** HTML-comment marker token that identifies a diagramkit-managed pointer stub. */
export const POINTER_MARKER_TOKEN = 'diagramkit-skill-pointer'

/** Only skills in this namespace are ever created, swept, or reported. */
export const MANAGED_SKILL_PREFIX = 'diagramkit-'

export type StubStatus =
  | 'created'
  | 'updated'
  | 'unchanged'
  | 'removed' // orphan deleted (install / dry-run)
  | 'missing' // --check: stub absent, would be created
  | 'stale' // --check: stub drifted, would be updated
  | 'orphaned' // --check: managed stub no longer shipped

export interface SkillStubAction {
  /** Path relative to the target dir. */
  path: string
  skill: string
  kind: 'canonical' | 'mirror' | 'orphan'
  harness?: HarnessName
  status: StubStatus
}

export interface SkillsInstallResult {
  packageRoot: string
  /** Installed diagramkit version (from the resolved package root). */
  version: string
  mode: 'install' | 'check' | 'dry-run'
  /** Harness mirror dirs written this run (always includes the `.agents` base). */
  harnesses: HarnessName[]
  /** Skill names targeted this run. */
  skills: string[]
  actions: SkillStubAction[]
  /**
   * `--check` disposition: `true` when nothing is missing/stale/orphaned.
   * Always `true` for install / dry-run.
   */
  ok: boolean
}

export interface SkillsInstallOptions {
  /** Target repo directory. */
  cwd: string
  /** Explicit harness selection. `undefined` = auto-detect. */
  harnesses?: HarnessName[]
  /** Restrict to these skill names (with or without the `diagramkit-` prefix). */
  only?: string[]
  /** Verify-only: never write, exit nonzero on missing/stale/orphaned. */
  check?: boolean
  /** Show what would happen without writing. */
  dryRun?: boolean
  /**
   * Override the resolved diagramkit package root (tests point this at a
   * fixture). When omitted, resolution falls back to auto-detection.
   */
  packageRoot?: string
  /** Module URL used for the in-repo fallback (defaults to this module). */
  moduleUrl?: string
}

/* ── Frontmatter ── */

export interface SkillFrontmatter {
  name?: string
  description?: string
}

/** Parse the leading YAML frontmatter block for `name` / `description`. */
export function readFrontmatter(content: string): SkillFrontmatter {
  const match = /^---\s*\n([\s\S]*?)\n---/.exec(content)
  if (!match) return {}
  const body = match[1] ?? ''
  const get = (key: string): string | undefined => {
    const re = new RegExp(`^${key}:\\s*(.+)$`, 'm')
    const m = re.exec(body)
    return m?.[1]?.trim()
  }
  return { name: get('name'), description: get('description') }
}

/* ── Package resolution ── */

/**
 * Resolve the diagramkit package root that ships the `skills/` folder.
 *
 * Order:
 *   1. When run via `npx diagramkit` inside a consumer, resolve
 *      `diagramkit/package.json` from the consumer's cwd (import.meta.resolve).
 *   2. Fall back to walking up from this module's own location — handles
 *      running inside the diagramkit repo itself, both from source
 *      (`cli/skills-install.ts`) and from the build (`dist/cli/...`).
 */
export function resolveDiagramkitPackageRoot(
  cwd: string,
  moduleUrl: string = import.meta.url,
): string {
  // 1. Consumer node_modules (npx path). Resolution MUST be anchored on `cwd`,
  //    not on this module. `import.meta.resolve(spec, base)` cannot do that on
  //    stable Node: the `base` argument is ignored without
  //    --experimental-import-meta-resolve, so it resolves relative to this
  //    module (the CLI's own install location) and silently ignores `cwd`.
  //    `createRequire(<cwd>/package.json)` walks the consumer's node_modules.
  try {
    const requireFromCwd = createRequire(join(resolve(cwd), 'package.json'))
    const pkgPath = requireFromCwd.resolve('diagramkit/package.json')
    if (existsSync(pkgPath) && readPackageName(pkgPath) === 'diagramkit') {
      return dirname(pkgPath)
    }
  } catch {
    // fall through to the in-repo fallback
  }

  // 2. Walk up from this module to the nearest diagramkit package.json.
  let dir = dirname(fileURLToPath(moduleUrl))
  while (true) {
    const candidate = join(dir, 'package.json')
    if (existsSync(candidate) && readPackageName(candidate) === 'diagramkit') {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  throw new Error(
    'Could not resolve the diagramkit package root. Run this from a repo that has ' +
      'diagramkit installed (npx diagramkit skills install), or from inside the diagramkit repo.',
  )
}

function readPackageName(pkgPath: string): string | undefined {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string }
    return pkg.name
  } catch {
    return undefined
  }
}

function readPackageVersion(packageRoot: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf-8')) as {
      version?: string
    }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/* ── Skill discovery ── */

export interface DiscoveredSkill {
  name: string
  description: string
  sourcePath: string
}

/** List every `skills/<name>/SKILL.md` shipped in the package root. */
export function discoverSkills(packageRoot: string): DiscoveredSkill[] {
  const skillsDir = join(packageRoot, 'skills')
  if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) return []
  const out: DiscoveredSkill[] = []
  for (const name of readdirSync(skillsDir).sort()) {
    const skillMd = join(skillsDir, name, 'SKILL.md')
    if (!existsSync(skillMd)) continue
    const content = readFileSync(skillMd, 'utf-8')
    const { name: fmName, description } = readFrontmatter(content)
    out.push({
      name: fmName ?? name,
      description: description ?? '',
      sourcePath: skillMd,
    })
  }
  return out
}

/* ── Harness detection ── */

/** A harness is auto-detected when its parent dir already exists in the repo. */
export function detectHarnesses(cwd: string): HarnessName[] {
  return ALL_HARNESSES.filter((h) => existsSync(join(cwd, HARNESS_PARENT_DIRS[h])))
}

/* ── Stub templates ── */

export function buildMarker(version: string): string {
  return `<!-- ${POINTER_MARKER_TOKEN}: pkg=diagramkit version=${version} generator=diagramkit@${version} -->`
}

/**
 * Compute the POSIX relative link from a canonical stub's directory to the
 * `SKILL.md` shipped by the resolved diagramkit package root. Using the
 * *resolved* package root (not a fixed `../../../node_modules/diagramkit`
 * string) keeps the pointer correct in hoisted monorepos, where diagramkit
 * lives at the repo-root `node_modules` but the stub may sit several levels
 * deep under a workspace package.
 */
export function pointerToPackageSkill(stubDir: string, packageRoot: string, name: string): string {
  const target = join(resolve(packageRoot), 'skills', name, 'SKILL.md')
  const rel = relative(resolve(stubDir), target)
  return rel.split(/[\\/]+/).join('/')
}

/**
 * Canonical stub written to `.agents/skills/<name>/SKILL.md`. Points at the
 * version-pinned original in the resolved `diagramkit` package via
 * `pointerPath` (computed with {@link pointerToPackageSkill}).
 */
export function renderCanonicalStub(
  name: string,
  description: string,
  version: string,
  pointerPath: string,
): string {
  return `---
name: ${name}
description: ${description}
---

${buildMarker(version)}

# ${name}

Follow the version-pinned skill that ships with the locally installed \`diagramkit\` package:

→ [\`${pointerPath}\`](${pointerPath})

Always anchor on the local install (\`npx diagramkit ...\`, never a global one). Read \`node_modules/diagramkit/REFERENCE.md\` first if you have not already.
`
}

/**
 * Mirror stub written to `<harness>/skills/<name>/SKILL.md`. Points back at the
 * canonical `.agents/skills/...` file. The `../../../` prefix resolves to the
 * repo root from three levels deep (`.claude/skills/<name>/`).
 */
export function renderMirrorStub(name: string, description: string, version: string): string {
  return `---
name: ${name}
description: ${description}
---

${buildMarker(version)}

# ${name}

Follow [\`.agents/skills/${name}/SKILL.md\`](../../../.agents/skills/${name}/SKILL.md). Do not duplicate its content here.
`
}

/* ── Idempotent writes ── */

type PlannedWrite = 'created' | 'updated' | 'unchanged'

function planWrite(path: string, content: string): PlannedWrite {
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8') === content ? 'unchanged' : 'updated'
  }
  return 'created'
}

function commitWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

/** Map a planned write to its `--check` status. */
function checkStatus(planned: PlannedWrite): StubStatus {
  if (planned === 'created') return 'missing'
  if (planned === 'updated') return 'stale'
  return 'unchanged'
}

/* ── Orphan detection ── */

/**
 * A managed skill dir under `<baseDir>/skills/` that we generated (marker
 * present) but which is not in `shippedNames` is an orphan. User-authored
 * folders — anything outside the `diagramkit-*` namespace, or a `diagramkit-*`
 * folder without our marker — are never touched.
 */
function findOrphans(skillsRoot: string, shippedNames: Set<string>): string[] {
  if (!existsSync(skillsRoot) || !statSync(skillsRoot).isDirectory()) return []
  const orphans: string[] = []
  for (const name of readdirSync(skillsRoot).sort()) {
    if (!name.startsWith(MANAGED_SKILL_PREFIX)) continue
    if (shippedNames.has(name)) continue
    const skillMd = join(skillsRoot, name, 'SKILL.md')
    if (!existsSync(skillMd)) continue
    if (!readFileSync(skillMd, 'utf-8').includes(POINTER_MARKER_TOKEN)) continue
    orphans.push(name)
  }
  return orphans
}

/* ── Install ── */

export function installSkills(options: SkillsInstallOptions): SkillsInstallResult {
  const cwd = resolve(options.cwd)
  const check = options.check ?? false
  const dryRun = options.dryRun ?? false
  const write = !check && !dryRun
  const mode: SkillsInstallResult['mode'] = check ? 'check' : dryRun ? 'dry-run' : 'install'

  const packageRoot =
    options.packageRoot ?? resolveDiagramkitPackageRoot(cwd, options.moduleUrl ?? import.meta.url)
  const version = readPackageVersion(packageRoot)

  const allSkills = discoverSkills(packageRoot)
  if (allSkills.length === 0) {
    throw new Error(`No skills found under ${join(packageRoot, 'skills')} — nothing to install.`)
  }
  // Orphan detection is always against the full shipped set, so `--only` never
  // sweeps skills it simply chose not to (re)install this run.
  const shippedNames = new Set(allSkills.map((s) => s.name))

  const targetSkills = filterByOnly(allSkills, options.only)

  const harnesses = options.harnesses ?? detectHarnesses(cwd)
  // `.agents` is always the canonical base; harness dirs are mirrors on top.

  const actions: SkillStubAction[] = []

  const agentsSkillsRoot = join(cwd, '.agents', 'skills')

  for (const skill of targetSkills) {
    // Canonical
    const canonicalPath = join(agentsSkillsRoot, skill.name, 'SKILL.md')
    const pointerPath = pointerToPackageSkill(dirname(canonicalPath), packageRoot, skill.name)
    const canonicalContent = renderCanonicalStub(
      skill.name,
      skill.description,
      version,
      pointerPath,
    )
    const canonicalPlan = planWrite(canonicalPath, canonicalContent)
    if (write && canonicalPlan !== 'unchanged') commitWrite(canonicalPath, canonicalContent)
    actions.push({
      path: relPath(cwd, canonicalPath),
      skill: skill.name,
      kind: 'canonical',
      status: check ? checkStatus(canonicalPlan) : canonicalPlan,
    })

    // Mirrors
    for (const harness of harnesses) {
      const mirrorPath = join(cwd, HARNESS_PARENT_DIRS[harness], 'skills', skill.name, 'SKILL.md')
      const mirrorContent = renderMirrorStub(skill.name, skill.description, version)
      const mirrorPlan = planWrite(mirrorPath, mirrorContent)
      if (write && mirrorPlan !== 'unchanged') commitWrite(mirrorPath, mirrorContent)
      actions.push({
        path: relPath(cwd, mirrorPath),
        skill: skill.name,
        kind: 'mirror',
        harness,
        status: check ? checkStatus(mirrorPlan) : mirrorPlan,
      })
    }
  }

  // Orphan sweep — canonical base plus every managed harness dir this run.
  const orphanRoots: string[] = [agentsSkillsRoot]
  for (const harness of harnesses) {
    orphanRoots.push(join(cwd, HARNESS_PARENT_DIRS[harness], 'skills'))
  }
  for (const skillsRoot of orphanRoots) {
    for (const orphanName of findOrphans(skillsRoot, shippedNames)) {
      const orphanDir = join(skillsRoot, orphanName)
      if (write) rmSync(orphanDir, { recursive: true, force: true })
      actions.push({
        path: relPath(cwd, join(orphanDir, 'SKILL.md')),
        skill: orphanName,
        kind: 'orphan',
        status: check ? 'orphaned' : 'removed',
      })
    }
  }

  const ok = check
    ? !actions.some(
        (a) => a.status === 'missing' || a.status === 'stale' || a.status === 'orphaned',
      )
    : true

  return {
    packageRoot,
    version,
    mode,
    harnesses,
    skills: targetSkills.map((s) => s.name),
    actions,
    ok,
  }
}

/* ── Helpers ── */

function relPath(cwd: string, absPath: string): string {
  const rel = absPath.startsWith(cwd) ? absPath.slice(cwd.length).replace(/^[\\/]+/, '') : absPath
  return rel.split(/[\\/]+/).join('/')
}

/**
 * Filter discovered skills to those requested via `--only`. Names match with or
 * without the `diagramkit-` prefix (`--only mermaid` == `--only
 * diagramkit-mermaid`). Unknown names are ignored here (the CLI warns).
 */
function filterByOnly(skills: DiscoveredSkill[], only: string[] | undefined): DiscoveredSkill[] {
  if (!only || only.length === 0) return skills
  const wanted = new Set<string>()
  for (const raw of only) {
    const token = raw.trim()
    if (!token) continue
    wanted.add(token)
    wanted.add(token.startsWith(MANAGED_SKILL_PREFIX) ? token : `${MANAGED_SKILL_PREFIX}${token}`)
  }
  return skills.filter((s) => wanted.has(s.name))
}

/** Resolve requested `--only` names that match nothing shipped (for warnings). */
export function unknownOnlyNames(packageRoot: string, only: string[] | undefined): string[] {
  if (!only || only.length === 0) return []
  const shipped = discoverSkills(packageRoot)
  const matched = new Set(filterByOnly(shipped, only).map((s) => s.name))
  const unknown: string[] = []
  for (const raw of only) {
    const token = raw.trim()
    if (!token) continue
    const withPrefix = token.startsWith(MANAGED_SKILL_PREFIX)
      ? token
      : `${MANAGED_SKILL_PREFIX}${token}`
    if (!matched.has(withPrefix) && !matched.has(token)) unknown.push(token)
  }
  return unknown
}
