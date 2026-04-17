---
title: API Reference
description: Complete function reference for all public exports from diagramkit.
---

# API Reference

## Core Rendering

### `ENGINE_PROFILES`

```ts
interface DiagramEngineProfile {
  /** Runtime type: 'chromium' for browser-backed engines, 'wasm' for in-process */
  runtime: 'chromium' | 'wasm'
  /** Whether this engine needs a BrowserPool instance */
  requiresBrowserPool: boolean
  /** Whether renders must be serialized within a type lane */
  serializedWithinLane: boolean
  /** Ordering priority for lane scheduling (lower runs first) */
  laneOrder: number
}

const ENGINE_PROFILES: Record<DiagramType, DiagramEngineProfile>
```

Static engine metadata used by the render pipeline and CLI planning.

### `getEngineProfile(type)`

```ts
function getEngineProfile(type: DiagramType): DiagramEngineProfile
```

Returns engine metadata for a specific diagram type.

---

### `render(source, type, options?)`

Render a diagram from a source string.

```ts
function render(
  source: string,
  type: DiagramType,
  options?: RenderOptions,
): Promise<RenderResult>
```

| Parameter | Type | Required | Description |
|:----------|:-----|:---------|:------------|
| `source` | `string` | Yes | Diagram source content |
| `type` | `DiagramType` | Yes | Engine to use |
| `options` | [`RenderOptions`](../types/README.md#renderoptions) | No | Rendering config |

**Behavior:** Acquires the browser pool for browser-backed engines. For `theme: 'both'`, renders both variants. Applies `postProcessDarkSvg()` to Mermaid dark SVGs when `contrastOptimize` is `true`. Converts to raster via sharp for non-SVG formats.

---

### `renderFile(filePath, options?)`

Render a file from disk. Type inferred from extension.

```ts
function renderFile(
  filePath: string,
  options?: RenderOptions,
): Promise<RenderResult>
```

---

### `renderAll(options?)`

Batch render all diagrams in a directory tree. Writes to `.diagramkit/` folders.

```ts
function renderAll(options?: BatchOptions): Promise<RenderAllResult>
```

Returns `RenderAllResult` with `rendered`, `skipped`, `failed`, `failedDetails`, and optional `metrics`.

**Steps:** discover files, filter by type, check manifest, render stale files, update manifest, clean orphans.

---

### `renderDiagramFileToDisk(file, options?)`

Render a single file and write output to disk. Returns written filenames.

```ts
function renderDiagramFileToDisk(
  file: DiagramFile,
  options?: RenderOptions & { config?: DiagramkitConfig; outDir?: string; formats?: OutputFormat[] },
): Promise<string[]>
```

---

### `watchDiagrams(options)`

Watch for changes and re-render. Returns cleanup function.

```ts
function watchDiagrams(options: WatchOptions): () => Promise<void>
```

**Watched:** `**/*.mermaid`, `**/*.mmd`, `**/*.mmdc`, `**/*.excalidraw`, `**/*.drawio`, `**/*.drawio.xml`, `**/*.dio`, `**/*.dot`, `**/*.gv`, `**/*.graphviz`

---

## Browser Lifecycle

### `warmup()`

```ts
function warmup(): Promise<void>
```

Pre-warm the browser pool. Optional -- launches automatically on first render.

### `dispose()`

```ts
function dispose(): Promise<void>
```

Close browser pool and release resources. Safe to call multiple times.

---

### `createRendererRuntime()`

```ts
function createRendererRuntime(): RendererRuntime
```

Creates an isolated runtime with its own `BrowserPool`. Use this when you need lifecycle isolation from the default singleton runtime.

Do not mix `runtime.dispose()` with the top-level `dispose()` for the same work unit. Runtime methods manage their own pool; the top-level API manages the shared singleton pool.

### `DiagramkitError`

```ts
class DiagramkitError extends Error {
  code: DiagramkitErrorCode
}
```

Typed error class used for user-facing and programmatic failures.

---

## File Discovery

> Import these utilities from `diagramkit/utils`, not from the main `diagramkit` entry.

```ts
import { findDiagramFiles, filterByType } from 'diagramkit/utils'
```

### `findDiagramFiles(dir, config?)`

```ts
function findDiagramFiles(
  dir: string,
  config?: Partial<DiagramkitConfig>,
): DiagramFile[]
```

Recursively find all diagram files. Skips hidden dirs and `node_modules`.

### `filterByType(files, type, config?)`

```ts
function filterByType(
  files: DiagramFile[],
  type: DiagramType,
  config?: Partial<DiagramkitConfig>,
): DiagramFile[]
```

---

## Manifest

### `filterStaleFiles(files, force, formats?, config?, theme?)`

```ts
function filterStaleFiles(
  files: DiagramFile[],
  force: boolean,
  formats?: OutputFormat[],
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
): StaleFile[]
```

Filter to files needing re-render. Caches manifests per directory.

### `planStaleFiles(files, force, formats?, config?, theme?)`

```ts
function planStaleFiles(
  files: DiagramFile[],
  force: boolean,
  formats?: OutputFormat[],
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
): StalePlanEntry[]
```

Returns detailed staleness reasons per file without rendering.

### `isStale(file, formats?, config?, theme?, manifest?)`

```ts
function isStale(
  file: DiagramFile,
  formats?: OutputFormat[],
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
  manifest?: Manifest,
): boolean
```

Returns `true` if: no manifest entry, hash changed, format changed, outputs missing, or manifest disabled.

### `readManifest(sourceDir, config?)`

```ts
function readManifest(
  sourceDir: string,
  config?: Partial<DiagramkitConfig>,
): Manifest
```

### `getDiagramsDir(sourceDir, config?)`

```ts
function getDiagramsDir(sourceDir: string, config?: Partial<DiagramkitConfig>): string
```

### `ensureDiagramsDir(sourceDir, config?)`

```ts
function ensureDiagramsDir(sourceDir: string, config?: Partial<DiagramkitConfig>): string
```

Like `getDiagramsDir` but creates the directory if missing.

---

## Extension Utilities

### `getExtensionMap(overrides?)`

```ts
function getExtensionMap(overrides?: Record<string, DiagramType>): Record<string, DiagramType>
```

### `getDiagramType(filename, map?)`

```ts
function getDiagramType(filename: string, map?: Record<string, DiagramType>): DiagramType | null
```

Longest-match-first resolution.

### `getMatchedExtension(filename, map?)`

```ts
function getMatchedExtension(filename: string, map?: Record<string, DiagramType>): string | null
```

### `getAllExtensions(map?)`

```ts
function getAllExtensions(map?: Record<string, DiagramType>): string[]
```

### `getExtensionsForType(type, map?)`

```ts
function getExtensionsForType(type: DiagramType, map?: Record<string, DiagramType>): string[]
```

---

## Configuration

### `getDefaultConfig()`

```ts
function getDefaultConfig(): DiagramkitConfig
```

### `loadConfig(overrides?, dir?, configFile?, options?)`

```ts
function loadConfig(
  overrides?: Partial<DiagramkitConfig>,
  dir?: string,
  configFile?: string,
  options?: { strict?: boolean; warn?: (message: string) => void },
): DiagramkitConfig
```

Merge order: defaults, global, env vars, local (or explicit `configFile`), overrides.

### `getFileOverrides(filePath, config?, rootDir?)`

```ts
function getFileOverrides(
  filePath: string,
  config?: Partial<DiagramkitConfig>,
  rootDir?: string,
): FileOverride | undefined
```

Resolve per-file overrides from the `overrides` config. Matches against exact filenames, relative paths, and glob patterns. Returns the merged override for the file, or `undefined` if no overrides match.

### `defineConfig(config)`

```ts
function defineConfig(config: Partial<DiagramkitConfig>): Partial<DiagramkitConfig>
```

Identity helper for TypeScript config file autocomplete. Returns the input unchanged but provides type checking in `diagramkit.config.ts` files.

### `defaultMermaidDarkTheme`

```ts
const defaultMermaidDarkTheme: Record<string, string>
```

---

## SVG-to-Raster Conversion

### `convertSvg(svg, options)`

```ts
function convertSvg(
  svg: Buffer | string,
  options: ConvertOptions,
): Promise<Buffer>
```

Also available from `diagramkit/convert`.

---

## Color Utilities

### `postProcessDarkSvg(svg)`

```ts
function postProcessDarkSvg(svg: string): string
```

WCAG contrast optimization for dark SVGs. Exported from `diagramkit/utils` and `diagramkit/color`.

---

## Output Utilities

### `atomicWrite(path, content)`

```ts
function atomicWrite(path: string, content: Buffer): void
```

Write via `.tmp` + rename to prevent partial files.

### `stripDiagramExtension(filename, map?)`

```ts
function stripDiagramExtension(filename: string, map?: Record<string, DiagramType>): string
```

Removes the detected diagram extension from the filename.

---

## Utilities (Advanced)

These functions are available from `diagramkit/utils` for advanced use cases such as custom build pipelines.

### `writeManifest(sourceDir, manifest, config?)`

```ts
function writeManifest(
  sourceDir: string,
  manifest: Manifest,
  config?: Partial<DiagramkitConfig>,
): void
```

Write manifest atomically (`.tmp` + rename) to prevent corruption on crash.

### `hashFile(filePath)`

```ts
function hashFile(filePath: string): string
```

Compute SHA-256 content hash of a file. Returns a `sha256:` prefixed hex string (first 16 chars).

### `renderGraphviz(source, options?)`

```ts
function renderGraphviz(
  source: string,
  options?: { theme?: Theme; contrastOptimize?: boolean },
): Promise<{ lightSvg?: string; darkSvg?: string }>
```

Low-level Graphviz renderer used by the unified engine pipeline.

### `cleanOrphans(files, config?, roots?)`

```ts
function cleanOrphans(
  files: DiagramFile[],
  config?: Partial<DiagramkitConfig>,
  roots?: string[],
): void
```

Remove orphaned outputs and manifest entries for diagram sources that no longer exist.

### `updateManifest(files, formats?, config?, theme?)`

```ts
function updateManifest(
  files: RenderableFile[],
  formats?: OutputFormat[],
  config?: Partial<DiagramkitConfig>,
  theme?: Theme,
): void
```

Update manifests after successful renders. Groups files by directory and merges formats with existing entries.

### `writeRenderResult(name, outDir, result, naming?)`

```ts
function writeRenderResult(
  name: string,
  outDir: string,
  result: RenderResult,
  naming?: OutputNamingOptions,
): string[]
```

Write whichever variants were returned by the renderer. Returns an array of written filenames.

### `getExpectedOutputNamesMulti(name, formats, theme?, naming?)`

```ts
function getExpectedOutputNamesMulti(
  name: string,
  formats: OutputFormat[],
  theme?: Theme,
  naming?: OutputNamingOptions,
): string[]
```

Get expected output names across multiple formats and theme variants.

### `getExpectedOutputNames(name, format?, theme?, naming?)`

```ts
function getExpectedOutputNames(
  name: string,
  format?: OutputFormat,
  theme?: Theme,
  naming?: OutputNamingOptions,
): string[]
```

Get expected output names for a single format and theme.

### `getOutputFileName(name, variant, format?, naming?)`

```ts
function getOutputFileName(
  name: string,
  variant: 'light' | 'dark',
  format?: OutputFormat,
  naming?: OutputNamingOptions,
): string
```

Get the output filename for a specific variant and format. Pattern: `{prefix}{name}{suffix}-{variant}.{format}`.

### `getOutputVariants(theme?)`

```ts
function getOutputVariants(theme?: Theme): ('light' | 'dark')[]
```

Get the output variants for a given theme. Returns `['light']`, `['dark']`, or `['light', 'dark']`.

---

## SVG Validation

> Import these functions from `diagramkit/utils` or `diagramkit/validate`. They are also surfaced through the CLI as `diagramkit validate` and run automatically after every `diagramkit render`.

```ts
import {
  validateSvg,
  validateSvgFile,
  validateSvgDirectory,
  formatValidationResult,
} from 'diagramkit/utils'
```

### `validateSvg(svg, filePath?, options?)`

```ts
function validateSvg(
  svg: string,
  filePath?: string,
  options?: SvgValidateOptions,
): SvgValidationResult
```

Structural + WCAG 2.2 AA contrast validation of an SVG string. Returns issues with codes (`MISSING_SVG_TAG`, `LOW_CONTRAST_TEXT`, `EXTERNAL_RESOURCE`, …), severity, message, and a remediation suggestion.

### `validateSvgFile(filePath, options?)`

```ts
function validateSvgFile(filePath: string, options?: SvgValidateOptions): SvgValidationResult
```

### `validateSvgDirectory(dir, options?)`

```ts
function validateSvgDirectory(
  dir: string,
  options?: { recursive?: boolean } & SvgValidateOptions,
): SvgValidationResult[]
```

### `formatValidationResult(result)`

```ts
function formatValidationResult(result: SvgValidationResult): string
```

Format a `SvgValidationResult` into the human-readable lines used by `diagramkit validate`.

See [Types](../types/README.md#validation-types) for `SvgIssue`, `SvgIssueCode`, `SvgValidationResult`, and `SvgValidateOptions` shapes.

---

## Subpath Exports

| Import | Content |
|:-------|:--------|
| `diagramkit` | Main API |
| `diagramkit/utils` | Discovery, manifest, extensions, output, color, validation |
| `diagramkit/color` | Color utilities (contrast, WCAG ratios) |
| `diagramkit/convert` | SVG-to-raster conversion |
| `diagramkit/validate` | SVG structural + WCAG contrast validation |
