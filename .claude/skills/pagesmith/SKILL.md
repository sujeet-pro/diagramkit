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
- for docs sites, derive top navigation from top-level content folders
- use `<contentDir>/README.md` for the home page (derive `contentDir` from `pagesmith.config.json5`; in this repo it is `docs/README.md`)
- use frontmatter fields like `sidebarLabel`, `navLabel`, and `order` for docs navigation
- Pagefind search is built in — do not suggest separate search plugins
- layout overrides: `theme.layouts.home`, `theme.layouts.page`, `theme.layouts.notFound`

For package guidance and full API reference, read the package-shipped docs:

- `node_modules/@pagesmith/docs/docs/agents/usage.md`
- `node_modules/@pagesmith/docs/REFERENCE.md`
- `node_modules/@pagesmith/core/docs/agents/usage.md`
- `node_modules/@pagesmith/core/REFERENCE.md`

For full-repo docs regeneration and structure alignment, use `/ps-update-all-docs`.

Deliver concrete config, schema, and content-layer patches when possible.
