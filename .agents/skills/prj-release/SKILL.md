---
name: prj-release
description: Cut a diagramkit release. Validates the working tree, runs the full cicd gate, and triggers the publish.yml GitHub Actions workflow with a chosen release_type (patch|minor|major). Use when the user asks to publish, tag, or release a new version.
user_invocable: true
---

# Release diagramkit

Releases are cut by the `.github/workflows/publish.yml` workflow. Local commands are for preparation and dry-runs only — `npm publish` runs inside the workflow with provenance.

## Read first

1. [`references/release-flow.md`](references/release-flow.md) — skill-local extract of preconditions, workflow order, verification, rollback, safety.
2. [`.github/workflows/publish.yml`](../../../.github/workflows/publish.yml) — the actual pipeline.
3. [`.github/workflows/cicd.yml`](../../../.github/workflows/cicd.yml) — the gates the release depends on.
4. [`CHANGELOG.md`](../../../CHANGELOG.md) — current version and pending entries.

Canonical long-form reference (only when you need the full picture): [`../prj-review-repo/references/contributor-workflow.md`](../prj-review-repo/references/contributor-workflow.md).

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

## Steps

### 1. Confirm release type

Ask the user to choose `patch`, `minor`, or `major`:

- `patch` — bug fixes, doc updates, no API changes.
- `minor` — new features, new flags, new exports. No breaking changes.
- `major` — breaking changes to public API, CLI flags, config schema, or engine behavior.

### 2. Finalize CHANGELOG

- Move `## Unreleased` entries into a new `## v<new-version> — <YYYY-MM-DD>` section.
- Ensure entries are categorized (Added / Changed / Fixed / Removed / Deprecated / Security).
- Commit the CHANGELOG update to `main`.

### 3. Dry-run the release

```bash
gh workflow run publish.yml -f release_type=<type> -f dry_run=true
gh run watch
```

Confirm:

- `cicd-gate` passes.
- `npm version` would bump to the expected version.
- `npm publish --dry-run` output lists the expected payload (`dist/`, `schemas/`, `ai-guidelines/`, `skills/`, `REFERENCE.md`, `CHANGELOG.md`).

### 4. Publish

```bash
gh workflow run publish.yml -f release_type=<type> -f dry_run=false
gh run watch
```

The workflow will:

1. `npm ci`
2. `npm run cicd`
3. `npm version <type> --no-git-tag-version`
4. Commit + tag `v<version>`, push to `main`.
5. `npm publish --provenance --access public`
6. Create a GitHub Release with the CHANGELOG section.

### 5. Verify

- `npm view diagramkit version` matches the new tag.
- `gh release view v<version>` shows the release.
- Install in a scratch folder: `npm add diagramkit@latest` and run `npx diagramkit --version`.
- Confirm `https://projects.sujeet.pro/diagramkit/` rebuilt (cicd.yml deploys docs on push to main).

## Rollback

If `npm publish` succeeded but the release is broken:

- For critical issues published <72h ago: `npm unpublish diagramkit@<version>` (rare; confirm with user).
- Otherwise: cut a patch release with the fix. Never rewrite history on `main`.

## Safety notes

- The workflow uses concurrency group `publish` — two releases cannot run simultaneously.
- `contents: write` and `id-token: write` permissions are scoped to `publish.yml` only.
- `secrets.NPM_TOKEN` is the npm automation token; rotate every 90 days.
