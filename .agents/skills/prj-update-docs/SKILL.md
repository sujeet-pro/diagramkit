---
name: prj-update-docs
description: Sync diagramkit's Pagesmith-managed documentation with the current implementation. Use when source code, CLI flags, config schema, or public APIs change, or when the user asks to refresh the docs site.
user_invocable: true
---

# Update Documentation

Read the project implementation and update `docs/` to reflect the current state. Docs are authored with `@pagesmith/docs` and built to `gh-pages/`.

## Read first

1. [`references/docs-workflow.md`](references/docs-workflow.md) — docs conventions and AI-first writing rule.
2. [`references/pagesmith-markdown.md`](references/pagesmith-markdown.md) — Pagesmith markdown features, code block meta, validators (was `.pagesmith/markdown-guidelines.md`).
3. [`../prj-review-repo/references/project-context.md`](../prj-review-repo/references/project-context.md) — canonical API surface, CLI commands, config schema.
4. `pagesmith.config.json5` — site config.
5. `node_modules/@pagesmith/docs/ai-guidelines/*.md` — package usage guidance.
6. `node_modules/@pagesmith/core/ai-guidelines/*.md` — core usage guidance.

## Steps

1. **Survey the site**: read every `docs/**/README.md` and every `docs/**/meta.json5`. Build a map of current pages and their frontmatter.
2. **Survey the code**:
   - `src/index.ts` and `src/utils.ts` — public exports
   - `src/types.ts` — public types
   - `src/config.ts` — config schema and defaults
   - `cli/bin.ts` — commands and flags (`printHelp()`)
3. **Diff**: for every CLI command, flag, API function, and config option, check whether it is documented accurately. Flag every mismatch.
4. **Update**:
   - Fix outdated facts in existing pages.
   - Add new pages for new features. Folder + `README.md`; include frontmatter (`title`, `description`, `sidebarLabel`, `order` as needed).
   - Register new pages in the nearest `meta.json5`.
   - Keep the AI-first rule — every guide page needs "Do it with an agent" before "Do it manually".
5. **Reference series**:
   - `docs/reference/diagramkit/{cli,api,config,types,utils,color,convert}/README.md` must match `src/index.ts`, `src/utils.ts`, and `src/types.ts` exports exactly.
   - `docs/reference/how-it-works/{pool,manifest,rendering-pipeline,color-processing}/README.md` must match the architecture in [`../prj-review-repo/references/project-context.md`](../prj-review-repo/references/project-context.md).
6. **Verify links**: every internal link resolves. Every external link returns 2xx.
7. **Heading hierarchy**: one H1 per page, sequential H2/H3/H4.
8. **Regenerate**:
   - Root `llms.txt` and `llms-full.txt` are the shipped sources for agent-facing reference. Keep them in sync with actual CLI/API behavior when relevant sections change. `scripts/copy-llms.ts` copies them into `gh-pages/` during `npm run build:docs`.
   - Run `npm run build:docs` and confirm no build errors.
9. **Validate**:
   - `npm run validate:pagesmith` after every docs change. It runs both
     content validation (markdown frontmatter, links, images, theme
     variants, alt text) and build-output validation (HTML link integrity,
     in-page anchors, asset hashes, SVG renderability, required files such
     as `favicon.svg`/`sitemap.xml`/`robots.txt`/`llms.txt`/`llms-full.txt`)
     using the published `@pagesmith/docs` validator.
   - It also runs the diagramkit-specific cross-reference: every `<picture>`
     or markdown image whose path lives under `.diagramkit/` must resolve
     to an actually-rendered SVG (so an editor never ships a stale
     `architecture-light.svg` reference without running
     `npm run render:docs`).
   - For the strict opt-in checks
     (`internalLinksMustBeMarkdown`, `requireBothTrailingSlashForms`,
     `requireRasterModernFormats`) use `npm run validate:pagesmith:full`.
   - The full repo gate is `npm run cicd`, which calls
     `validate:pagesmith` after the build + tests.

### Common failure modes and fixes

- **"references missing diagram asset: .diagramkit/foo-light.svg"** — the
  rendered SVG no longer exists. Either rename the markdown reference to
  match the current source filename or rerun `npm run render:docs` to
  regenerate the asset.
- **"Raw `<img>` HTML tag found outside a `<picture>` wrapper"** — wrap the
  snippet in `<picture>` (the validator allows `<img>` inside `<picture>`
  for theme variants) or convert to Markdown image syntax `![]()`.
- **"Missing dark variant" / "Missing light variant"** — the themed
  `<picture>` only shipped one filename. Add the matching `-light` /
  `-dark` source so the theme-variant check accepts the pair.
- **"Required file missing"** — the docs preset normally emits favicon /
  sitemap / robots automatically; if the build skipped one of them, fix
  the build (or temporarily relax the rule with `--no-required-files` only
  while debugging — never check that in).

## Rules

- Preserve existing folder structure unless the user approves a restructure.
- Do not remove pages without explicit confirmation.
- Use relative links for internal cross-references.
- Fenced code blocks must have a language identifier.
- Code examples must match current project conventions (no semicolons, trailing commas, single quotes in TS code).
- Use `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` sparingly and purposefully.
- `sidebarLabel`, `navLabel`, `order` live in frontmatter, not `meta.json5`.

## Output

- Updated `docs/**` files.
- Updated `meta.json5` files if pages were added or reordered.
- A short summary in the PR body or `.temp/update-docs-<timestamp>.md` listing:
  - Pages added
  - Pages updated
  - Pages deleted (with justification)
  - Any remaining mismatches that could not be resolved automatically.
