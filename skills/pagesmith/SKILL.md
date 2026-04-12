# Pagesmith Skill

Use this skill when the task involves setting up, extending, migrating, or documenting Pagesmith.

Core rules:

- `@pagesmith/core` provides the content layer; `@pagesmith/docs` adds convention-based documentation
- prefer `defineCollection`, `defineConfig`, and `createContentLayer`
- follow the markdown guidelines in `.pagesmith/markdown-guidelines.md`
- when bootstrapping or retrofitting docs, start with `node_modules/@pagesmith/docs/ai-guidelines/setup-docs.md`
- read `node_modules/@pagesmith/docs/ai-guidelines/docs-guidelines.md` and `node_modules/@pagesmith/docs/ai-guidelines/markdown-guidelines.md` before changing docs structure or authored markdown
- when the repo uses `@pagesmith/docs`, treat `content/README.md` as the home page
- top-level content folders define the main docs navigation
- docs frontmatter may use `sidebarLabel`, `navLabel`, and `order` to shape navigation
- `pagesmith.config.json5` should own footer links and high-level site metadata
- use the version-matched schema files in `node_modules/@pagesmith/docs/schemas/` for config, meta.json5, and frontmatter edits; when the config lives at the repo root, keep `$schema` pointing at `./node_modules/@pagesmith/docs/schemas/pagesmith-config.schema.json`
- built-in search is Pagefind; do not suggest separate search plugin packages

For package usage guidance and full API reference, read:

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

Good outputs include:

- collection schemas and loader configuration
- content-layer queries and rendering examples
- documentation updates for Pagesmith usage
- assistant-context install via `npx pagesmith init --ai`
