---
title: Configuration
description: Layered configuration system -- config files, environment variables, per-file overrides, and merge precedence.
---

# Configuration

diagramkit works with zero configuration. All settings have sensible defaults. When you need to customize, settings merge in this order (later sources override earlier):

1. **Defaults** -- built-in values
2. **Global config** -- `~/.config/diagramkit/config.json5`
3. **Environment variables** -- `DIAGRAMKIT_*`
4. **Local config** -- `diagramkit.config.json5` or `.ts` (walks up from cwd)
5. **CLI flags / API overrides** -- highest priority

Use `--config <path>` to point at a specific config file instead of auto-discovery.

## Config Files

### Local (JSON5)

Place a `diagramkit.config.json5` in your project root:

```json5
{
  // Output folder name (default: .diagramkit)
  outputDir: '.diagramkit',
  defaultFormats: ['svg'],
  defaultTheme: 'both',
}
```

Create one with:

```bash
diagramkit init
```

### Local (TypeScript)

For type-safe configuration:

```ts title="diagramkit.config.ts"
import { defineConfig } from 'diagramkit'

export default defineConfig({
  defaultFormats: ['svg'],
  defaultTheme: 'both',
})
```

Create one with:

```bash
diagramkit init --ts
```

TypeScript configs are loaded via `jiti` at runtime -- no build step needed.

### Global

Machine-wide defaults at `~/.config/diagramkit/config.json5` (or `$XDG_CONFIG_HOME/diagramkit/config.json5`):

```json5
{
  defaultFormats: ['png'],
  defaultTheme: 'both',
}
```

### Environment Variables

| Variable | Config Equivalent | Example |
|:---------|:------------------|:--------|
| `DIAGRAMKIT_FORMAT` | `defaultFormats` | `DIAGRAMKIT_FORMAT=png,svg` |
| `DIAGRAMKIT_THEME` | `defaultTheme` | `DIAGRAMKIT_THEME=light` |
| `DIAGRAMKIT_OUTPUT_DIR` | `outputDir` | `DIAGRAMKIT_OUTPUT_DIR=images` |
| `DIAGRAMKIT_NO_MANIFEST` | `useManifest: false` | `DIAGRAMKIT_NO_MANIFEST=1` |

## All Options

### `outputDir`

- **Type:** `string` -- **Default:** `'.diagramkit'`

Name of the output folder created next to source files.

### `manifestFile`

- **Type:** `string` -- **Default:** `'manifest.json'`

Manifest filename inside the output folder. Tracks content hashes for incremental builds.

### `useManifest`

- **Type:** `boolean` -- **Default:** `true`

When `false`, all diagrams re-render every run and no manifest is written.

### `sameFolder`

- **Type:** `boolean` -- **Default:** `false`

Place outputs alongside source files instead of in a subdirectory. When `true`, `outputDir` is ignored.

### `defaultFormats`

- **Type:** `OutputFormat[]` -- **Default:** `['svg']`

Array of output formats. Supports multiple formats in a single render pass.

```json5
{ defaultFormats: ['svg', 'png'] }
```

### `defaultTheme`

- **Type:** `'light' | 'dark' | 'both'` -- **Default:** `'both'`

### `outputPrefix` / `outputSuffix`

- **Type:** `string` -- **Default:** `''`

Prefix and suffix for output filenames:

```
${outputPrefix}${name}${outputSuffix}-${theme}.${format}
```

| Config | Source | Output |
|:-------|:-------|:-------|
| defaults | `flow.mermaid` | `flow-light.svg` |
| `outputPrefix: "dk-"` | `flow.mermaid` | `dk-flow-light.svg` |
| `outputSuffix: "-v2"` | `flow.mermaid` | `flow-v2-light.svg` |

### `extensionMap`

- **Type:** `Record<string, DiagramType>` -- **Default:** built-in map

Custom extension-to-type mapping, merged with the built-in map:

```json5
{
  extensionMap: {
    ".custom-diagram": "mermaid",
    ".service-map": "graphviz",
  },
}
```

Built-in extensions:

| Extension | Type |
|:----------|:-----|
| `.mermaid`, `.mmd`, `.mmdc` | `mermaid` |
| `.excalidraw` | `excalidraw` |
| `.drawio`, `.drawio.xml`, `.dio` | `drawio` |
| `.dot`, `.gv`, `.graphviz` | `graphviz` |

### `overrides`

- **Type:** `Record<string, FileOverride>` -- **Default:** `undefined`

Per-file render overrides. Keys can be exact filenames, relative paths, or glob patterns:

```json5
{
  overrides: {
    // Exact filename — render hero as SVG + PNG at 3x
    "hero.mermaid": { formats: ["svg", "png"], scale: 3 },

    // Glob — all excalidraw files in docs/ get light theme only
    "docs/*.excalidraw": { theme: "light" },

    // Relative path — specific file gets high quality
    "src/diagrams/arch.drawio": { quality: 95 },
  },
}
```

Each `FileOverride` can set:

| Field | Type | Description |
|:------|:-----|:------------|
| `formats` | `OutputFormat[]` | Output formats for this file |
| `theme` | `Theme` | Theme for this file |
| `quality` | `number` | JPEG/WebP/AVIF quality |
| `scale` | `number` | Scale factor for raster output |
| `contrastOptimize` | `boolean` | Disable/enable dark SVG contrast |

## Example Configs

### Minimal (defaults work for most projects)

```json5
{}
```

### Multi-format output

```json5
{
  defaultFormats: ['svg', 'png'],
}
```

### PNG, same folder

```json5
{
  defaultFormats: ['png'],
  sameFolder: true,
}
```

### CI pipeline (no caching)

```json5
{
  useManifest: false,
  defaultFormats: ['png'],
}
```

Or via environment:

```bash
DIAGRAMKIT_NO_MANIFEST=1 DIAGRAMKIT_FORMAT=png diagramkit render .
```

### Per-file overrides

```json5
{
  defaultFormats: ['svg'],
  overrides: {
    "hero.mermaid": { formats: ["svg", "png"], scale: 3 },
    "**/*.excalidraw": { theme: "light" },
  },
}
```

### TypeScript with defineConfig

```ts title="diagramkit.config.ts"
import { defineConfig } from 'diagramkit'

export default defineConfig({
  defaultFormats: ['svg', 'png'],
  overrides: {
    'hero.mermaid': { formats: ['svg', 'png'], scale: 3 },
  },
})
```

## Precedence Example

Given:

- **Global:** `{ defaultFormats: ['png'] }`
- **Env:** `DIAGRAMKIT_THEME=light`
- **Local:** `{ defaultFormats: ['svg'], outputDir: '_diagrams' }`
- **CLI:** `diagramkit render . --format jpeg`

Resolved:

| Option | Value | Source |
|:-------|:------|:-------|
| `defaultFormats` | `['jpeg']` | CLI flag |
| `outputDir` | `_diagrams` | Local config |
| `defaultTheme` | `light` | Env variable |
| `manifestFile` | `manifest.json` | Default |
| `useManifest` | `true` | Default |
| `sameFolder` | `false` | Default |
