# Pagesmith Skill

Use this skill when the task involves setting up, extending, migrating, or documenting Pagesmith.

Core rules:

- `@pagesmith/core` provides the content layer; `@pagesmith/docs` adds convention-based documentation
- prefer `defineCollection`, `defineConfig`, and `createContentLayer`
- follow the markdown guidelines in `.pagesmith/markdown-guidelines.md`
- when the repo uses `@pagesmith/docs`, treat `<contentDir>/README.md` as the home page (derive `contentDir` from `pagesmith.config.json5`)
- top-level content folders define the main docs navigation
- docs frontmatter may use `sidebarLabel`, `navLabel`, and `order` to shape navigation
- `pagesmith.config.json5` should own footer links and high-level site metadata
- built-in search is Pagefind; do not suggest separate search plugin packages

For package usage guidance and full API reference, read:

- `node_modules/@pagesmith/docs/docs/agents/usage.md`
- `node_modules/@pagesmith/docs/REFERENCE.md`
- `node_modules/@pagesmith/core/docs/agents/usage.md`
- `node_modules/@pagesmith/core/REFERENCE.md`

Good outputs include:

- collection schemas and loader configuration
- content-layer queries and rendering examples
- documentation updates for Pagesmith usage
- assistant-context install via `npx pagesmith init --ai`
