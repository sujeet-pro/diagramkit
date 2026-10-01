# Diagramkit-specific extras for the Pagesmith docs site

The `.agents/skills/pagesmith-*` stubs are installer-managed pointers into
`node_modules/@pagesmith/*` and are overwritten by `npx pagesmith skills
install` — repo-specific guidance must live here instead. Apply the relevant
section ON TOP of the upstream skill it names.

## `pagesmith-docs-setup`

When you finish the upstream setup flow, also confirm these diagramkit conventions are still satisfied:

1. `pagesmith.config.json5` lives at the repo root and points `contentDir` at `./docs` and `outDir` at `./gh-pages` (matches the diagramkit build pipeline in `package.json`).
2. The build script chain `build:docs` runs `render:docs` first so all `.diagramkit/` SVGs exist before Pagesmith builds the site.
3. `npm run validate:pagesmith` (canonical) and `npm run validate:pagesmith:full` (strict opt-ins) both pass. They invoke the upstream `validateDocs` API which validates **markdown content** (frontmatter, links, images, alt text, theme variants) **and the rendered HTML output** (link integrity, in-page anchors, asset hashes, SVG renderability, required files such as `favicon.svg`/`sitemap.xml`/`robots.txt`/`llms.txt`/`llms-full.txt`).
4. The diagramkit-specific cross-reference checks (`.diagramkit/` source presence + `./path/README.md` link style) defined in [`scripts/validate-pagesmith.ts`](../../../../scripts/validate-pagesmith.ts) still pass.
5. `npm run cicd` (the canonical pre-merge gate) ends with `validate-build.ts` (which scans `gh-pages/**.html` for broken links and SVGs in `docs/**/.diagramkit/` for WCAG 2.2 AA contrast) followed by `validate:pagesmith`.

## `pagesmith-docs-add-page`

After the upstream flow, also enforce these conventions:

1. **Internal links must be `./path/README.md` form.** `validate:pagesmith` rejects bare paths like `./watch-mode` or `/guide/cli` — see [`scripts/lib/docs-rules.ts`](../../../../scripts/lib/docs-rules.ts).
2. **Diagram assets** referenced via `<picture>` or `![]()` must resolve under a sibling `.diagramkit/` directory; rerun `npm run render:docs` whenever you add or rename one.
3. New pages in `docs/reference/diagramkit/**` must mirror the public surface in `src/index.ts`, `src/utils.ts`, and `src/types.ts` (see [`prj-update-docs`](../SKILL.md)).
4. After authoring, run `npm run validate:pagesmith` to validate **markdown content + HTML output** (the upstream `validateDocs` covers both).

For any other diagramkit-specific docs work see [`prj-update-docs`](../SKILL.md).

## `pagesmith-docs-add-search`

- diagramkit currently keeps `search.enabled: true` in [`pagesmith.config.json5`](../../../../pagesmith.config.json5). When changing search options, validate the build with `npm run validate:pagesmith` so the upstream `validateDocs` confirms both content and HTML output still pass.

## `pagesmith-docs-configure-nav`

- Top-level navigation in this repo is driven by the folders under `docs/` (currently `guide/`, `reference/`, `community/`). Keep diagramkit's reference series in `docs/reference/diagramkit/{cli,api,config,types,utils,color,convert}/` and `docs/reference/how-it-works/{pool,manifest,rendering-pipeline,color-processing}/` as documented in [`prj-update-docs`](../SKILL.md).
- After editing `meta.json5` or frontmatter, run `npm run validate:pagesmith` (which runs both content + HTML output validation through the upstream `validateDocs`) to confirm the resulting site builds and links resolve.

## `pagesmith-docs-customize-theme`

- diagramkit currently uses the default Pagesmith theme. If you add `theme.layouts` overrides, place them under `theme/` at the repo root and reference them with paths relative to `pagesmith.config.json5`.
- After any theme change, run `npm run build:docs` and `npm run validate:pagesmith` so the upstream `validateDocs` confirms both markdown content and the rendered HTML still pass.

## `pagesmith-docs-deploy-gh-pages`

- diagramkit deploys docs through its own publish flow; keep the existing `.github/workflows/` files in sync with that flow instead of overwriting them.
- `outDir` is `./gh-pages` and `basePath` is `/diagramkit` (see [`pagesmith.config.json5`](../../../../pagesmith.config.json5)). Do not change either without updating the consuming workflow.
- `npm run cicd` is the canonical pre-merge gate; it runs `validate-build.ts` (which spot-checks `gh-pages/**.html` for broken removed-reference links and scans docs SVGs for WCAG 2.2 AA contrast regressions) followed by `validate:pagesmith` (which runs the upstream `validateDocs` for content + HTML output).

## `pagesmith-generate-docs`

For diagramkit, prefer the project skill [`prj-update-docs`](../SKILL.md) when seeding or refreshing pages from current source. It encodes diagramkit-specific conventions:

- Reference series mapping (`docs/reference/diagramkit/{cli,api,config,types,utils,color,convert}/` ↔ `src/index.ts`, `src/utils.ts`, `src/types.ts`).
- The "do it with an agent" before "do it manually" pattern in every guide page.
- The diagram-asset cross-reference rule and `./path/README.md` link style enforced by [`scripts/validate-pagesmith.ts`](../../../../scripts/validate-pagesmith.ts).

After any generation pass run `npm run validate:pagesmith` so the upstream `validateDocs` confirms both markdown content and HTML output pass.
