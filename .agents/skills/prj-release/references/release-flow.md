# diagramkit Release Flow (skill-local extract)

Self-contained reference for the `prj-release` skill. Extracts the release-relevant bits of `contributor-workflow.md` so this skill needs nothing else. Keep in sync with the canonical file under `.agents/skills/prj-review-repo/references/contributor-workflow.md`.

## Release entrypoint

Releases are cut by [`.github/workflows/publish.yml`](../../../../.github/workflows/publish.yml). Local commands are for preparation and dry-runs only — `npm publish` runs inside the workflow with provenance.

## Inputs

| Input          | Type           | Purpose                                                                                                         |
| -------------- | -------------- | --------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| `release_type` | `choice: patch | minor                                                                                                           | major` | Required. Bumps version accordingly. |
| `dry_run`      | `boolean`      | Optional. When true, runs cicd + `npm version --dry-run` + `npm publish --dry-run` but does not publish or tag. |

## Preconditions

- Working tree is clean on `main` (no uncommitted changes, no unpushed commits).
- Latest `cicd.yml` run on `main` is green.
- `CHANGELOG.md` has a populated `## Unreleased` section covering all merged PRs since the last tag.

Check with:

```bash
git status
git log origin/main..HEAD
gh run list --workflow=cicd.yml --branch=main --limit=5
```

## Release type chart

| Type    | Use when                                                           |
| ------- | ------------------------------------------------------------------ |
| `patch` | Bug fixes, doc updates, no API changes.                            |
| `minor` | New features, new flags, new exports. No breaking changes.         |
| `major` | Breaking changes to public API, CLI flags, config schema, engines. |

## Workflow order (what publish.yml runs)

The workflow runs the same gates as `cicd.yml` but in parallel jobs (no
single sequential `npm run cicd` step), so a failed gate does not hide
other failures and the wall-clock release time is roughly the slowest
gate (`e2e` or `docs-build`) instead of the sum.

1. `prepare` — `npm version <type> --no-git-tag-version`, refresh
   `package-lock.json`, upload `package.json` + `package-lock.json` as
   the `release-manifests` artifact (no git commit/tag yet).
2. Parallel gates, all consuming `release-manifests`:
   - `lint` — `npm audit --audit-level=moderate` + `npm run check`.
   - `typecheck` — `npm run typecheck`.
   - `build-lib` — `npm run build:lib`, uploads the `dist` artifact.
3. Tier-2 gates that consume the `dist` artifact (parallel):
   - `lib-pack-check` — `npm pack --dry-run`.
   - `unit` — `npm run test:unit`.
   - `e2e` — `npm run test:e2e` (chromium cached).
   - `docs-build` — render docs via the built CLI, build the pagesmith
     site, copy llms files, upload `gh-pages` + rendered SVG artifacts.
4. `validate-build` — runs `scripts/validate-build.ts` against the
   downloaded `dist`, `gh-pages`, and rendered SVG artifacts.
5. `publish` — needs every gate above. Downloads `release-manifests` +
   `dist` and runs `npm publish --provenance --access public --ignore-scripts`
   (or `--dry-run --ignore-scripts` when `dry_run=true`). `--ignore-scripts`
   skips the `prepack` rebuild because `build-lib` already produced the
   exact artifact we publish.
6. `tag-and-release` — only when `dry_run=false`. Commits the synced
   manifests as `release: v<version>`, tags `v<version>`, pushes to the
   workflow's branch with `--follow-tags`, and creates a GitHub Release
   via `gh release create --generate-notes`.
7. `summary` — `if: always()`. Aggregates every job result so a single
   status check surfaces every failure; treats `tag-and-release` as
   intentionally skipped on dry runs.

## Finalize CHANGELOG

- Move `## Unreleased` entries into a new `## v<new-version> — <YYYY-MM-DD>` section.
- Ensure entries are categorized: Added / Changed / Fixed / Removed / Deprecated / Security.
- Commit the CHANGELOG update to `main` **before** triggering the workflow.

## Dry-run

```bash
gh workflow run publish.yml -f release_type=<type> -f dry_run=true
gh run watch
```

Confirm:

- `cicd` passes.
- `npm version` would bump to the expected version.
- `npm publish --dry-run` output lists the expected payload: `dist/`, `schemas/`, `ai-guidelines/`, `skills/`, `REFERENCE.md`, `CHANGELOG.md`, `llms.txt`, `llms-full.txt`.

## Publish

```bash
gh workflow run publish.yml -f release_type=<type> -f dry_run=false
gh run watch
```

## Verify

- `npm view diagramkit version` matches the new tag.
- `gh release view v<version>` shows the release.
- `npm add diagramkit@latest` in a throwaway directory **outside** this repo (e.g. `$(mktemp -d)`; never inside the diagramkit checkout — the `.temp/` non-negotiable applies only to in-repo scratch). Then `npx diagramkit --version` should resolve to the new release.
- `https://projects.sujeet.pro/diagramkit/` rebuilt (cicd.yml deploys docs on push to main).

## Rollback

- For critical issues published <72h ago: `npm unpublish diagramkit@<version>` (rare; confirm with user).
- Otherwise: cut a patch release with the fix. Never rewrite history on `main`.

## Safety

- Concurrency group `publish` — two releases cannot run simultaneously.
- `contents: write` and `id-token: write` permissions are scoped to `publish.yml` only.
- `secrets.NPM_TOKEN` is the npm automation token; rotate every 90 days.
