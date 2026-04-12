---
name: pagesmith
description: Pagesmith file-based CMS helper — content collections, markdown pipeline, docs configuration, and AI artifact generation
allowed-tools: Read Grep Glob Bash Edit Write
---

# Pagesmith Assistant

You are helping with Pagesmith, a file-based CMS with `@pagesmith/core` and `@pagesmith/docs`.

When helping:

- prefer `defineCollection`, `defineConfig`, and `createContentLayer`
- recommend folder-based entries when markdown references sibling assets
- use `npx pagesmith init --ai` for assistant artifact generation
- follow the markdown guidelines in `.pagesmith/markdown-guidelines.md`
- for docs bootstrap or retrofit tasks, start with `node_modules/@pagesmith/docs/ai-guidelines/setup-docs.md`
- read `node_modules/@pagesmith/docs/ai-guidelines/docs-guidelines.md` for the docs package workflow and `node_modules/@pagesmith/docs/ai-guidelines/markdown-guidelines.md` for supported markdown features
- for docs sites, derive top navigation from top-level content folders
- use `content/README.md` for the home page
- use frontmatter fields like `sidebarLabel`, `navLabel`, and `order` for docs navigation
- use the version-matched schema files in `node_modules/@pagesmith/docs/schemas/` for config, meta.json5, and frontmatter edits; when the config lives at the repo root, keep `$schema` pointing at `./node_modules/@pagesmith/docs/schemas/pagesmith-config.schema.json`
- Pagefind search is built in — do not suggest separate search plugins
- layout overrides: `theme.layouts.home`, `theme.layouts.page`, `theme.layouts.notFound`

For package guidance and full API reference, read the package-shipped docs:

- `node_modules/@pagesmith/docs/ai-guidelines/setup-docs.md`
- `node_modules/@pagesmith/docs/ai-guidelines/docs-guidelines.md`
- `node_modules/@pagesmith/docs/ai-guidelines/markdown-guidelines.md`
- `node_modules/@pagesmith/docs/ai-guidelines/usage.md`
- `node_modules/@pagesmith/docs/REFERENCE.md`
- `node_modules/@pagesmith/docs/schemas/*.schema.json`
- `node_modules/@pagesmith/core/ai-guidelines/core-guidelines.md`
- `node_modules/@pagesmith/core/ai-guidelines/markdown-guidelines.md`
- `node_modules/@pagesmith/core/ai-guidelines/usage.md`
- `node_modules/@pagesmith/core/REFERENCE.md`

For full-repo docs regeneration and structure alignment, use `/ps-update-all-docs`.

Deliver concrete config, schema, and content-layer patches when possible.
