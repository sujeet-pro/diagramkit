import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import {
  POINTER_MARKER_TOKEN,
  detectHarnesses,
  discoverSkills,
  installSkills,
  readFrontmatter,
  resolveDiagramkitPackageRoot,
  type SkillsInstallResult,
} from '../cli/skills-install'

/* ── Fixtures ── */

const tempDirs: string[] = []

function tmp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

/** Build a fake diagramkit package root with the given skills + version. */
function makePackageRoot(
  version: string,
  skills: Array<{ name: string; description: string }>,
): string {
  const root = tmp('dk-pkg-')
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'diagramkit', version }))
  for (const skill of skills) {
    const dir = join(root, 'skills', skill.name)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'SKILL.md'),
      `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n# ${skill.name}\n\nbody\n`,
    )
  }
  return root
}

function makeCwd(): string {
  return tmp('dk-repo-')
}

const DEFAULT_SKILLS = [
  { name: 'diagramkit-foo', description: 'Foo skill for testing.' },
  { name: 'diagramkit-bar', description: 'Bar skill for testing.' },
]

function canonicalPath(cwd: string, name: string): string {
  return join(cwd, '.agents', 'skills', name, 'SKILL.md')
}

function statusFor(result: SkillsInstallResult, path: string): string | undefined {
  return result.actions.find((a) => a.path === path)?.status
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

/* ── resolveDiagramkitPackageRoot (consumer-dir scoping) ── */

describe('resolveDiagramkitPackageRoot', () => {
  // A module URL under a throwaway dir with no diagramkit ancestor, so the
  // in-repo walk-up fallback (branch 2) cannot mask branch-1 (consumer
  // node_modules) resolution.
  function neutralModuleUrl(): string {
    return pathToFileURL(join(tmp('dk-mod-'), 'cli', 'skills-install.js')).href
  }

  function installDiagramkit(consumer: string, version: string): string {
    const root = join(consumer, 'node_modules', 'diagramkit')
    mkdirSync(root, { recursive: true })
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'diagramkit', version }))
    return root
  }

  it('resolves diagramkit from a consumer dir that has its OWN copy', () => {
    const consumer = makeCwd()
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer' }))
    const root = installDiagramkit(consumer, '9.9.9')
    const resolved = resolveDiagramkitPackageRoot(consumer, neutralModuleUrl())
    expect(realpathSync(resolved)).toBe(realpathSync(root))
  })

  it('throws for a consumer dir that lacks diagramkit — never leaks to the CLI install', () => {
    const consumer = makeCwd()
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer' }))
    // The buggy `import.meta.resolve(spec, base)` ignored `base` and would
    // resolve diagramkit from the CLI's own install location; the fixed
    // `createRequire(<cwd>/…)` scoped to this diagramkit-less consumer must not.
    expect(() => resolveDiagramkitPackageRoot(consumer, neutralModuleUrl())).toThrow(
      /Could not resolve the diagramkit package root/,
    )
  })
})

/* ── readFrontmatter / discoverSkills ── */

describe('readFrontmatter', () => {
  it('extracts name and description', () => {
    const fm = readFrontmatter('---\nname: diagramkit-foo\ndescription: Hello world.\n---\n# x')
    expect(fm.name).toBe('diagramkit-foo')
    expect(fm.description).toBe('Hello world.')
  })

  it('returns empty object when no frontmatter present', () => {
    expect(readFrontmatter('# no frontmatter')).toEqual({})
  })
})

describe('discoverSkills', () => {
  it('lists shipped skills with descriptions, sorted', () => {
    const root = makePackageRoot('1.0.0', DEFAULT_SKILLS)
    const skills = discoverSkills(root)
    expect(skills.map((s) => s.name)).toEqual(['diagramkit-bar', 'diagramkit-foo'])
    expect(skills[0]!.description).toBe('Bar skill for testing.')
  })

  it('returns [] when no skills/ folder exists', () => {
    const root = tmp('dk-empty-')
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'diagramkit' }))
    expect(discoverSkills(root)).toEqual([])
  })
})

describe('detectHarnesses', () => {
  it('detects a harness when its parent dir exists', () => {
    const cwd = makeCwd()
    mkdirSync(join(cwd, '.claude'), { recursive: true })
    mkdirSync(join(cwd, '.continue'), { recursive: true })
    expect(detectHarnesses(cwd).sort()).toEqual(['claude', 'continue'])
  })

  it('returns [] when no harness dirs exist', () => {
    expect(detectHarnesses(makeCwd())).toEqual([])
  })
})

/* ── Fresh install ── */

describe('installSkills — fresh install', () => {
  it('writes canonical pointer stubs for every shipped skill', () => {
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    const cwd = makeCwd()
    const result = installSkills({ cwd, packageRoot })

    expect(result.mode).toBe('install')
    expect(result.version).toBe('0.4.0')
    expect(result.skills.sort()).toEqual(['diagramkit-bar', 'diagramkit-foo'])

    const fooPath = canonicalPath(cwd, 'diagramkit-foo')
    expect(existsSync(fooPath)).toBe(true)
    const content = readFileSync(fooPath, 'utf-8')
    expect(content).toContain('name: diagramkit-foo')
    expect(content).toContain('description: Foo skill for testing.')
    expect(content).toContain(
      `${POINTER_MARKER_TOKEN}: pkg=diagramkit version=0.4.0 generator=diagramkit@0.4.0`,
    )
    // The canonical stub points at the RESOLVED package root's SKILL.md via a
    // relative link (not a hardcoded ../../../node_modules/diagramkit string), so
    // resolving it against the stub dir must land on the real shipped skill.
    const linkMatch = /→ \[`([^`]+)`\]/.exec(content)
    expect(linkMatch).not.toBeNull()
    const resolvedPointer = resolve(dirname(fooPath), linkMatch![1]!)
    expect(resolvedPointer).toBe(join(packageRoot, 'skills', 'diagramkit-foo', 'SKILL.md'))
    expect(statusFor(result, '.agents/skills/diagramkit-foo/SKILL.md')).toBe('created')
  })

  it('writes harness mirrors that point back at the canonical stub', () => {
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    const cwd = makeCwd()
    const result = installSkills({ cwd, packageRoot, harnesses: ['claude'] })

    const mirror = join(cwd, '.claude', 'skills', 'diagramkit-foo', 'SKILL.md')
    expect(existsSync(mirror)).toBe(true)
    const content = readFileSync(mirror, 'utf-8')
    expect(content).toContain('../../../.agents/skills/diagramkit-foo/SKILL.md')
    expect(result.harnesses).toEqual(['claude'])
    expect(statusFor(result, '.claude/skills/diagramkit-foo/SKILL.md')).toBe('created')
  })

  it('auto-detects harnesses from existing dirs', () => {
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    const cwd = makeCwd()
    mkdirSync(join(cwd, '.cursor'), { recursive: true })
    const result = installSkills({ cwd, packageRoot })
    expect(result.harnesses).toEqual(['cursor'])
    expect(existsSync(join(cwd, '.cursor', 'skills', 'diagramkit-foo', 'SKILL.md'))).toBe(true)
  })
})

/* ── Idempotence ── */

describe('installSkills — idempotence', () => {
  it('reports unchanged on a re-run with the same version', () => {
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    const cwd = makeCwd()
    installSkills({ cwd, packageRoot, harnesses: ['claude'] })
    const second = installSkills({ cwd, packageRoot, harnesses: ['claude'] })
    expect(second.actions.every((a) => a.status === 'unchanged')).toBe(true)
  })

  it('updates stubs when the installed version bumps', () => {
    const cwd = makeCwd()
    installSkills({ cwd, packageRoot: makePackageRoot('0.4.0', DEFAULT_SKILLS) })
    const bumped = installSkills({ cwd, packageRoot: makePackageRoot('0.5.0', DEFAULT_SKILLS) })
    expect(statusFor(bumped, '.agents/skills/diagramkit-foo/SKILL.md')).toBe('updated')
    const content = readFileSync(canonicalPath(cwd, 'diagramkit-foo'), 'utf-8')
    expect(content).toContain('version=0.5.0 generator=diagramkit@0.5.0')
  })
})

/* ── Orphan sweep ── */

describe('installSkills — orphan sweep', () => {
  it('removes managed stubs whose skill no longer ships', () => {
    const cwd = makeCwd()
    // Install a package that ships an extra skill, then one that dropped it.
    installSkills({
      cwd,
      packageRoot: makePackageRoot('0.4.0', [
        ...DEFAULT_SKILLS,
        { name: 'diagramkit-old', description: 'Going away.' },
      ]),
    })
    expect(existsSync(canonicalPath(cwd, 'diagramkit-old'))).toBe(true)

    const result = installSkills({ cwd, packageRoot: makePackageRoot('0.5.0', DEFAULT_SKILLS) })
    expect(existsSync(canonicalPath(cwd, 'diagramkit-old'))).toBe(false)
    expect(statusFor(result, '.agents/skills/diagramkit-old/SKILL.md')).toBe('removed')
  })

  it('never touches non-managed skill folders (e.g. prj-foo)', () => {
    const cwd = makeCwd()
    const prjDir = join(cwd, '.agents', 'skills', 'prj-foo')
    mkdirSync(prjDir, { recursive: true })
    writeFileSync(join(prjDir, 'SKILL.md'), '---\nname: prj-foo\ndescription: mine\n---\n')

    installSkills({ cwd, packageRoot: makePackageRoot('0.4.0', DEFAULT_SKILLS) })
    expect(existsSync(join(prjDir, 'SKILL.md'))).toBe(true)
  })

  it('does not sweep a diagramkit-* folder that lacks our marker', () => {
    const cwd = makeCwd()
    const customDir = join(cwd, '.agents', 'skills', 'diagramkit-custom')
    mkdirSync(customDir, { recursive: true })
    // No pointer marker — a hand-authored skill in our namespace.
    writeFileSync(
      join(customDir, 'SKILL.md'),
      '---\nname: diagramkit-custom\ndescription: hand\n---\n',
    )

    installSkills({ cwd, packageRoot: makePackageRoot('0.4.0', DEFAULT_SKILLS) })
    expect(existsSync(join(customDir, 'SKILL.md'))).toBe(true)
  })

  it('does not orphan skills merely excluded by --only', () => {
    const cwd = makeCwd()
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    // Install everything first.
    installSkills({ cwd, packageRoot })
    // Re-run with --only foo — bar is still shipped, so it must not be swept.
    const result = installSkills({ cwd, packageRoot, only: ['foo'] })
    expect(existsSync(canonicalPath(cwd, 'diagramkit-bar'))).toBe(true)
    expect(result.actions.some((a) => a.status === 'removed')).toBe(false)
    expect(result.skills).toEqual(['diagramkit-foo'])
  })
})

/* ── --only ── */

describe('installSkills — --only', () => {
  it('installs only the requested skill (name with or without prefix)', () => {
    const cwd = makeCwd()
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    installSkills({ cwd, packageRoot, only: ['diagramkit-foo'] })
    expect(existsSync(canonicalPath(cwd, 'diagramkit-foo'))).toBe(true)
    expect(existsSync(canonicalPath(cwd, 'diagramkit-bar'))).toBe(false)
  })
})

/* ── dry-run ── */

describe('installSkills — dry-run', () => {
  it('reports planned actions without writing', () => {
    const cwd = makeCwd()
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    const result = installSkills({ cwd, packageRoot, dryRun: true })
    expect(result.mode).toBe('dry-run')
    expect(statusFor(result, '.agents/skills/diagramkit-foo/SKILL.md')).toBe('created')
    expect(existsSync(canonicalPath(cwd, 'diagramkit-foo'))).toBe(false)
  })
})

/* ── --check ── */

describe('installSkills — --check', () => {
  it('reports missing stubs and is not ok before install', () => {
    const cwd = makeCwd()
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    const result = installSkills({ cwd, packageRoot, check: true })
    expect(result.mode).toBe('check')
    expect(result.ok).toBe(false)
    expect(statusFor(result, '.agents/skills/diagramkit-foo/SKILL.md')).toBe('missing')
    expect(existsSync(canonicalPath(cwd, 'diagramkit-foo'))).toBe(false)
  })

  it('is ok after a matching install', () => {
    const cwd = makeCwd()
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    installSkills({ cwd, packageRoot })
    const result = installSkills({ cwd, packageRoot, check: true })
    expect(result.ok).toBe(true)
    expect(result.actions.every((a) => a.status === 'unchanged')).toBe(true)
  })

  it('reports stale stubs after a version bump', () => {
    const cwd = makeCwd()
    installSkills({ cwd, packageRoot: makePackageRoot('0.4.0', DEFAULT_SKILLS) })
    const result = installSkills({
      cwd,
      packageRoot: makePackageRoot('0.5.0', DEFAULT_SKILLS),
      check: true,
    })
    expect(result.ok).toBe(false)
    expect(statusFor(result, '.agents/skills/diagramkit-foo/SKILL.md')).toBe('stale')
  })

  it('reports orphaned managed stubs', () => {
    const cwd = makeCwd()
    installSkills({
      cwd,
      packageRoot: makePackageRoot('0.4.0', [
        ...DEFAULT_SKILLS,
        { name: 'diagramkit-old', description: 'Going away.' },
      ]),
    })
    const result = installSkills({
      cwd,
      packageRoot: makePackageRoot('0.5.0', DEFAULT_SKILLS),
      check: true,
    })
    expect(result.ok).toBe(false)
    expect(statusFor(result, '.agents/skills/diagramkit-old/SKILL.md')).toBe('orphaned')
    // --check must not delete anything.
    expect(existsSync(canonicalPath(cwd, 'diagramkit-old'))).toBe(true)
  })
})

/* ── Result shape (--json payload) ── */

describe('installSkills — result shape', () => {
  it('returns a machine-readable envelope', () => {
    const cwd = makeCwd()
    const packageRoot = makePackageRoot('0.4.0', DEFAULT_SKILLS)
    const result = installSkills({ cwd, packageRoot, harnesses: ['claude', 'codex'] })
    expect(result).toMatchObject({
      version: '0.4.0',
      mode: 'install',
      harnesses: ['claude', 'codex'],
      ok: true,
    })
    for (const action of result.actions) {
      expect(action).toHaveProperty('path')
      expect(action).toHaveProperty('skill')
      expect(action).toHaveProperty('kind')
      expect(action).toHaveProperty('status')
      expect(action.path.startsWith('/')).toBe(false)
    }
  })

  it('throws when the package ships no skills', () => {
    const root = tmp('dk-noskills-')
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'diagramkit', version: '1' }))
    expect(() => installSkills({ cwd: makeCwd(), packageRoot: root })).toThrow(/No skills found/)
  })
})
