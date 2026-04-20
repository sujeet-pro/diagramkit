---
title: Rendering pipeline
description: The data flow a diagram file takes from discovery to final SVG/PNG/JPEG/WebP/AVIF output.
---

# Rendering pipeline

Every rendered file follows the same pipeline, whether triggered by the CLI or the programmatic API.

```text
CLI args / API options
      │
      ▼
Config loading (defaults → global → env → local → overrides)
      │
      ▼
File discovery (findDiagramFiles)
      │
      ▼
Staleness check (manifest + hash)  ──►  skipped files
      │
      ▼
Group by engine type (ENGINE_PROFILES)
      │
      ▼
Per-engine lane scheduling (runWithConcurrency)
      │
      ├──► Browser-backed engines: acquire pool → run IIFE → extract SVG
      │
      └──► Graphviz: render via @viz-js/viz (WASM, no browser)
      │
      ▼
Mermaid aspect-ratio rebalance (per `mermaidLayout` config)
      │   • measure rendered SVG ratio
      │   • if outside band: try direction flip (LR↔TB) and/or ELK init
      │   • pick the candidate closest to target ratio (log-scale distance)
      │
      ▼
Post-processing (WCAG 2.2 AA color contrast on dark SVGs)
      │
      ▼
Optional raster conversion (sharp, per requested format)
      │
      ▼
Atomic write (.tmp + rename) per output
      │
      ▼
Manifest update + orphan cleanup
```

Relevant source files: `src/renderer.ts`, `src/render-all.ts`, `src/render-engines.ts`, `src/mermaid-layout.ts`, `src/engine-profiles.ts`, `src/pool.ts`, `src/convert.ts`, `src/output.ts`, `src/manifest.ts`.

## Key invariants

- **SVG first.** Every render produces an SVG string. Raster formats are always a sharp-based post-processing step on that SVG. If you request `--format svg,png`, we render SVG once and convert once.
- **Per-file isolation.** A render failure in one file logs a warning, increments the fail counter, and continues the batch. Partial output is never written — atomic writes guarantee either a complete output or nothing.
- **Lane concurrency, not file concurrency.** Engines that share browser resources (Mermaid light/dark, Excalidraw, Draw.io) are scheduled into separate lanes; files within a lane render sequentially. The `--max-type-lanes` flag caps how many lanes run concurrently.
- **Graphviz runs on its own lane** because it is WASM-only and does not acquire the browser pool.

## Error propagation

Errors surface as `DiagramkitError` with a specific `DiagramkitErrorCode`. The batch orchestrator (`renderAll`) returns `failedDetails[]` with one entry per failure (`{ file, code, message }`). The CLI `--json` output mirrors this shape — see [schemas/diagramkit-cli-render.v1.json](https://github.com/sujeet-pro/diagramkit/blob/main/schemas/diagramkit-cli-render.v1.json).

## Extending

Adding an engine means implementing `renderX(source, options)` that returns an SVG string, registering it in `render-engines.ts` and `engine-profiles.ts`, and (for browser-backed engines) adding a page method to `BrowserPool`. See the [`add-diagram-type` skill](https://github.com/sujeet-pro/diagramkit/blob/main/.agents/skills/prj-add-diagram-type/SKILL.md).
