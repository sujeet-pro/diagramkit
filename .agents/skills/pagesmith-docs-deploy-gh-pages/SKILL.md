---
name: pagesmith-docs-deploy-gh-pages
description: Deploy a @pagesmith/docs site to GitHub Pages with a correct basePath, 404 fallback, and a working GitHub Actions workflow. Use when the user wants to publish their Pagesmith docs on GitHub Pages, set up a gh-pages workflow, fix broken asset URLs after deploy, or migrate a repo-hosted docs site to a custom domain.
---

# Pagesmith Docs — Deploy GitHub Pages (pointer)

This is a **thin pointer**. The canonical, version-matched skill ships with `@pagesmith/docs` and lives at:

- Upstream skill: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-deploy-gh-pages/SKILL.md`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-deploy-gh-pages/SKILL.md)
- Sibling references: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-deploy-gh-pages/references/`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-deploy-gh-pages/references/)
- Workflow template: [`node_modules/@pagesmith/docs/REFERENCE.md`](../../../node_modules/@pagesmith/docs/REFERENCE.md) → "GitHub Pages Deployment"

Read and follow the upstream `SKILL.md` exactly. Do not duplicate its content here.

## Diagramkit-specific extras

- diagramkit deploys docs through its own publish flow; keep the existing `.github/workflows/` files in sync with that flow instead of overwriting them.
- `outDir` is `./gh-pages` and `basePath` is `/diagramkit` (see [`pagesmith.config.json5`](../../../pagesmith.config.json5)). Do not change either without updating the consuming workflow.
- `npm run cicd` is the canonical pre-merge gate; it runs `validate-build.ts` (which spot-checks `gh-pages/**.html` for broken removed-reference links and scans docs SVGs for WCAG 2.2 AA contrast regressions) followed by `validate:pagesmith` (which runs the upstream `validateDocs` for content + HTML output).
