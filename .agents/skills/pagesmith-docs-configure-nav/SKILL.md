---
name: pagesmith-docs-configure-nav
description: Configure sidebar, top-nav, and section ordering in a @pagesmith/docs site using meta.json5 files and page frontmatter. Use when the user wants to reorder, hide, rename, group, pin, or add external links to docs navigation, or when a page is missing from the sidebar.
---

# Pagesmith Docs — Configure Navigation (pointer)

This is a **thin pointer**. The canonical, version-matched skill ships with `@pagesmith/docs` and lives at:

- Upstream skill: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-configure-nav/SKILL.md`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-configure-nav/SKILL.md)
- Sibling references: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-configure-nav/references/`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-configure-nav/references/)
- Schemas: [`docs-section-meta.schema.json`](../../../node_modules/@pagesmith/docs/schemas/docs-section-meta.schema.json), [`docs-root-meta.schema.json`](../../../node_modules/@pagesmith/docs/schemas/docs-root-meta.schema.json)
- Full reference: [`node_modules/@pagesmith/docs/REFERENCE.md`](../../../node_modules/@pagesmith/docs/REFERENCE.md)

Read and follow the upstream `SKILL.md` exactly. Do not duplicate its content here.

## Diagramkit-specific extras

- Top-level navigation in this repo is driven by the folders under `docs/` (currently `guide/`, `reference/`, `community/`). Keep diagramkit's reference series in `docs/reference/diagramkit/{cli,api,config,types,utils,color,convert}/` and `docs/reference/how-it-works/{pool,manifest,rendering-pipeline,color-processing}/` as documented in [`prj-update-docs`](../prj-update-docs/SKILL.md).
- After editing `meta.json5` or frontmatter, run `npm run validate:pagesmith` (which runs both content + HTML output validation through the upstream `validateDocs`) to confirm the resulting site builds and links resolve.
