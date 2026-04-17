---
title: diagramkit/utils
description: Discovery, manifest, output naming, and atomic write helpers exported from the diagramkit/utils subpath.
---

# diagramkit/utils

The `diagramkit/utils` subpath export gives you the primitives that `renderAll` uses internally, so you can build custom batch pipelines with the same guarantees.

```ts
import {
  findDiagramFiles,
  filterByType,
  readManifest,
  writeManifest,
  updateManifest,
  filterStaleFiles,
  planStaleFiles,
  isStale,
  hashFile,
  cleanOrphans,
  getDiagramsDir,
  ensureDiagramsDir,
  getDiagramType,
  getExtensionMap,
  getMatchedExtension,
  getExtensionsForType,
  getAllExtensions,
  stripDiagramExtension,
  atomicWrite,
  writeRenderResult,
  getExpectedOutputNames,
  getExpectedOutputNamesMulti,
  getOutputFileName,
  getOutputVariants,
  renderGraphviz,
  postProcessDarkSvg,
  validateSvg,
  validateSvgFile,
  validateSvgDirectory,
  formatValidationResult,
} from 'diagramkit/utils'
```

## Discovery

- `findDiagramFiles(dir, config?)` — recursive directory scan that returns every diagram source file matching the current extension map.
- `filterByType(files, type, config?)` — keep only files of a specific `DiagramType`.
- `getDiagramType(filename, map?)` — extension → `DiagramType` mapping, with longest-match-first resolution.
- `getExtensionMap(overrides?)`, `getMatchedExtension(filename, map?)`, `getExtensionsForType(type, map?)`, `getAllExtensions(map?)`, `stripDiagramExtension(filename, map?)` — lower-level extension helpers used by discovery.

## Manifest and staleness

- `readManifest(sourceDir, config?)` / `writeManifest(sourceDir, manifest, config?)` — sync IO on the per-directory `manifest.json`.
- `updateManifest(files, formats?, config?, theme?)` — record a set of rendered files.
- `filterStaleFiles(files, force, formats?, config?, theme?)` — return the subset that needs re-rendering.
- `planStaleFiles(files, force, formats?, config?, theme?)` — stale list with per-file reasons (new, hash changed, missing output, forced).
- `isStale(file, formats?, config?, theme?, manifest?)` — single-file staleness check.
- `hashFile(filePath)` — SHA-256 content hash used for incremental rebuilds.
- `cleanOrphans(files, config?, roots?)` — remove rendered outputs whose source was deleted.

## Output directories and naming

- `getDiagramsDir(sourceDir, config?)` / `ensureDiagramsDir(sourceDir, config?)` — resolve and create the `.diagramkit/` folder for a given source dir.
- `getExpectedOutputNames(name, format?, theme?, naming?)` / `getExpectedOutputNamesMulti(name, formats, theme?, naming?)` — enumerate expected output filenames for a source.
- `getOutputFileName(name, variant, format?, naming?)` — single output name for a given theme variant.
- `getOutputVariants(theme?)` — theme variants array (`['light', 'dark']`, `['light']`, or `['dark']`).
- `atomicWrite(path, content)` — `.tmp` + `renameSync` atomic write. Safe against concurrent readers.
- `writeRenderResult(name, outDir, result, naming?)` — persist a `RenderResult` to disk using the project's naming convention.

## Non-browser rendering

- `renderGraphviz(source, options?)` — Graphviz rendering via `@viz-js/viz` (WASM, no browser). Useful when you want Graphviz without involving the browser pool.

## Color contrast

- `postProcessDarkSvg(svg)` — WCAG contrast optimization for dark SVGs (also exported from `diagramkit/color`).

## SVG validation

- `validateSvg(svg, filePath?, options?)` — structural validation of an SVG string (root element, viewBox/dimensions, visual content, no embedded scripts) plus optional WCAG 2.2 AA contrast scan.
- `validateSvgFile(filePath, options?)` / `validateSvgDirectory(dir, options?)` — validate files on disk. The directory variant accepts `{ recursive?: boolean }` in addition to `SvgValidateOptions`.
- `formatValidationResult(result)` — human-readable formatting of a `SvgValidationResult` for CLI output.

Pass `{ checkContrast: false }` to skip the WCAG scan (useful for hand-authored sources that legitimately use translucent fills). Pass `{ backgroundOverride: '#000' }` when validating SVGs whose effective canvas background is not implied by the `-light` / `-dark` filename suffix.

See [Types](../types/README.md) for the full `DiagramkitConfig`, `RenderResult`, and `SvgValidationResult` shapes.
