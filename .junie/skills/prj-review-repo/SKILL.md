---
name: prj-review-repo
description: Full repository review for diagramkit — code quality, tests, architecture, performance, security, docs, AI alignment, skill coverage — with actionable prioritized fix plan. Use when the user asks for a repo audit, production readiness review, or pre-release check.
user_invocable: true
arguments:
  - name: scope
    description: 'Review scope: full, code, tests, docs, skills, ai-alignment, security, performance (default: full)'
    required: false
  - name: fix
    description: 'Auto-fix after review: true | false (default: false)'
    required: false
---

# Review Repository

Perform an exhaustive review of diagramkit against its canonical guidelines. The review is non-destructive by default — it only reads files and writes to `.temp/`. Fixes require explicit approval.

## Read first

Before running, load the references bundled with this skill:

1. [`references/project-context.md`](references/project-context.md) — architecture, module map, public API, extension aliases, expected directory structure.
2. [`references/coding-standards.md`](references/coding-standards.md) — language, formatting, testing, error handling rules to check against.
3. [`references/contributor-workflow.md`](references/contributor-workflow.md) — validation pipeline (`npm run cicd`), `.temp/` convention, release flow, sync rule.
4. [`../prj-update-docs/references/docs-workflow.md`](../prj-update-docs/references/docs-workflow.md) — docs conventions used by the `docs-agent` below.

All findings reference these as the source of truth. Do not invent new rules during review.

## Workflow

### Step 1 — Gather context (orchestrator)

Run validation commands sequentially and record pass/fail:

```bash
npm run check
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
npm audit --audit-level=moderate
npm pack --dry-run
```

Failures become critical findings shared with all review agents.

### Step 2 — Launch review team in parallel

Launch 5 agents in a single message with multiple Task tool calls. Each gets the shared context from Step 1.

| Agent                    | Sections                                    |
| ------------------------ | ------------------------------------------- |
| `code-quality-agent`     | Code quality, architecture, performance     |
| `security-testing-agent` | Test coverage, security                     |
| `ai-alignment-agent`     | .agents/skills/ + CLAUDE/AGENTS/GEMINI sync |
| `docs-agent`             | docs/ content vs. implementation            |
| `opensource-agent`       | Package metadata, GitHub templates, README  |

Each agent outputs findings in this format:

- `[SEVERITY]` critical | major | minor | info
- `[CATEGORY]`
- `File`: `path:line`
- `Issue`: description
- `Fix`: concrete remediation

### Step 3 — Synthesize

1. Collect findings from all agents.
2. Deduplicate overlapping findings.
3. Prioritize critical → major → minor → info.
4. Group by fix phase.

### Step 4 — Write report and plan

Write to `.temp/review/<timestamp>/report.md` and `.temp/review/<timestamp>/plan.md`. Never write outside `.temp/`.

Report template:

```markdown
# Repository Review Report

Generated: <date>
Scope: <scope>

## Summary

| Category      | Critical | Major | Minor | Info |
| ------------- | -------- | ----- | ----- | ---- |
| Code Quality  |          |       |       |      |
| Testing       |          |       |       |      |
| Architecture  |          |       |       |      |
| Performance   |          |       |       |      |
| Security      |          |       |       |      |
| AI Alignment  |          |       |       |      |
| Documentation |          |       |       |      |
| Open Source   |          |       |       |      |

## Findings

### Critical

...

### Major

...

### Minor

...
```

Plan template:

```markdown
# Fix Plan

## Phase 1 — Critical (must fix before release)

1. ...

## Phase 2 — Major (should fix)

1. ...

## Phase 3 — Minor (nice to have)

1. ...

## Validation

After applying fixes:

npm run cicd
```

### Step 5 — Ask for approval

Present the summary to the user:

```
Review complete. Found X critical, Y major, Z minor.

Report: .temp/review/<ts>/report.md
Plan:   .temp/review/<ts>/plan.md

Apply fixes? (all / critical-only / critical+major / review-first)
```

If `fix=true`, skip confirmation and proceed.

### Step 6 — Apply fixes phase-by-phase

For each approved phase:

1. Launch fix agents in parallel for independent files.
2. Run `npm run check:fix && npm run typecheck && npm run build && npm run test:unit` after each phase.
3. If any step fails, spawn a fix-validation agent. Do not advance to the next phase until validation passes.
4. After all phases complete, run `npm run cicd` for the final gate.

## Scoped runs

| Scope          | Agents                                                        |
| -------------- | ------------------------------------------------------------- |
| `full`         | All 5                                                         |
| `code`         | `code-quality-agent`                                          |
| `tests`        | `security-testing-agent` (Testing only)                       |
| `security`     | `security-testing-agent` (Security only)                      |
| `performance`  | `code-quality-agent` (Performance only)                       |
| `docs`         | `docs-agent`                                                  |
| `skills`       | `ai-alignment-agent` (Skills only)                            |
| `ai-alignment` | `ai-alignment-agent` (CLAUDE/AGENTS/GEMINI + .agents/skills/) |

## What each agent checks

### `code-quality-agent`

- ESM / TypeScript conformance to [`references/coding-standards.md`](references/coding-standards.md)
- Error handling patterns (DiagramkitError, graceful sharp fallback)
- Acquire/release pairing in browser pool
- Atomic writes (`.tmp` + rename)
- Dead code, unused exports, circular deps
- Module boundaries match [`references/project-context.md`](references/project-context.md) directory map

### `security-testing-agent`

- Every source module has a colocated `*.test.ts` covering happy path + error paths + edge cases
- E2E coverage: all diagram types, formats, themes, CLI flags, manifest, watch, orphan cleanup
- Input validation (file paths, CLI args, XML/JSON parsing)
- Browser sandbox (no FS/network access from page context)
- Dependencies (`npm audit`)
- No secrets in published files, no postinstall scripts

### `ai-alignment-agent`

- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` list the non-negotiables + pointer to `.agents/skills/prj-<name>/` and consumer-facing `ai-guidelines/{usage,diagram-authoring}.md`; they do not duplicate long guidance.
- `.agents/skills/prj-review-repo/references/project-context.md` matches actual directory structure and exports.
- `.agents/skills/prj-review-repo/references/coding-standards.md` matches current tooling (vite-plus, Oxlint, Oxfmt, Vitest).
- `.agents/skills/prj-<name>/` exists for every listed skill; `.claude/skills/` and `.cursor/skills/` have matching thin pointers with identical frontmatter.
- Root `llms.txt` and `llms-full.txt` are the shipped sources (not under `ai-guidelines/`). They get copied to `gh-pages/` by `scripts/copy-llms.ts` after each docs build.

### `docs-agent`

- Every guide page has "Do it with an agent" section before "Do it manually"
- `reference/diagramkit/` covers cli, api, config, types, utils, color, convert
- `reference/how-it-works/` covers pool, manifest, rendering-pipeline, color-processing
- All links resolve
- All code examples match [`../prj-update-docs/references/docs-workflow.md`](../prj-update-docs/references/docs-workflow.md) conventions and the API surface in [`references/project-context.md`](references/project-context.md)

### `opensource-agent`

- `package.json` `files` includes `dist`, `schemas`, `ai-guidelines`, `skills`, `REFERENCE.md`, `CHANGELOG.md`, and the root `llms*.txt` files
- `exports` map resolves and exposes both `./schemas/diagramkit-cli-render.v1.json` and `./schemas/diagramkit-config.v1.json`
- `engines.node` matches `.node-version`
- GitHub templates (issue, PR, dependabot) present
- `.github/workflows/cicd.yml` and `.github/workflows/publish.yml` wired correctly

## Composability

Non-destructive by default. Produces findings + plan; applies fixes only after approval (or when `fix=true`).

Integrates with:

- `/update-docs` — apply documentation fixes discovered during review.
- `/add-diagram-type`, `/add-cli-flag` — follow-up work surfaced by findings.
