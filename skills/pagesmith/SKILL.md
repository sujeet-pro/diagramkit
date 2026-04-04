# Pagesmith Skill

Use this skill when the task involves setting up, extending, migrating, or documenting Pagesmith.

Core rules:

- `@pagesmith/core` provides the content layer; `@pagesmith/docs` adds convention-based documentation
- prefer `defineCollection`, `defineConfig`, and `createContentLayer`
- follow the markdown guidelines in `.pagesmith/markdown-guidelines.md`
- when the repo uses `@pagesmith/docs`, treat `content/README.md` as the home page
- top-level content folders define the main docs navigation
- docs frontmatter may use `sidebarLabel`, `navLabel`, and `order` to shape navigation
- `pagesmith.config.json5` should own footer links and high-level site metadata
- built-in search is Pagefind; do not suggest separate search plugin packages

For the full API reference, read the REFERENCE.md file shipped with the package.

Good outputs include:

- collection schemas and loader configuration
- content-layer queries and rendering examples
- documentation updates for Pagesmith usage
- assistant-context install steps using `@pagesmith/core/ai`
