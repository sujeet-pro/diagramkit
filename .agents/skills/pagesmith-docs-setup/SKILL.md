---
name: pagesmith-docs-setup
description: Bootstrap a new documentation site with @pagesmith/docs in an existing repository. Use when the user wants to add Pagesmith docs to a project, start a docs from scratch, scaffold a docs folder, initialize pagesmith.config.json5, wire the GitHub Pages workflow, or ask an agent to "set up docs" with Pagesmith — even if they don't explicitly name the package.
---

# Pagesmith Docs — Setup (pointer)

This is a **thin pointer**. The canonical, version-matched skill ships with `@pagesmith/docs` and lives at:

- Upstream skill: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-setup/SKILL.md`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-setup/SKILL.md)
- Sibling references: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-setup/references/`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-setup/references/)
- Schemas: [`node_modules/@pagesmith/docs/schemas/`](../../../node_modules/@pagesmith/docs/schemas/)
- Full API/CLI/config reference: [`node_modules/@pagesmith/docs/REFERENCE.md`](../../../node_modules/@pagesmith/docs/REFERENCE.md)

Read and follow the upstream `SKILL.md` exactly. Do not duplicate its content here — the upstream copy auto-upgrades whenever `@pagesmith/docs` is reinstalled, and the local references/recipes/error catalog stay in sync with the installed package version.

## Why this is a pointer

- diagramkit treats `@pagesmith/docs` as the canonical source of truth for Pagesmith setup, page authoring, navigation, search, theming, and GitHub Pages deployment.
- Keeping a local copy of the skill drifts the day a new `@pagesmith/docs` is installed.
- `.claude/skills/pagesmith-docs-setup/SKILL.md` and `.cursor/skills/pagesmith-docs-setup/SKILL.md` already point at this file; this file in turn points at `node_modules/@pagesmith/docs/skills/pagesmith-docs-setup/SKILL.md`.

## Diagramkit-specific extras (apply on top of the upstream skill)

When you finish the upstream setup flow, also confirm these diagramkit conventions are still satisfied:

1. `pagesmith.config.json5` lives at the repo root and points `contentDir` at `./docs` and `outDir` at `./gh-pages` (matches the diagramkit build pipeline in `package.json`).
2. The build script chain `build:docs` runs `render:docs` first so all `.diagramkit/` SVGs exist before Pagesmith builds the site.
3. `npm run validate:pagesmith` (canonical) and `npm run validate:pagesmith:full` (strict opt-ins) both pass. They invoke the upstream `validateDocs` API which validates **markdown content** (frontmatter, links, images, alt text, theme variants) **and the rendered HTML output** (link integrity, in-page anchors, asset hashes, SVG renderability, required files such as `favicon.svg`/`sitemap.xml`/`robots.txt`/`llms.txt`/`llms-full.txt`).
4. The diagramkit-specific cross-reference checks (`.diagramkit/` source presence + `./path/README.md` link style) defined in [`scripts/validate-pagesmith.ts`](../../../scripts/validate-pagesmith.ts) still pass.
5. `npm run cicd` (the canonical pre-merge gate) ends with `validate-build.ts` (which scans `gh-pages/**.html` for broken links and SVGs in `docs/**/.diagramkit/` for WCAG 2.2 AA contrast) followed by `validate:pagesmith`.

## Diagramkit skill catalog (do not delegate these to upstream)

For any diagram-engine, CLI, release, repo-review or docs-sync work, use the `prj-*` skills that live in this repo:

- [`prj-add-diagram-type`](../prj-add-diagram-type/SKILL.md) — add a new engine (PlantUML, D2, Structurizr, …).
- [`prj-add-cli-flag`](../prj-add-cli-flag/SKILL.md) — extend the manual arg parser.
- [`prj-update-docs`](../prj-update-docs/SKILL.md) — sync `docs/**` with current implementation.
- [`prj-review-repo`](../prj-review-repo/SKILL.md) — full repo audit.
- [`prj-release`](../prj-release/SKILL.md) — cut a release through `publish.yml`.

Consumer-facing skills shipped to npm consumers live under `skills/diagramkit-*/SKILL.md` (e.g. [`diagramkit-setup`](../../../skills/diagramkit-setup/SKILL.md), [`diagramkit-auto`](../../../skills/diagramkit-auto/SKILL.md), [`diagramkit-mermaid`](../../../skills/diagramkit-mermaid/SKILL.md), [`diagramkit-excalidraw`](../../../skills/diagramkit-excalidraw/SKILL.md), [`diagramkit-draw-io`](../../../skills/diagramkit-draw-io/SKILL.md), [`diagramkit-graphviz`](../../../skills/diagramkit-graphviz/SKILL.md), [`diagramkit-review`](../../../skills/diagramkit-review/SKILL.md)).
