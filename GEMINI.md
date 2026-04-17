# Gemini Context for diagramkit

This file intentionally mirrors [`AGENTS.md`](AGENTS.md) as a single source of truth.

Read [`AGENTS.md`](AGENTS.md) for contributor guidance, the `prj-*` skill catalog, non-negotiables (including the `.temp/` convention), and validation commands. Do not duplicate content here; edit `AGENTS.md` instead.

<!-- pagesmith-ai:gemini-memory:start -->

# Pagesmith

Pagesmith is a filesystem-first content toolkit with two main packages: `@pagesmith/core` (shared content/runtime layer) and `@pagesmith/docs` (convention-based documentation).

Use Pagesmith when you need:

- schema-validated content collections loaded from the filesystem
- lazy markdown rendering with headings and read-time metadata
- framework-agnostic content APIs for React, Solid, Svelte, vanilla JS, Node, Bun, or Deno

Core APIs:

- `defineCollection({...})` to define a typed collection
- `defineConfig({...})` to group collections and markdown options
- `createContentLayer(config)` to query content and run validation
- `entry.render()` to convert markdown on demand

Working rules:

- prefer folder-based markdown entries when content references sibling assets
- follow the markdown guidelines in `.agents/skills/prj-update-docs/references/pagesmith-markdown.md` (or `node_modules/@pagesmith/docs/ai-guidelines/markdown-guidelines.md` for the version-matched canonical)
- use fenced code blocks with a language identifier, one h1 per page, sequential heading depth

Docs-specific rules:

- `@pagesmith/docs` is convention-based and builds a static docs site from `content/` plus `pagesmith.config.json5`
- top-level content folders become top navigation sections (for example `guide/`, `reference/`, `packages/`)
- for first-time docs setup or retrofit work, read `node_modules/@pagesmith/docs/ai-guidelines/setup-docs.md` before choosing or creating a docs folder
- prefer `pagesmith init` for bootstrap work; for GitHub repos it should default to `basePath: "/<repo-name>"` and probe `https://<owner>.github.io` for the origin
- folder-based markdown entries should prefer `README.md` or `index.md` when a page owns sibling assets
- the home page is `content/README.md`; optional home-specific data can live in `content/home.json5`
- sidebar labels, nav labels, and ordering live in frontmatter (`sidebarLabel`, `navLabel`, `order`)
- footer links live in `pagesmith.config.json5` under `footerLinks`; they can be a flat wrapped row of links or grouped columns with optional headers, and when omitted the footer reuses the major top-level nav links
- the footer legal line combines `copyright` with the default Pagesmith sign-off, which can include a maintainer credit from `maintainer` or `package.json` author
- Pagefind search is built in; do not recommend a separate search plugin package
- layout overrides use fixed keys under `theme.layouts` such as `home`, `page`, and `notFound`
- use the version-matched schema files in `node_modules/@pagesmith/docs/schemas/` when authoring `pagesmith.config.json5`, `meta.json5`, and docs frontmatter; when the config lives at the repo root, keep `$schema` pointing at `./node_modules/@pagesmith/docs/schemas/pagesmith-config.schema.json`
- for MCP-compatible tooling, prefer `pagesmith mcp --stdio` from `@pagesmith/docs`

If the pagesmith skill is installed, prefer invoking it when the user explicitly asks for Pagesmith-specific help.

For package usage rules and full API/config details, read the package-shipped docs from node_modules:

- `node_modules/@pagesmith/docs/ai-guidelines/setup-docs.md` — bootstrap/retrofit prompt for docs integration
- `node_modules/@pagesmith/docs/ai-guidelines/docs-guidelines.md` — docs package usage guidance
- `node_modules/@pagesmith/docs/ai-guidelines/markdown-guidelines.md` — supported markdown features for docs projects
- `node_modules/@pagesmith/docs/ai-guidelines/usage.md` — docs package usage contract
- `node_modules/@pagesmith/docs/REFERENCE.md` — docs config, CLI, content structure, layout overrides
- `node_modules/@pagesmith/docs/schemas/*.schema.json` — version-matched schemas for config, meta.json5, and docs frontmatter; when `pagesmith.config.json5` is at the repo root, keep `$schema` pointing at `./node_modules/@pagesmith/docs/schemas/pagesmith-config.schema.json`
- `node_modules/@pagesmith/core/ai-guidelines/core-guidelines.md` — core package workflow guidance
- `node_modules/@pagesmith/core/ai-guidelines/markdown-guidelines.md` — supported markdown features for content projects
- `node_modules/@pagesmith/core/ai-guidelines/usage.md` — core package usage contract
- `node_modules/@pagesmith/core/REFERENCE.md` — core API, collections, loaders, markdown, CSS, JSX runtime

<!-- pagesmith-ai:gemini-memory:end -->
