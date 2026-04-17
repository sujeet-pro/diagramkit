# diagramkit Contributor Workflow

How to make changes to diagramkit safely. Applies to every contributor-facing agent (Claude, Codex, Cursor, Gemini) and to humans.

## Non-negotiable rules

1. **Plan before implementation** for any non-trivial change. Use the Cursor/Claude plan mode, or write a plan to `.temp/plans/<name>.md`.
2. **Validate every meaningful change** with `npm run cicd` before declaring work done.
3. **Keep skill references in sync with the code.** If a change alters:

- project architecture or module layout → update `.agents/skills/prj-review-repo/references/project-context.md`
- public API surface (exports from `src/index.ts`, subpath exports) → update the "Key APIs" section of `project-context.md`
- CLI flags or commands → update `project-context.md`, the consumer-facing `ai-guidelines/usage.md`, root `llms.txt`/`llms-full.txt`, and `docs/reference/diagramkit/cli/README.md`
- config schema → update `project-context.md`, `docs/reference/diagramkit/config/README.md`, and any `defineConfig` examples
- coding conventions → update `.agents/skills/prj-review-repo/references/coding-standards.md`
- docs authoring rules → update `.agents/skills/prj-update-docs/references/docs-workflow.md`
- contributor workflow → update this file
  The sync must happen in the same PR as the code change.

4. **Prefer repo evidence over memory.** Read the actual source when answering a question about behavior.

## `.temp/` convention

All agent-generated or ad-hoc scratch output lives under `.temp/` at the repo root. `.temp/` is gitignored.

| Path                           | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `.temp/plans/<name>.md`        | Plans written during plan mode or brainstorming |
| `.temp/reports/<name>.md`      | Review reports, audit findings                  |
| `.temp/review/<timestamp>/`    | Output of `/review-repo` skill runs             |
| `.temp/reference-repo/<repo>/` | Cloned reference repos used for analysis        |
| `.temp/benchmarks/`            | Perf experiments, render timings                |

Never write ad-hoc files outside `.temp/`. Never commit `.temp/` contents.

## Validation pipeline

`npm run cicd` is the single canonical pre-merge check. It runs these steps sequentially:

| Step              | Command                         | What it verifies                                          |
| ----------------- | ------------------------------- | --------------------------------------------------------- |
| 1. Lint/format    | `npm run check`                 | Oxlint + Oxfmt pass                                       |
| 2. Typecheck      | `npm run typecheck`             | `tsc --noEmit`                                            |
| 3. Build all      | `npm run build:all`             | `vp pack` (lib) + `pagesmith build` (docs)                |
| 4. Unit tests     | `npm run test:unit`             | `vp test run src/`                                        |
| 5. E2E tests      | `npm run test:e2e`              | `vp test run e2e/` (Playwright + built dist)              |
| 6. Validate build | `tsx scripts/validate-build.ts` | `npm pack --dry-run` payload, SKILL.md frontmatter, links |

`npm run validate` is a back-compat alias for `npm run cicd`.

For fast local iteration, run individual steps:

```bash
npm run check            # format + lint
npm run check:fix        # autofix
npm run typecheck        # tsc
npm run test:unit        # fast, no browser
npm run test:e2e         # slow, needs warmup
npm run build            # lib only
npm run build:all        # lib + docs
```

## GitHub Actions

CI uses the same gates as `npm run cicd`, but parallelized:

- `.github/workflows/cicd.yml` — runs on push to `main`, on PRs, and via `workflow_dispatch`. Each gate (`check`, `typecheck`, `unit`, `e2e`, `lib-build`, `docs-build`, `validate-build`) runs as an independent job with a shared setup cache. A `summary` job gates branch protection. On pushes to `main`, `deploy-docs` publishes the built `gh-pages/` artifact.
- `.github/workflows/publish.yml` — manual release. Inputs: `release_type` (choice: `patch`/`minor`/`major`) and `dry_run` (boolean). Runs `npm run cicd`, bumps version, commits, tags, publishes to npm (with provenance), creates a GitHub Release.

### Cutting a release

1. Ensure `main` is green on the `cicd.yml` workflow.
2. Go to **Actions → publish → Run workflow**.
3. Pick `release_type` and run. Use `dry_run: true` the first time to verify wiring.
4. Watch the run. The workflow handles the version bump, changelog header, tag, `npm publish --provenance --access public`, and GitHub Release.

## `.agents/skills/` — canonical contributor skills

Task-specific playbooks live under `.agents/skills/prj-<name>/`:

| Skill              | When to use                                       |
| ------------------ | ------------------------------------------------- |
| `review-repo`      | Full repo audit (code, tests, docs, AI alignment) |
| `update-docs`      | Sync docs with implementation changes             |
| `add-diagram-type` | Add a new diagram engine (e.g. PlantUML)          |
| `add-cli-flag`     | Extend the manual arg parser + docs               |
| `release`          | Cut a release via the `publish.yml` workflow      |

Client-specific folders (`.claude/skills/`, `.cursor/skills/`, `.cursor/commands/`) are thin pointers. When authoring or updating a skill, edit the file under `.agents/skills/prj-<name>/` only.

## Commit and PR etiquette

- Write commits that describe **why**, not what. The diff shows what.
- Reference the impacted `ai-guidelines/*.md` files in the PR body when the sync rule applies.
- Group related changes into a single commit; split unrelated changes.
- Never commit `.temp/`, `node_modules/`, `dist/`, `gh-pages/`, or `.diagramkit/` output.

## When to ask

Stop and ask the user if:

- Requirements are ambiguous or have meaningful trade-offs.
- A change touches public API shape, subpath exports, or the config schema.
- A dependency would be added or upgraded across a major version.
- The `cicd` pipeline fails for reasons the fix-in-place rule does not cover (e.g. a flaky e2e that needs a structural change).
