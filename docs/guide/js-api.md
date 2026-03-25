# JavaScript API

diagramkit exports a programmatic API for use in build scripts, custom tooling, and Node.js applications.

```bash
npm add diagramkit
```

All rendering functions are async (they use Playwright internally).

If you need raster output (`png`, `jpeg`, or `webp`), install `sharp` alongside diagramkit.

## `render(source, type, options?)`

Render a diagram from a source string.

```typescript
import { render } from 'diagramkit'

const result = await render(
  `graph TD
    A[Client] --> B[Server]
    B --> C[(Database)]`,
  'mermaid',
  { format: 'svg', theme: 'both' },
)

// result.light  — Buffer containing light theme SVG
// result.dark   — Buffer containing dark theme SVG
// result.format — 'svg'
// result.width  — SVG width in pixels (SVG output only)
// result.height — SVG height in pixels (SVG output only)
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `source` | `string` | Diagram source content (Mermaid syntax, Excalidraw JSON, or Draw.io XML) |
| `type` | `DiagramType` | `'mermaid'`, `'excalidraw'`, or `'drawio'` |
| `options` | `RenderOptions` | Optional rendering configuration |

**Returns:** `Promise<RenderResult>`

## `renderFile(filePath, options?)`

Render a diagram file from disk. The diagram type is inferred from the file extension.

```typescript
import { renderFile } from 'diagramkit'

const result = await renderFile('/path/to/architecture.mermaid', {
  format: 'png',
  scale: 3,
  theme: 'both',
})

if (result.light) {
  writeFileSync('architecture-light.png', result.light)
}
if (result.dark) {
  writeFileSync('architecture-dark.png', result.dark)
}
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `filePath` | `string` | Absolute path to a diagram file |
| `options` | `RenderOptions` | Optional rendering configuration |

**Returns:** `Promise<RenderResult>`

If you use custom file extensions, pass them through `options.config.extensionMap` so `renderFile()` can resolve the diagram type correctly.

## `renderAll(options?)`

Render all diagrams in a directory tree. Outputs are written to `.diagrams/` folders next to each source file. Uses the manifest for incremental builds.

```typescript
import { renderAll, dispose } from 'diagramkit'

await renderAll({
  dir: '/path/to/project',
  format: 'svg',
  theme: 'both',
  force: false,
})

// Always dispose when done to close the browser
await dispose()
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `options` | `BatchOptions` | Batch rendering configuration |

**Returns:** `Promise<RenderAllResult>` -- an object with `rendered`, `skipped`, and `failed` arrays of file paths.

The function:
1. Discovers all diagram files recursively
2. Filters by type if `options.type` is set
3. Checks the manifest to skip up-to-date files (unless `force: true`)
4. Renders stale files using the appropriate renderer
5. Updates the manifest
6. Cleans up orphaned outputs from deleted source files

## `renderDiagramFileToDisk(file, options?)`

Render a single discovered diagram file and write the output variants to disk. This is the same function used internally by `renderAll()` and watch mode. Useful for custom watch implementations or fine-grained control over which files to render.

```typescript
import { findDiagramFiles, renderDiagramFileToDisk, dispose } from 'diagramkit'

const files = findDiagramFiles('/path/to/project')
for (const file of files) {
  const written = await renderDiagramFileToDisk(file, {
    format: 'svg',
    theme: 'both',
  })
  // written — array of output filenames (e.g. ['flow-light.svg', 'flow-dark.svg'])
}

await dispose()
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `file` | `DiagramFile` | A discovered diagram file object (from `findDiagramFiles`) |
| `options` | `RenderOptions & { config?: DiagramkitConfig; outDir?: string }` | Optional rendering configuration. `outDir` overrides the default output directory. |

**Returns:** `Promise<string[]>` -- an array of output filenames written to disk.

## `watchDiagrams(options)`

Watch for diagram file changes and re-render automatically. Returns a cleanup function.

```typescript
import { watchDiagrams, dispose } from 'diagramkit'

const stop = watchDiagrams({
  dir: '/path/to/project',
  renderOptions: {
    format: 'svg',
    theme: 'both',
  },
  onChange: (file) => {
    console.log(`Re-rendered: ${file}`)
  },
})

// Later, stop watching
await stop()
await dispose()
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `options` | `WatchOptions` | Watch configuration (see [Types](/reference/types)) |

**Returns:** `() => Promise<void>` -- an async cleanup function that stops the watcher

## `warmup()`

Pre-warm the browser pool by launching a Chromium instance. The browser is kept alive with an idle timeout (5 seconds by default) and shared across render calls.

```typescript
import { warmup } from 'diagramkit'

await warmup()
// Subsequent render calls will reuse the warm browser
```

Calling `warmup()` is optional. The browser launches automatically on the first render call. Pre-warming is useful to avoid cold-start latency.

## `dispose()`

Explicitly close the browser pool and release all resources.

```typescript
import { dispose } from 'diagramkit'

await dispose()
```

::: warning
Always call `dispose()` when you are done rendering, especially in scripts and CI. The browser pool has an idle timeout, but explicit disposal prevents resource leaks.
:::

## `convertSvg(svg, options)`

Convert an SVG buffer or string to a raster format using [sharp](https://sharp.pixelplumbing.com/). This function is useful when you have an SVG and want to convert it to PNG, JPEG, or WebP independently of the rendering pipeline.

```typescript
// Also available from the main import: import { convertSvg } from 'diagramkit'
import { convertSvg } from 'diagramkit/convert'

const png = await convertSvg(svgBuffer, {
  format: 'png',
  density: 2,
})

const jpeg = await convertSvg(svgString, {
  format: 'jpeg',
  quality: 85,
  density: 3,
})
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `svg` | `Buffer \| string` | SVG content to convert |
| `options` | `ConvertOptions` | Conversion settings |

**Returns:** `Promise<Buffer>`

::: tip
`sharp` is dynamically imported and only required when you call `convertSvg`. Install it with `npm add sharp` if you need raster conversion outside the built-in renderer pipeline.
:::

## `loadConfig(overrides?, dir?)`

Load the merged configuration from all sources.

```typescript
import { loadConfig } from 'diagramkit'

const config = loadConfig(
  { outputDir: 'images' },  // overrides
  '/path/to/project',       // directory to search for .diagramkitrc.json
)
```

The merge order is: defaults -> global config -> local config -> overrides. See [Configuration](/guide/configuration) for details.

## `postProcessDarkSvg(svg)`

Apply WCAG contrast optimization to a dark-mode SVG string. This is the same post-processing applied automatically during rendering.

```typescript
import { postProcessDarkSvg } from 'diagramkit'

const optimized = postProcessDarkSvg(rawDarkSvg)
```

Finds inline `fill:#hex` values and standalone `fill="#hex"` attributes with luminance > 0.4 and darkens them while preserving hue, so colored nodes retain their visual identity against dark backgrounds.

## File Discovery

### `findDiagramFiles(dir, config?)`

Recursively find all diagram source files under a directory.

```typescript
import { findDiagramFiles } from 'diagramkit'

const files = findDiagramFiles('/path/to/project')
// [{ path, name, dir, ext }, ...]
```

Skips hidden directories (`.diagrams`, `.git`, etc.) and `node_modules`.

### `filterByType(files, type, config?)`

Filter discovered files by diagram type.

```typescript
import { findDiagramFiles, filterByType } from 'diagramkit'

const all = findDiagramFiles('/path/to/project')
const mermaidOnly = filterByType(all, 'mermaid')
```

## Manifest Operations

### `filterStaleFiles(files, force, format?, config?, theme?)`

Filter a list of diagram files to only those that need re-rendering based on the manifest. Caches manifests per directory for efficiency.

```typescript
import { findDiagramFiles, filterStaleFiles } from 'diagramkit'

const files = findDiagramFiles('/path/to/project')
const stale = filterStaleFiles(files, false, 'svg')
// stale — only files that have changed, are missing outputs, or were never rendered
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `files` | `DiagramFile[]` | Array of discovered diagram files |
| `force` | `boolean` | If `true`, all files are considered stale |
| `format` | `OutputFormat` | Optional format to check against manifest (triggers re-render on format change) |
| `config` | `Partial<DiagramkitConfig>` | Optional configuration overrides |
| `theme` | `Theme` | Optional theme to check against manifest (triggers re-render on theme change) |

**Returns:** `StaleFile[]` -- array of files that need re-rendering.

### `isStale(file, format?, config?, theme?, manifest?)`

Check if a diagram file needs re-rendering.

- `theme` — optional `Theme` to check staleness for a specific theme variant (default: uses config theme).
- `manifest` — optional pre-loaded manifest object to avoid re-reading from disk.

```typescript
import { isStale } from 'diagramkit'

if (isStale(diagramFile, 'svg')) {
  // File has changed since last render
}
```

### `readManifest(sourceDir, config?)`

Read the manifest for a given source directory.

```typescript
import { readManifest } from 'diagramkit'

const manifest = readManifest('/path/to/dir')
// { version: 1, diagrams: { 'flow.mermaid': { hash, generatedAt, outputs, format } } }
```

### `getDiagramsDir(sourceFile, config?)`

Returns the output directory path for a source file's directory. Does not create the directory.

```typescript
import { getDiagramsDir } from 'diagramkit'

const outDir = getDiagramsDir('/path/to/docs')
// '/path/to/docs/.diagrams'
```

### `ensureDiagramsDir(sourceFile, config?)`

Returns the output directory path for a source file's directory, creating it if it does not exist.

```typescript
import { ensureDiagramsDir } from 'diagramkit'

const outDir = ensureDiagramsDir('/path/to/docs')
// '/path/to/docs/.diagrams' (created if missing)
```

::: info Internal Functions
Functions like `hashFile`, `updateManifest`, `writeManifest`, and `cleanOrphans` are internal to the manifest module and not exported from the public API. Use `renderAll()` or `renderDiagramFileToDisk()` for rendering workflows that manage the manifest automatically.
:::

## Browser Lifecycle

The browser pool is managed automatically:

1. **Lazy init** -- the Chromium instance launches on the first render call
2. **Reference counting** -- concurrent renders share the same browser
3. **Idle timeout** -- the browser closes after 5 seconds of inactivity
4. **Auto-cleanup** -- SIGINT, SIGTERM, and process exit handlers close the browser

For long-running processes, call `dispose()` explicitly when rendering is complete.
