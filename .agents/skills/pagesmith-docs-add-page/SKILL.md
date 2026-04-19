---
name: pagesmith-docs-add-page
description: Add a new page (guide, reference, or home) to an existing @pagesmith/docs site with correct frontmatter, file placement, and sidebar ordering. Use when the user wants to write a new doc page, document a feature in their Pagesmith site, add a quickstart, or extend an existing docs section — even if they don't mention "Pagesmith" explicitly.
---

# Pagesmith Docs — Add Page (pointer)

This is a **thin pointer**. The canonical, version-matched skill ships with `@pagesmith/docs` and lives at:

- Upstream skill: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-add-page/SKILL.md`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-add-page/SKILL.md)
- Sibling references: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-add-page/references/`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-add-page/references/)
- Schema: [`node_modules/@pagesmith/docs/schemas/docs-page-frontmatter.schema.json`](../../../node_modules/@pagesmith/docs/schemas/docs-page-frontmatter.schema.json)
- Full reference: [`node_modules/@pagesmith/docs/REFERENCE.md`](../../../node_modules/@pagesmith/docs/REFERENCE.md)

Read and follow the upstream `SKILL.md` exactly. Do not duplicate its content here — re-installing or upgrading `@pagesmith/docs` keeps the upstream copy in sync with the installed version automatically.

## Diagramkit-specific extras

After the upstream flow, also enforce these conventions:

1. **Internal links must be `./path/README.md` form.** `validate:pagesmith` rejects bare paths like `./watch-mode` or `/guide/cli` — see [`scripts/lib/docs-rules.ts`](../../../scripts/lib/docs-rules.ts).
2. **Diagram assets** referenced via `<picture>` or `![]()` must resolve under a sibling `.diagramkit/` directory; rerun `npm run render:docs` whenever you add or rename one.
3. New pages in `docs/reference/diagramkit/**` must mirror the public surface in `src/index.ts`, `src/utils.ts`, and `src/types.ts` (see [`prj-update-docs`](../prj-update-docs/SKILL.md)).
4. After authoring, run `npm run validate:pagesmith` to validate **markdown content + HTML output** (the upstream `validateDocs` covers both).

For any other diagramkit-specific docs work see [`prj-update-docs`](../prj-update-docs/SKILL.md).
