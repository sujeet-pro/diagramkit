# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-03-25 — Initial Release

### Added

- Render `.mermaid`, `.excalidraw`, and `.drawio` files to SVG/PNG/JPEG/WebP
- Light and dark theme support with automatic WCAG contrast optimization
- Incremental builds via SHA-256 manifest tracking
- Watch mode for automatic re-rendering on file changes
- CLI (`diagramkit render`, `warmup`, `init`, `install-skills`)
- Programmatic JavaScript API (`render`, `renderFile`, `renderAll`, `watchDiagrams`)
- SVG-to-raster conversion via optional `sharp` peer dependency
- Configuration layering (defaults, global, local, overrides)
- Claude Code skills for LLM-assisted diagram generation

[Unreleased]: https://github.com/sujeet-pro/diagramkit/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/sujeet-pro/diagramkit/releases/tag/v0.0.1
