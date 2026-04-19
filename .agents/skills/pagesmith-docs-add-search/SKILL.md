---
name: pagesmith-docs-add-search
description: Enable or customize Pagefind-powered full-text search in a @pagesmith/docs site — toggle it on, tune heading weights, scope the index, add a custom search trigger, or fix a broken search box. Use when the user asks about docs search, Pagefind, Cmd+K, or a missing search UI.
---

# Pagesmith Docs — Add Search (pointer)

This is a **thin pointer**. The canonical, version-matched skill ships with `@pagesmith/docs` and lives at:

- Upstream skill: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-add-search/SKILL.md`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-add-search/SKILL.md)
- Sibling references: [`node_modules/@pagesmith/docs/skills/pagesmith-docs-add-search/references/`](../../../node_modules/@pagesmith/docs/skills/pagesmith-docs-add-search/references/)
- Full reference: [`node_modules/@pagesmith/docs/REFERENCE.md`](../../../node_modules/@pagesmith/docs/REFERENCE.md)

Read and follow the upstream `SKILL.md` exactly. Do not duplicate its content here.

## Diagramkit-specific extras

- diagramkit currently keeps `search.enabled: true` in [`pagesmith.config.json5`](../../../pagesmith.config.json5). When changing search options, validate the build with `npm run validate:pagesmith` so the upstream `validateDocs` confirms both content and HTML output still pass.
