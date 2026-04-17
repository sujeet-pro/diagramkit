# Contributing to diagramkit

Thanks for your interest in contributing. This guide covers the basics for getting started.

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). To report security vulnerabilities, see our [Security Policy](SECURITY.md).

## Dev setup

### Prerequisites

Node >= 24 is required (see `.node-version`).

```bash
# Install Node via nvm (recommended)
nvm install    # reads .node-version
nvm use
```

Or download from [nodejs.org](https://nodejs.org/).

### Clone and install

```bash
git clone https://github.com/sujeet-pro/diagramkit.git
cd diagramkit
npm install
npx playwright install chromium
```

On Linux and CI runners, prefer:

```bash
npx playwright install --with-deps chromium
```

Build the project:

```bash
npm run build
```

## Running tests

Run all tests:

```bash
npm test
```

Run only unit tests (fast, no browser required):

```bash
npm run test:unit
```

Watch unit tests while iterating:

```bash
npm run test:unit:watch
```

Run only end-to-end tests (requires Playwright Chromium, build first):

```bash
npm run test:e2e
```

E2E tests require a built dist. Run `npm run build` before `npm run test:e2e`.

Unit tests are colocated with source files (`src/*.test.ts`). E2E tests are vitest-integrated tests that run with `npm run test:e2e`. See `e2e/README.md` for the full test case list.

## Full validation

Before submitting a PR, run the canonical cicd gate:

```bash
npm run cicd
```

This runs (sequentially): lint/format, typecheck, library + docs build, unit tests, e2e tests, and the `validate-build.ts` post-build checks. `npm run validate` is a back-compat alias for the same command. GitHub Actions (`.github/workflows/cicd.yml`) runs the same gates in parallel.

If you only want a fast local check before iterating:

```bash
npm run validate:fast
```

## Code style

- ESM only (`"type": "module"`)
- No semicolons
- Trailing commas
- Async for all rendering paths (Playwright-based)
- Sync FS for file reading (`readFileSync`)
- No CLI framework -- manual arg parsing
- Comments explain reasoning, not what code does
- Section headers use the format `/* ── Name ── */`
- Dynamic imports for optional dependencies (e.g., `sharp`)

Run the linter and formatter:

```bash
npm run check      # check for issues
npm run check:fix  # auto-fix
```

Type-check:

```bash
npm run typecheck
```

## Architecture and AI guidelines

All contributor guidance lives inside the relevant skill under [`.agents/skills/prj-<name>/`](.agents/skills/). Every contributor skill carries the `prj-` prefix. Each skill is self-contained — its `SKILL.md` plus its `references/` folder carry everything needed. The harness-specific folders (`.claude/skills/`, `.cursor/skills/`, `.cursor/commands/`) are thin pointers — edit only the file under `.agents/skills/prj-<name>/`.

Available contributor skills and what they cover:

| Skill                                                                | Purpose                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------- |
| [prj-review-repo](.agents/skills/prj-review-repo/SKILL.md)           | Full repo audit (code, tests, docs, AI alignment, packaging). |
| [prj-update-docs](.agents/skills/prj-update-docs/SKILL.md)           | Sync the Pagesmith docs site with the current implementation. |
| [prj-add-diagram-type](.agents/skills/prj-add-diagram-type/SKILL.md) | Add a new diagram engine.                                     |
| [prj-add-cli-flag](.agents/skills/prj-add-cli-flag/SKILL.md)         | Extend the CLI manual arg parser + config.                    |
| [prj-release](.agents/skills/prj-release/SKILL.md)                   | Cut a release via the `publish.yml` workflow.                 |

The comprehensive references bundled with these skills:

- [`.agents/skills/prj-review-repo/references/project-context.md`](.agents/skills/prj-review-repo/references/project-context.md) — architecture, module map, public API, extension aliases, adding-a-new-diagram-type checklist.
- [`.agents/skills/prj-review-repo/references/coding-standards.md`](.agents/skills/prj-review-repo/references/coding-standards.md) — language, formatting, testing, error handling, browser-pool rules.
- [`.agents/skills/prj-review-repo/references/contributor-workflow.md`](.agents/skills/prj-review-repo/references/contributor-workflow.md) — validation pipeline, `.temp/` convention, sync rule, release flow.
- [`.agents/skills/prj-update-docs/references/docs-workflow.md`](.agents/skills/prj-update-docs/references/docs-workflow.md) — Pagesmith authoring and AI-first writing rules.

`CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` are thin per-client wrappers that list non-negotiables and point at the skills above.

**Sync rule**: when a change affects architecture, public API, CLI flags, config schema, coding conventions, or docs authoring rules, update the matching file under `.agents/skills/prj-<name>/references/` in the same PR. Full mapping in the contributor-workflow reference.

**`.temp/` convention**: all agent-generated plans, reports, and scratch output go under `.temp/` (gitignored). Never commit scratch files.

## Pull request process

1. Create a feature branch from `main`.
2. Make your changes, following the code style above.
3. Add or update tests — unit tests for pure logic, e2e tests for rendering behavior.
4. If the change affects architecture / API / CLI / config, update the matching `ai-guidelines/*.md`.
5. Run `npm run cicd` and confirm it passes.
6. Update `CHANGELOG.md` under `## Unreleased` for user-visible changes.
7. Open a PR against `main`. The PR template auto-applies.

## Maintainer releases

Releases are published with `.github/workflows/publish.yml`. Follow the [`prj-release` skill](.agents/skills/prj-release/SKILL.md) and its [`contributor-workflow.md`](.agents/skills/prj-review-repo/references/contributor-workflow.md) "Cutting a release" section.

Summary:

- Ensure `main` is green on `cicd.yml`.
- Finalize `CHANGELOG.md`.
- `gh workflow run publish.yml -f release_type=<patch|minor|major> -f dry_run=true` to verify.
- Re-run with `dry_run=false` to publish.
