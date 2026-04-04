---
title: Configuration Reference
description: Full configuration schema, file locations, environment variables, and manifest format.
---

# Configuration Reference

## Config File Locations

| Source | Path | Priority |
|:-------|:-----|:---------|
| Defaults | Built-in | Lowest |
| Global | `~/.config/diagramkit/config.json5` | Low |
| Environment | `DIAGRAMKIT_*` env vars | Medium |
| Local | `diagramkit.config.json5` or `.ts` (walks up) | High |
| Explicit | `--config <path>` | High (replaces local) |
| CLI/API | Flags and `RenderOptions.config` | Highest |

`XDG_CONFIG_HOME` overrides the global config base path.

## Schema

```ts
interface DiagramkitConfig {
  outputDir: string              // Default: '.diagramkit'
  manifestFile: string           // Default: 'manifest.json'
  useManifest: boolean           // Default: true
  sameFolder: boolean            // Default: false
  defaultFormats: OutputFormat[] // Default: ['svg']
  defaultTheme: Theme            // Default: 'both'
  outputPrefix: string           // Default: ''
  outputSuffix: string           // Default: ''
  extensionMap?: Record<string, DiagramType>
  inputDirs?: string[]
  overrides?: Record<string, FileOverride>
}
```

## Options

### `outputDir`

| | |
|:--|:--|
| **Type** | `string` |
| **Default** | `'.diagramkit'` |

Output folder name, created next to source files. Ignored when `sameFolder` is `true`.

---

### `manifestFile`

| | |
|:--|:--|
| **Type** | `string` |
| **Default** | `'manifest.json'` |

Manifest filename inside the output folder. Stores SHA-256 hashes for incremental builds.

---

### `useManifest`

| | |
|:--|:--|
| **Type** | `boolean` |
| **Default** | `true` |

When `false`: all diagrams re-render every run, no manifest written.

---

### `sameFolder`

| | |
|:--|:--|
| **Type** | `boolean` |
| **Default** | `false` |

Place outputs alongside source files. When `true`, `outputDir` is ignored.

**Default:**
```
docs/
  flow.mermaid
  .diagramkit/
    flow-light.svg
```

**`sameFolder: true`:**
```
docs/
  flow.mermaid
  flow-light.svg
```

---

### `defaultFormats`

| | |
|:--|:--|
| **Type** | `OutputFormat[]` |
| **Default** | `['svg']` |

Array of output formats. Supports multiple formats in a single render pass.

---

### `defaultTheme`

| | |
|:--|:--|
| **Type** | `'light' \| 'dark' \| 'both'` |
| **Default** | `'both'` |

---

### `outputPrefix` / `outputSuffix`

| | |
|:--|:--|
| **Type** | `string` |
| **Default** | `''` |

Prefix and suffix for output filenames. Pattern: `{prefix}{name}{suffix}-{theme}.{format}`

---

### `extensionMap`

| | |
|:--|:--|
| **Type** | `Record<string, DiagramType>` |
| **Default** | built-in map |

Merged with built-in map (overrides take precedence). Matching is longest-first.

**Built-in map:**

| Extension | Type |
|:----------|:-----|
| `.mermaid`, `.mmd`, `.mmdc` | `mermaid` |
| `.excalidraw` | `excalidraw` |
| `.drawio`, `.drawio.xml`, `.dio` | `drawio` |
| `.dot`, `.gv`, `.graphviz` | `graphviz` |

---

### `overrides`

| | |
|:--|:--|
| **Type** | `Record<string, FileOverride>` |
| **Default** | `undefined` |

Per-file render overrides. Keys can be exact filenames, relative paths, or glob patterns.

```json5
{
  overrides: {
    // Exact filename
    "hero.mermaid": { formats: ["svg", "png"], scale: 3 },
    // Glob pattern
    "docs/*.excalidraw": { theme: "light" },
    // Relative path
    "src/diagrams/arch.drawio": { quality: 95 },
  },
}
```

## Environment Variables

| Variable | Config Equivalent | Example |
|:---------|:------------------|:--------|
| `DIAGRAMKIT_FORMAT` | `defaultFormats` | `DIAGRAMKIT_FORMAT=png,svg` |
| `DIAGRAMKIT_THEME` | `defaultTheme` | `DIAGRAMKIT_THEME=light` |
| `DIAGRAMKIT_OUTPUT_DIR` | `outputDir` | `DIAGRAMKIT_OUTPUT_DIR=images` |
| `DIAGRAMKIT_NO_MANIFEST` | `useManifest: false` | `DIAGRAMKIT_NO_MANIFEST=1` |

## Manifest Format

```json
{
  "version": 2,
  "diagrams": {
    "flow.mermaid": {
      "hash": "sha256:a1b2c3d4e5f67890",
      "generatedAt": "2026-04-04T10:30:00.000Z",
      "outputs": [
        { "file": "flow-light.svg", "format": "svg", "theme": "light", "width": 800, "height": 600 },
        { "file": "flow-dark.svg", "format": "svg", "theme": "dark", "width": 800, "height": 600 }
      ],
      "formats": ["svg"],
      "theme": "both"
    }
  }
}
```

| Field | Type | Description |
|:------|:-----|:------------|
| `version` | `2` | Format version |
| `diagrams` | `Record<string, ManifestEntry>` | Source filename to entry |
| `hash` | `string` | SHA-256 content hash (first 16 hex chars) |
| `generatedAt` | `string` | ISO 8601 timestamp |
| `outputs` | `ManifestOutput[]` | Per-output metadata |
| `formats` | `OutputFormat[]` | All tracked formats (accumulative) |
| `theme` | `Theme` | Theme variant used |

## Examples

### Default (no config needed)

```json5
{
  outputDir: '.diagramkit',
  manifestFile: 'manifest.json',
  useManifest: true,
  sameFolder: false,
  defaultFormats: ['svg'],
  defaultTheme: 'both',
}
```

### CI/CD

```json
{ "useManifest": false }
```

### Custom extensions

```json
{
  "extensionMap": {
    ".flow": "mermaid",
    ".diagram": "drawio",
    ".depgraph": "graphviz"
  }
}
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
