# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
