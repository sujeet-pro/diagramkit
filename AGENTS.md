# Agent Context for diagramkit

diagramkit is a standalone CLI and library that renders `.mermaid`, `.excalidraw`, `.drawio`, and Graphviz `.dot`/`.gv` files to SVG/PNG/JPEG/WebP/AVIF with automatic light/dark mode.

This file is the single source of truth for contributor guidance. [`CLAUDE.md`](CLAUDE.md) and [`GEMINI.md`](GEMINI.md) are thin redirects that point here; do not duplicate content across them. Cursor reads both `AGENTS.md` and the pointer files under `.cursor/skills/` / `.cursor/commands/`.

## How contributor work is organized

All contributor guidance lives **inside the relevant skill** under `.agents/skills/prj-<name>/`. Every contributor skill carries the `prj-` prefix so it never clashes with consumer-facing `diagramkit-*` skills. Each skill is self-contained — its `SKILL.md` plus its `references/` folder carry everything that skill needs. The harness-specific folders (`.claude/skills/`, `.cursor/skills/`, `.cursor/commands/`) are thin pointers to `.agents/skills/prj-<name>/SKILL.md`; never edit them directly.

Skill layering used in this repo (do not deviate without changing both this section and `scripts/validate-build.ts`):

- `.claude/skills/<name>/SKILL.md` and `.cursor/skills/<name>/SKILL.md` — thin frontmatter-only pointers that delegate to `.agents/skills/<name>/SKILL.md`. Generated/edited only when the canonical changes.
- `.agents/skills/prj-*` — canonical contributor skills. Self-contained with sibling `references/`.
- `.agents/skills/pagesmith-docs-*`, `.agents/skills/pagesmith-generate-docs` — **thin pointers** that delegate to `node_modules/@pagesmith/docs/skills/<name>/SKILL.md`. The upstream skill is the version-matched source of truth; never copy its body into this repo, just keep diagramkit-specific extras inside the pointer file.
- `skills/diagramkit-*` — consumer-facing skills shipped to npm consumers. Edit these for diagram-engine and CLI consumer guidance; they are the only skills folder included in the published tarball.

Available contributor skills:

| Skill                                                                | Use when                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------- |
| [prj-review-repo](.agents/skills/prj-review-repo/SKILL.md)           | Full repo audit (code, tests, docs, AI alignment, packaging). |
| [prj-update-docs](.agents/skills/prj-update-docs/SKILL.md)           | Sync the Pagesmith docs site with the current implementation. |
| [prj-add-diagram-type](.agents/skills/prj-add-diagram-type/SKILL.md) | Add a new diagram engine (e.g. PlantUML, D2, Structurizr).    |
| [prj-add-cli-flag](.agents/skills/prj-add-cli-flag/SKILL.md)         | Extend the CLI manual arg parser + config.                    |
| [prj-release](.agents/skills/prj-release/SKILL.md)                   | Cut a release via the `publish.yml` workflow.                 |

The comprehensive references (when you need them directly, outside a skill invocation):

- [`.agents/skills/prj-review-repo/references/project-context.md`](.agents/skills/prj-review-repo/references/project-context.md) — architecture, module map, public API, extension aliases, adding-a-new-diagram-type checklist.
- [`.agents/skills/prj-review-repo/references/coding-standards.md`](.agents/skills/prj-review-repo/references/coding-standards.md) — language, formatting, testing, error handling, browser-pool rules.
- [`.agents/skills/prj-review-repo/references/contributor-workflow.md`](.agents/skills/prj-review-repo/references/contributor-workflow.md) — validation pipeline, `.temp/` convention, release flow, sync rule.
- [`.agents/skills/prj-update-docs/references/docs-workflow.md`](.agents/skills/prj-update-docs/references/docs-workflow.md) — docs authoring and AI-first writing rules.

Consumer-facing agent docs (shipped to npm):

- [`ai-guidelines/usage.md`](ai-guidelines/usage.md) — setup prompts and CLI quick reference for consumers.
- [`ai-guidelines/diagram-authoring.md`](ai-guidelines/diagram-authoring.md) — exhaustive diagram authoring guide.
- [`llms.txt`](llms.txt), [`llms-full.txt`](llms-full.txt) — LLM context files shipped at the package root.

## Non-negotiables

- **Plan before implementation** for any non-trivial change.
- **`.temp/` is the only scratch location.** All plans, reports, cloned reference repos, and ad-hoc notes go under `.temp/<category>/<name>` (gitignored). Never write outside `.temp/`.
- **Sync rule**: when code changes affect architecture, public API, CLI flags, config schema, coding conventions, or docs rules, update the matching file under `.agents/skills/prj-<name>/references/` **in the same PR**. Full mapping in [`contributor-workflow.md`](.agents/skills/prj-review-repo/references/contributor-workflow.md).
- **Validate with `npm run cicd`** before declaring any meaningful change done.
- **Prefer repo evidence over memory.** Read the actual source when asked about behavior.

## Validation

```bash
npm run cicd                       # canonical pre-merge gate
npm run check                      # fast lint + format
npm run typecheck                  # tsc --noEmit
npm run test:unit                  # fast, no browser
npm run test:e2e                   # slow, needs Playwright warmup
npm run validate:pagesmith         # markdown content + rendered HTML output (via @pagesmith/docs validateDocs)
npm run validate:pagesmith:full    # adds opt-in strict checks (raster modern formats, both trailing-slash forms)
```

Docs validation covers both `.md` content and the built HTML output under `gh-pages/`. `npm run cicd` runs:

1. `scripts/validate-build.ts` — SKILL.md frontmatter + mirror checks, package.json `files`/`exports`, schemas, gh-pages broken-link spot-check, docs SVG WCAG 2.2 AA contrast scan.
2. `npm run validate:pagesmith` — calls upstream `@pagesmith/docs` `validateDocs`, which validates markdown frontmatter/links/images/alt-text/theme-variants **and** the rendered HTML output (link integrity, in-page anchors, asset hashes, SVG renderability, required output files like `favicon.svg`, `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`). Plus the diagramkit-specific cross-reference (`.diagramkit/` source must exist) and link-style (`./path/README.md`) rules from `scripts/validate-pagesmith.ts`.

<!-- pagesmith-ai:codex-memory:start -->

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

If the Pagesmith skill is installed for Codex, prefer using it for Pagesmith-specific setup, migration, and content-layer tasks.

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
<!-- pagesmith-ai:codex-memory:end -->
