# diagramkit Docs Workflow

How to author and update documentation for diagramkit. Docs are written with **Pagesmith** and live under `docs/`, with build output in `gh-pages/`.

## Information architecture

- Two top-level series: `docs/guide/` (learning path) and `docs/reference/` (lookup).
- `docs/guide/` order (see `docs/guide/meta.json5`):
  1. `ai-agents/` — how to use diagramkit from an AI agent (first, because diagramkit is AI-first)
  2. `getting-started/`
  3. `configuration/`
  4. `cli/`
  5. `js-api/`
  6. `diagrams/` (per-engine subpages)
  7. `watch-mode/`
  8. `image-formats/`
  9. `ci-cd/`
  10. `api-patterns/`
  11. `architecture/`
  12. `design-principles/`
  13. `troubleshooting/`
- `docs/reference/` has two series:
  - `reference/diagramkit/` — per-package reference (cli, api, config, types, utils, color, convert). Currently one package; the shape allows growth.
  - `reference/how-it-works/` — "how this is built" series (pool, manifest, rendering-pipeline, color-processing).

## AI-first writing rule

Every guide page MUST have both sections:

1. **Do it with an agent** — comes first. 2-6 lines. A single agent-facing prompt the user can paste, plus the resulting command(s). Optimized for copy-paste into Claude/Cursor/Codex/Gemini.
2. **Do it manually** — the traditional step-by-step human-readable instructions.

If a page does not have a meaningful agent prompt, place "Do it manually" only and note the reason at the top.

## Pagesmith conventions

- Convention-based. Folder → `README.md` → page. Section ordering comes from `meta.json5` frontmatter `order` or the section's `meta.json5`.
- Home page: `docs/README.md` with DocHome layout. Optional home-specific data in `docs/home.json5`.
- `sidebarLabel`, `navLabel`, and `order` live in frontmatter.
- Use the version-matched `$schema` from `node_modules/@pagesmith/docs/schemas/` in `pagesmith.config.json5`, `meta.json5`, and docs frontmatter.
- Folder-based entries should prefer `README.md` when the page owns sibling assets (diagrams, images).
- Diagrams colocate with their pages (`docs/guide/architecture/render-pipeline.mermaid`). Output goes to `.diagramkit/` next to the source.

## Markdown rules

- One H1 per page; sequential heading depth (H2 → H3 → H4, no jumps).
- Use fenced code blocks with a language identifier (`ts`, `bash`, `json5`, etc.).
- Use `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` callouts sparingly and purposefully.
- No semicolons in `ts`/`js` code examples (match project convention).
- Keep examples copy-pasteable: no placeholder `...` in the middle of runnable snippets.

## Diagram embedding in docs

- Author in `.mermaid`, `.excalidraw`, `.drawio.xml`, or `.dot` next to the page.
- Render with `npx diagramkit render docs/` or `npm run dev:docs` (if integrated).
- Embed with the `<picture>` pattern for theme-aware display:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".diagramkit/<name>-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset=".diagramkit/<name>-light.svg" />
  <img alt="..." src=".diagramkit/<name>-light.svg" />
</picture>
```

## Build and preview

```bash
npm run dev:docs       # live reload dev server
npm run build:docs     # outputs to gh-pages/
npm run preview:docs   # preview built site locally
npm run preview        # build lib + docs, then preview
```

## Deployment

- `.github/workflows/cicd.yml` builds `docs/` on every push to `main` and deploys `gh-pages/` to GitHub Pages. Do not manually push to `gh-pages`.

## Updating docs alongside code

Covered in `contributor-workflow.md` "sync rule". The canonical skill is `.agents/skills/prj-update-docs/SKILL.md`.

## Pagesmith markdown rules

For the markdown features Pagesmith supports (alerts, code block meta, smart typography, math, validators, etc.) read [`pagesmith-markdown.md`](./pagesmith-markdown.md). That file is the contributor-facing copy of the Pagesmith markdown guidelines and replaces the old `.pagesmith/markdown-guidelines.md` at the repo root.

## Pagesmith package references

For advanced authoring and config questions, read the package-shipped docs:

- `node_modules/@pagesmith/docs/ai-guidelines/setup-docs.md` — bootstrap/retrofit prompt
- `node_modules/@pagesmith/docs/ai-guidelines/docs-guidelines.md` — package usage
- `node_modules/@pagesmith/docs/ai-guidelines/markdown-guidelines.md` — supported markdown features (canonical, version-matched)
- `node_modules/@pagesmith/docs/REFERENCE.md` — config, CLI, content structure, layout overrides
- `node_modules/@pagesmith/docs/schemas/*.schema.json` — version-matched schemas
- `node_modules/@pagesmith/core/REFERENCE.md` — core API, collections, loaders, markdown
