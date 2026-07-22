# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Output optimization pipeline** (`src/optimize.ts`) wired into the renderer and raster conversion path, configured via a new `optimize` config section (`schemas/diagramkit-config.v1.json`). `optimize.svg` runs SVGO with an accessibility-preserving, deterministic configuration on every rendered SVG before it is written (and before it is rasterised), and prunes unused CSS rules from Mermaid `<style>` blocks; it defaults to `true` (opt out with `optimize: { svg: false }`). Preserves `viewBox`, `width`/`height`, `role`/`aria-*`/`<title>`/`<desc>`, used `<style>` rules, and IDs referenced by `url(#…)`/CSS/`<use>`.
- **Sharp encoder tuning** via `optimize.png` / `optimize.webp` / `optimize.avif` (and the matching `png`/`webp`/`avif` fields on `ConvertOptions`). Raster encoders now default to the smallest tuned output — PNG `{ compressionLevel: 9, effort: 10 }`, WebP/AVIF `{ effort: 6 }` — and callers may override any knob. New `PngEncoderOptions`, `WebpEncoderOptions`, `AvifEncoderOptions`, `OptimizeOptions` types.
- **`diagramkit skills install`** (`cli/skills-install.ts`) — a first-party, idempotent installer that writes versioned-pointer skill stubs to `.agents/skills/diagramkit-*` plus thin mirrors under each detected/requested harness (`.claude`, `.cursor`, `.codex`, `.continue`). Stubs never copy the skill body — they point at the version-pinned original in `node_modules/diagramkit/skills/`. Supports `--dir`, `--harness`, `--only`, `--check` (CI drift detection), `--dry-run`, and `--json`; re-runs sweep orphaned stubs within the managed `diagramkit-*` namespace.
- **`diagramkit validate` scoping + severity policy** (`cli/validate-policy.ts`): `--scope-dir <name>` restricts a directory scan to SVGs under a directory segment named `<name>`; `--fail-on <CODE,...>` promotes specific issue codes to fatal; `--fail-on-severity <warn|error>` fails on any issue at or above the threshold. The JSON envelope gains a `policy`/`promoted`/`failed` shape, documented in the new `schemas/diagramkit-cli-validate.v1.json` (added to package `exports`).
- **`scopeDir` batch/render option** (`BatchOptions`) mirroring `validate --scope-dir`: `diagramkit render --scope-dir <name>` (and `renderAll({ scopeDir })`) renders only sources under a directory segment named `<name>`. Orphan cleanup still runs against the full discovered set so out-of-scope outputs are preserved.
- **`scripts/validate-build.ts` gates**: cross-file "skills install" consistency (`llms.txt`/`llms-full.txt`/`README.md`/`REFERENCE.md` must all mention it), `package.json` version ↔ `CHANGELOG.md` heading discipline, and a fixture-consumer `diagramkit skills install --check` end-to-end test.
- **`defaultMermaidLightTheme` export + `mermaidLightTheme` render option** (`src/mermaid-theme.ts`, `RenderOptions`/`BatchOptions`) — the light render page now receives injected Mermaid `themeVariables` (previously it used the bare `default` theme), symmetrically to the existing dark path. New public `MermaidThemeVariables` type (`Record<string, string | Record<string, string>>`) allows nested theme sections such as `xyChart`; `mermaidDarkTheme`/`mermaidLightTheme` and the two exported defaults use it.
- **Non-text visibility validation** — two new `diagramkit validate` issue codes, `LOW_CONTRAST_SHAPE` (a box/node effectively invisible against the canvas) and `LOW_CONTRAST_STROKE` (a line/edge/arrow effectively invisible against the canvas), answering "are the boxes, lines, and arrows visible?" alongside the existing text scan. Backed by a new exported `findSvgVisibilityIssues` scanner and `VISIBILITY_MIN_CONTRAST` constant (`src/color/wcag.ts`, re-exported from `diagramkit/color`). The scanner judges non-text objects per visual unit against the page canvas — a node reads as visible if its fill _or_ its border shows — so composite markers, subtle-by-design dark boxes, and subgraph tints are not false-flagged; the threshold is calibrated so the accepted corpus is clean. Promote to fatal like the text scan via `--fail-on LOW_CONTRAST_SHAPE,LOW_CONTRAST_STROKE`.

### Changed

- **`@pagesmith/docs` bumped to 0.10.0** (from 0.9.9). Added runtime deps `css-tree` + `svgo` (and devDep `@types/css-tree`) for the new SVG optimization pipeline.
- **Manifest records a render-pipeline signature** (`optimizeKey` on each `ManifestEntry`, `src/manifest.ts`). Staleness now treats a changed `optimize` config — or upgrading into the optimization pipeline from a pre-`optimize` diagramkit — as stale, so existing consumers re-render once on upgrade and pick up the smaller optimized SVGs without needing `--force`. A new `pipeline_changed` reason surfaces in `render --plan --json`.

### Fixed

- **Occluding backdrops are no longer invisible to the text contrast scan** (`src/color/wcag.ts`). A painted shape with no fill declared anywhere renders solid black (the SVG initial value); the scanner now treats such an unstyled shape as a black backdrop, so label text sitting on it is scored against the bar it actually occupies rather than the page canvas. This surfaces the Mermaid `htmlLabels:false` edge-label bug — `<path class="background">` backdrops emitted with no fill rule paint black on the light canvas and bury the dark label text — which the previous text-only scan reported as a false "0 findings".
- **`diagramkit validate` no longer descends into vendored/build directories** by default when recursing (`node_modules`, `.git`, `gh-pages`, `dist`, `.next`, `.temp`, `out`, `.cache`; `.diagramkit` outputs are still scanned). Prevents false positives from content-hashed copies under `gh-pages/**` and third-party SVGs under `node_modules/**`. Override with the `ignoreDirs` API option.
- **`skills install` canonical stub pointer** now resolves relative to the _resolved_ diagramkit package root instead of a hardcoded `../../../node_modules/diagramkit` string, so pointers stay correct in hoisted monorepos (`cli/skills-install.ts`).
- **Browser launch robustness** (`src/pool.ts`): the pool pins `chromium.launch()` to the same regular-Chromium binary `diagramkit doctor` validates (falling back to Playwright's default, or an explicit `DIAGRAMKIT_CHROMIUM_EXECUTABLE_PATH`), so a missing `chrome-headless-shell` variant no longer makes every render fail while doctor reports healthy.
- **WCAG 2.2 AA text contrast for Mermaid sequence autonumber badges and xychart-beta axis labels** (`src/mermaid-theme.ts`, `src/color/contrast.ts`). Two systematic defects surfaced by a consumer audit of rendered SVGs are fixed:
  - Sequence `autonumber` digits: dark mode rendered `#333333` on the dark canvas (Mermaid's `base` default, ~1.5:1) and light mode rendered `#ffffff` on the light canvas (~1:1). The dark theme now injects `sequenceNumberColor: #e5e5e5` (14.99:1 on `#111111`, 8.23:1 on the `#404040` participant boxes) and the light theme injects `sequenceNumberColor: #333333` (12.63:1 on `#ffffff`, 10.50:1 on `#eaeaea`).
  - xychart-beta axis titles/labels/ticks: dark mode rendered `#404040` on `#111111` (~1.8:1) because the dark post-processing pass darkened the (correct, light) label text. The dark theme now injects an explicit `xyChart` block (`xAxisLabelColor`/`yAxisLabelColor`/titles `#e5e5e5` = 14.99:1; ticks `#cccccc` = 11.76:1 on `#111111`), and `postProcessDarkSvg` no longer darkens `<text>`/`<tspan>` glyph fills (only shape backgrounds) — text must stay light in dark mode.
- **WCAG 2.2 AA text contrast for Mermaid gantt/timeline axis-tick labels** (`src/color/contrast.ts`). Mermaid's d3 axis emitter hardcodes `fill="#000"` on gantt and timeline axis-tick text — no theme variable overrides it — so tick digits (`0`, `1`, … / `09:00`, … / calendar-day markers) were invisible on the dark `#111111` canvas (~1.1:1). `postProcessDarkSvg` now _lightens_ near-black `<text>`/`<tspan>` glyph fills (luminance < 0.15) to a hue-preserving light gray, the mirror image of the existing shape-background darken clamp. Surfaced by a consumer audit of gantt/timeline dark SVGs.
- **`RENDER_PIPELINE_VERSION` bumped `2 → 3 → 4`** (`src/manifest.ts`) so existing consumers' manifests invalidate and diagrams re-render once to pick up the accessible theme colors (v3: sequence/xychart theme injection + no-darken-text; v4: near-black glyph-fill lightening for gantt/timeline ticks).
- **WCAG contrast scanner background resolution for flat-sibling and separated-subtree Mermaid layouts** (`src/color/wcag.ts`). The `findSvgContrastIssues` walker previously attributed every text node to the nearest preceding sibling shape and skipped multi-compound descendant CSS, producing false positives on correctly-rendered gantt, timeline, and ER diagrams. Three targeted fixes, none of which change render output (validation-only, so no `RENDER_PIPELINE_VERSION` bump):
  - Gantt labels drawn outside their bar (`taskTextOutside*`, `sectionTitle*`, `milestoneText`, `titleText`) now resolve against the page canvas instead of the trailing dark task rect the flat-sibling walker last saw.
  - When nothing has painted a background in a text node's subtree, an ancestor-scoped `.section rect { fill }`-style rule now supplies the block colour — timeline sections paint the node block and its label in _separate_ sibling subtrees, so the block fill was previously invisible to the walker (a bogus white-on-white).
  - Multi-ancestor descendant selectors are now parsed: `.edgeLabel .label text` / `.edgeLabel .label rect` resolve the real label text and backing-rect fills, and a scoped `.edgeLabel .label` fill no longer leaks onto unrelated same-named `.label` groups (ER entity attribute rows) where it caused a grey/colour self-match.

## [0.3.3] - 2026-04-20

### Added

- **Mermaid aspect-ratio layout rebalance** (`src/mermaid-layout.ts`) exposed through a new `mermaidLayout` config section (`{ mode, targetAspectRatio, tolerance }`). When enabled the renderer measures the rendered SVG aspect ratio and warns (`ASPECT_RATIO_EXTREME`) or auto-flips / ELK-rebalances flowcharts that fall outside the tolerance band. Schema (`schemas/diagramkit-config.v1.json`) and `docs/reference/diagramkit/{config,types}` updated to match.
- **Expanded SVG validation** (`src/validate.ts`) with additional issue codes and edge-case coverage, surfaced through the CLI `validate` command (`cli/bin.ts`) and the validation API.

### Changed

- **`.github/workflows/publish.yml`** restructured into a parallel dependency graph mirroring `cicd.yml` — `prepare` bakes the release version into the manifests, every quality gate runs against the synced artifact, and `publish` → `tag-and-release` run only after all gates pass. Dependabot config added (`.github/dependabot.yml`).
- **`@pagesmith/docs` bumped to 0.9.9**, picking up the image-zoom modal HTML and asset-emission caps; the shared `rehype-asset-transform` now rewrites `data-zoom-src*` attributes alongside `src`/`srcset`.

## [0.3.2] - 2026-04-19

### Added

- **Pagesmith docs skill pointers** — thin `pagesmith-docs-*` and `pagesmith-generate-docs` pointer skills under `.agents/skills/` (with `.claude/`/`.cursor/` mirrors) that delegate to the version-matched `@pagesmith/docs` originals in `node_modules`.
- **GitHub issue templates** — structured bug-report, feature-request, and docs-report forms plus an updated `config.yml`.

### Changed

- **`scripts/validate-pagesmith.ts`** reworked to feature-detect the upstream `validateDocs` export and degrade gracefully against older `@pagesmith/docs` versions.
- **Docs expansion** — JS-API guide, Mermaid guide, and the `config`/`types` reference pages gained worked examples; `llms.txt`/`llms-full.txt` and `REFERENCE.md` refreshed. CI (`cicd.yml`, `publish.yml`, `setup` composite action) tuned alongside.

## [0.3.1] - 2026-04-17

### Changed

- **CI (`.github/workflows/cicd.yml`) restructured into a real dependency graph.** `lint`, `typecheck`, and `build-lib` run in parallel; layer-1 jobs (`lib-pack-check`, `unit`, `e2e`, `docs-build`) consume the uploaded `dist/` artifact instead of re-running `npm run build:lib`; `validate-build` downloads `dist/` + `gh-pages/` + rendered SVG artifacts. Extracted reusable composite actions `.github/actions/setup` (Node + `npm ci` with lockfile-hashed `node_modules` cache) and `.github/actions/setup-playwright` (cached `~/.cache/ms-playwright`, refreshes apt deps on hit). `publish.yml` now reuses the same composites.
- **`skills/diagramkit-setup/SKILL.md`** now documents the recommended in-package install flow (write thin pointer `SKILL.md` files at `.agents/skills/diagramkit-*` with mirrors in `.claude/`, `.cursor/`, `.codex/`, `.continue/`) that defer to `node_modules/diagramkit/skills/diagramkit-*/SKILL.md`, keeping skills version-pinned to the installed `diagramkit`. `npx skills add sujeet-pro/diagramkit` is documented as the alternative for repos that want skills that update independently of the installed package.
- **`cli/bin.ts`** `--help` and the `--install-skill` removal message now describe both install mechanisms (local pointers into `node_modules` + the standalone `skills` CLI).

### Fixed

- **E2E job on CI lost the `dist/cli/bin.mjs` execute bit** after `actions/upload-artifact@v4` → `download-artifact@v4` (zip strips Unix perms), which broke `spawnSync ./node_modules/.bin/diagramkit` with `EACCES`. Restore `+x` after download.
- **`docs-rendered-svgs` artifact** was empty because `.diagramkit/` (leading dot) is treated as hidden by `actions/upload-artifact@v4` by default. Upload now sets `include-hidden-files: true`, so `validate-build` receives the rendered SVGs it needs to run the WCAG 2.2 AA contrast scan.

### Synced

- `.agents/skills/prj-review-repo/references/contributor-workflow.md` and `project-context.md` describe the new CI graph and reusable composite actions per the AGENTS.md sync rule.

## [0.3.0] - 2026-04-17

### Added

- **WCAG 2.2 AA contrast scanner** (`src/color/wcag.ts`) wired into both the SVG validator (`diagramkit validate`, `validateSvg*` API) and the docs build gate (`scripts/validate-build.ts` now fails the build when any docs SVG drops below AA). Exports `contrastRatio`, `contrastRatioHex`, `findSvgContrastIssues`, `WCAG_AA_NORMAL`, `WCAG_AA_LARGE`, `WCAG_AA_NON_TEXT`, and `defaultBackgroundForFile` from `diagramkit/color`.
- **`diagramkit-review` skill** for audit + repair of every diagram in a repository. Lints sources against the engine authoring rules, force-renders, validates the generated SVGs, and iteratively repairs failures by delegating to each engine's new `Review Mode` section.
- **`Review Mode` sections** in `diagramkit-mermaid`, `diagramkit-excalidraw`, `diagramkit-draw-io`, and `diagramkit-graphviz` skills documenting the per-engine repair tactics consumed by `diagramkit-review`.
- **Validation API surface** (`validateSvg`, `validateSvgFile`, `validateSvgDirectory`, `formatValidationResult`, plus the `SvgValidateOptions`, `SvgValidationResult`, `SvgIssue`, `SvgIssueCode`, `SvgIssueSeverity` types) documented across `docs/reference/diagramkit/api/`, `docs/reference/diagramkit/utils/`, `docs/reference/diagramkit/types/`, and `llms-full.txt`. `SvgValidateOptions` is now also re-exported from `diagramkit/utils`.
- **`scripts/lib/docs-rules.ts`** — pure (no-IO) link-style and diagram-asset rule helpers, with 39 unit tests in `scripts/lib/docs-rules.test.ts` covering clean `./path/README.md` links, anchors, fragments, `.mdx`, top-level `.md` siblings, asset extensions, external schemes, `mailto:`/`tel:`/protocol-relative, fenced + inline code stripping, rejected forms (absolute / relative / trailing-slash / bare token), upper-case extensions, and `<picture>` / `<img>` / markdown image asset references. Wired into `npm run test:unit` via the `scripts/` discovery pattern.
- **Bundled Assets guide** at `docs/guide/bundled-assets/README.md` — an explicit map of every file the npm package ships beyond the JS bundles (REFERENCE.md, llms.txt/llms-full.txt, ai-guidelines/, schemas/, skills/, dist/), with five copy-paste agent prompts that reference each asset by its `node_modules/diagramkit/` path so agents stay anchored on the locally installed version.
- **CLI `validate` documentation** in `docs/guide/cli/README.md`, `docs/reference/diagramkit/cli/README.md`, `llms.txt`, `llms-full.txt`, and `REFERENCE.md`. The command was already implemented and shipped — this release brings the docs back in sync with the code.
- **CLI `--strict` flag** documented across the same surfaces. `--strict` (render-failure strictness) is independent of `--strict-config` (config-validation strictness) and exits non-zero if any single render fails inside a batch.
- **Interactive flag matrix** documented (`--interactive`/`-i`, `--no-interactive`, `--yes`/`-y`) in the CLI guide and reference, plus the bare-`diagramkit` top-level picker behavior.
- **Project-level link-style validation** in `scripts/validate-pagesmith.ts`. Every internal link inside `docs/**` must now use the explicit `./path/README.md` (or `./file.md`) form. Pagesmith rewrites these to clean URLs at build time, but the source file always points at a real markdown source on disk. The pagesmith `internalLinksMustBeMarkdown` resolver check is also enabled unconditionally (previously opt-in via `--full`).
- **SVG validation edge-case tests** covering missing `xmlns`, invalid `viewBox`, whitespace-only content, multi-URL external resource truncation, missing-file behavior, recursive vs top-level directory scans, and non-SVG file skipping.
- **CLI e2e tests for `validate`**: pass case, `--json` output shape, broken-SVG failure path, missing-path error path, and `--strict` propagation in directory render mode.

### Changed

- All internal links inside `docs/**` rewritten from `[text](/section/path)` to relative `[text](./path/README.md)` form so the source-of-truth check (`internalLinksMustBeMarkdown`) and the new project-level link-style check both pass. Frontmatter `actions[].link` URLs in `docs/README.md` keep the URL form because pagesmith handles them as nav buttons.
- **Graphviz dark-mode adapter** now promotes any `<text fill="#xxxxxx">` whose WCAG luminance falls below 0.5 (e.g. `fontcolor="#333333"`, `#444`) to the dark-friendly `#e5e7eb`, so DOT sources authored for light backgrounds remain readable on dark surfaces without dual-color authoring.
- **All consumer engine skills** re-anchored on a measured WCAG 2.2 AA mid-tone palette (Primary `#2E5A88`, Secondary `#1F6E68`, Accent `#B43A3A`, Storage `#8B5E15`, Success `#2D7A2D`, Neutral `#5A5A5A`) with documented contrast ratios. The previous lighter "pastel + white text" combinations measured 2.29:1–3.16:1 against `#ffffff` and now ship with explicit guidance to pair them with dark text or upgrade to the AA palette.
- **`diagramkit/color` and `diagramkit/utils` exports** widened to surface the new contrast utilities and validate-options type so consumers can build their own contrast checks without re-implementing them.

### Fixed

- **`skills/diagramkit-draw-io/SKILL.md` frontmatter** — the YAML block had been corrupted into a Markdown heading (`## name: …` with no closing `---`), which made `validate-build` reject the consumer skill on every CI run. Restored the correct YAML, restored in-list code-block indentation, and re-escaped the XML entity examples (`&amp;`/`&lt;`/`&gt;`/`&quot;`) that an autoformat pass had silently unescaped.
- **`scripts/validate-pagesmith.ts`** is now resilient to `@pagesmith/docs` versions that do not yet ship the `validateDocs` export. Feature-detect the function and gracefully degrade to the diagramkit-specific cross-reference + link-style checks; this unblocks `npm run check` in CI against `@pagesmith/docs@0.9.5`.

### Removed

- **Breaking:** `diagramkit --install-skill` CLI flag and the `src/agent-skill.ts` module that backed it. Skill installation is now delegated to the standalone [`skills`](https://github.com/vercel-labs/skills) CLI from Vercel Labs (`npx skills add sujeet-pro/diagramkit`), so the same diagramkit-\* skills work across 41+ agents (Claude Code, Cursor, Codex, Continue, OpenCode, …) and stay current via `npx skills update sujeet-pro/diagramkit` without bumping the diagramkit npm package. Running the legacy flag now exits with code 1 and prints the replacement command.

### Changed

- All consumer-facing skills (`diagramkit-setup`, `diagramkit-auto`, `diagramkit-mermaid`, `diagramkit-excalidraw`, `diagramkit-draw-io`, `diagramkit-graphviz`) now explicitly anchor on the **locally installed** CLI/API. They read `node_modules/diagramkit/REFERENCE.md` first and run `npx diagramkit ...` (which auto-resolves to `./node_modules/.bin/diagramkit`) so the agent always uses the version pinned in this repo, never a divergent global install.
- Agent-facing docs (`README.md`, `REFERENCE.md`, `llms.txt`, `llms-full.txt`, `ai-guidelines/usage.md`, `docs/guide/getting-started/`, `docs/guide/ai-agents/`, `docs/guide/cli/`, `docs/reference/diagramkit/cli/`) now include copy-paste prompts that bootstrap diagramkit and install all `diagramkit-*` skills via `npx skills add sujeet-pro/diagramkit`, plus prompts for generating diagrams that flow through diagramkit's multi-format SVG/PNG/JPEG/WebP/AVIF rendering.

### Migration

- Replace any `npx diagramkit --install-skill` invocations or scripts with `npx skills add sujeet-pro/diagramkit` (optionally pass `-a <agent>` to target specific agents or `-s <skill>` to pick specific diagramkit-\* skills).
- Re-install skills after upgrading; `npx skills update sujeet-pro/diagramkit` keeps them current independent of the diagramkit npm version.

### Added

- Interactive CLI mode powered by `@clack/prompts`, usable across the whole tool rather than just `diagramkit init`:
  - Running `diagramkit` bare on a TTY now launches a top-level picker (render / validate / init / doctor / warmup).
  - `diagramkit render` automatically enters an interactive wizard when invoked without a target on a TTY; prompts are seeded from the effective `DiagramkitConfig` discovered by walking up from `cwd` (`diagramkit.config.ts`/`.json5`/`.diagramkitrc.json`), falling back to built-in defaults.
  - `diagramkit validate` gets an interactive wizard for target + `--recursive` when run without args.
  - New flags: `--interactive` / `-i` forces the wizard even with args present; `--no-interactive` guarantees the old flag-driven behavior for CI and agents (in addition to existing `--yes`/`-y`). On non-TTY environments `--interactive` warns once and falls back safely.

### Fixed

- CLI startup now resolves symlinked npm bin entrypoints to the real file, so `npx diagramkit`, `./node_modules/.bin/diagramkit`, and direct `dist/cli/bin.mjs` invocation behave consistently for `--version` and normal render commands.

## [0.1.0] - 2026-04-13

### Added

- `diagramkit --install-skill` to scaffold project-level Claude and Cursor skills for repo-local diagram workflows
- `diagramkit doctor` command with `--json` diagnostics for environment readiness (Node, Playwright, Chromium, sharp)
- `diagramkit render --plan --json` for stale-file planning with structured staleness reasons
- Runtime-scoped API via `createRendererRuntime()` for isolated browser pool lifecycle
- Engine capability metadata exports: `ENGINE_PROFILES` and `getEngineProfile()`
- Batch render lane controls: `maxConcurrentLanes` and optional `metrics` in `RenderAllResult`
- Watch-mode tuning options: `debounceMs`, `usePolling`, `pollingInterval`
- Published JSON schema: `schemas/diagramkit-cli-render.v1.json`

### Changed

- Agent onboarding docs and shipped `llms*.txt` guidance now include a copy-paste repo bootstrap flow (`node_modules/diagramkit/llms.txt`, `package.json` script setup, optional `diagramkit.config.json5`, and `--install-skill`)
- `--json` output now uses a versioned envelope (`schemaVersion: 1`) with nested `result`
- CLI supports `diagramkit <file-or-dir>` as alias for `diagramkit render <file-or-dir>`
- Strict config mode is available via `--strict-config` and programmatic `loadConfig(..., { strict: true })`
- Renderer architecture refactored to engine strategies (`render-engines`) and extracted batch orchestrator (`render-all`)
- Browser pool startup/page-init/bundle workflows now use stronger singleflight/coalescing behavior for parallel workloads

### Breaking

- CLI JSON shape changed from legacy root-level render fields to schema-versioned envelope
- `RenderFailureDetail.code` is now required (non-optional) for machine-readable failures

### Migration

- Update CI/automation parsers to read `schemaVersion: 1` envelopes and consume `result.*` fields
- For stale analysis, prefer `diagramkit render . --plan --json` over `--dry-run --json`
- If you relied on warning-only config behavior in automation, opt out of strict mode or update configs to pass `--strict-config`
- For isolated runtimes/tests/services, migrate from singleton lifecycle calls to `createRendererRuntime()`

## [0.0.2] - 2026-04-04

### Fixed

- CI workflow referencing non-existent `build:docs` script (now `build:docs`)
- Docs deployment workflow using stale VitePress output path (now `gh-pages/`)
- Output directory shown as `.diagrams/` instead of `.diagramkit/` in diagram engine guides
- Incorrect `postProcessDarkSvg` import path in JS API docs
- Missing AVIF in feature lists across README and docs
- Stale references in review-repo skill (deleted directories, old script names)
- `ManifestOutput` type docs missing `quality` and `scale` fields
- GitHub issue templates missing Graphviz in diagram type dropdown

### Improved

- Type safety: replaced `any` casts with named `RenderableFile` type in renderer pipeline
- Documentation accuracy across CLI reference, API reference, and llms-full.txt

## [0.0.1] - 2026-03-25 — Initial Release

### Added

- Render `.mermaid`, `.excalidraw`, `.drawio`, and Graphviz `.dot/.gv` files to SVG/PNG/JPEG/WebP/AVIF
- Light and dark theme support with automatic WCAG contrast optimization
- Incremental builds via SHA-256 manifest tracking
- Watch mode for automatic re-rendering on file changes
- CLI (`diagramkit render`, `warmup`, `init`, `--agent-help`)
- Programmatic JavaScript API (`render`, `renderFile`, `renderAll`, `watchDiagrams`)
- SVG-to-raster conversion via optional `sharp` peer dependency
- Configuration layering (defaults, global, local, overrides)
- LLM reference files (`llms.txt`, `llms-full.txt`) and `--agent-help` CLI command

[Unreleased]: https://github.com/sujeet-pro/diagramkit/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/sujeet-pro/diagramkit/compare/v0.2.5...v0.3.0
[0.1.0]: https://github.com/sujeet-pro/diagramkit/compare/v0.0.2...v0.1.0
[0.0.2]: https://github.com/sujeet-pro/diagramkit/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/sujeet-pro/diagramkit/releases/tag/v0.0.1
