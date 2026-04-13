# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

- CI workflow referencing non-existent `build:docs` script (now `docs:build`)
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

[Unreleased]: https://github.com/sujeet-pro/diagramkit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sujeet-pro/diagramkit/compare/v0.0.2...v0.1.0
[0.0.2]: https://github.com/sujeet-pro/diagramkit/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/sujeet-pro/diagramkit/releases/tag/v0.0.1
