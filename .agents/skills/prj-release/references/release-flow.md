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

1. `npm ci`
2. `npm run cicd` — full gate: check, typecheck, build:all, unit, e2e, validate-build.
3. `npm version <type> --no-git-tag-version`
4. Commit + tag `v<version>`, push to `main`.
5. `npm publish --provenance --access public`
6. Create a GitHub Release with the CHANGELOG section.

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
