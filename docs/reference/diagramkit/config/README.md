---
title: Configuration Reference
description: Full configuration schema, file locations, environment variables, and manifest format.
---

# Configuration Reference

## Config File Locations

| Source | Path | Priority |
|:-------|:-----|:---------|
| Defaults | Built-in | Lowest |
| Global | `~/.config/diagramkit/config.json5` (or `config.json`) | Low |
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
  mermaidLayout?: MermaidLayoutOptions
}

interface MermaidLayoutOptions {
  mode?: 'off' | 'warn' | 'flip' | 'elk' | 'auto' // Default: 'warn'
  targetAspectRatio?: number                       // Default: 4 / 3
  tolerance?: number                               // Default: 2.5
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

### `inputDirs`

| | |
|:--|:--|
| **Type** | `string[]` |
| **Default** | `undefined` (scan entire tree) |

Restrict file discovery to these directories (relative to the project root). When set, only diagrams inside the listed directories are scanned.

```json5
{
  inputDirs: ['docs/diagrams', 'src/architecture'],
}
```

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

---

### `mermaidLayout`

| | |
|:--|:--|
| **Type** | `MermaidLayoutOptions` |
| **Default** | `{ mode: 'warn', targetAspectRatio: 4 / 3, tolerance: 2.5 }` |

Aspect-ratio rebalance options for Mermaid renders. Mermaid's default Dagre layout has no aspect-ratio knob — a `flowchart LR` with many nodes produces a very wide SVG (e.g. 12:1) and a `flowchart TD` with many siblings produces a very tall one. When the rendered ratio falls outside `[targetAspectRatio / tolerance, targetAspectRatio * tolerance]`, diagramkit can warn or transparently re-render the diagram with a different layout to bring it closer to the target.

Only Mermaid renders are affected. Excalidraw, draw.io, and Graphviz outputs are unchanged.

| Field | Type | Default | Notes |
|:------|:-----|:--------|:------|
| `mode` | `'off' \| 'warn' \| 'flip' \| 'elk' \| 'auto'` | `'warn'` | See modes below. |
| `targetAspectRatio` | `number` | `4 / 3` ≈ `1.333` | Used as the picker target and as the `elk.aspectRatio` hint. |
| `tolerance` | `number` (must be > 1) | `2.5` | Acceptable band around the target. The default accepts ratios from roughly 1:1.9 to 3.3:1. |

**Modes**

| Mode | Behaviour | Cost |
|:-----|:----------|:-----|
| `off` | Never measure. Identical to pre-1.x behaviour. | 0 extra renders. |
| `warn` *(default)* | Measure once and emit a warning when out of band. Keeps the original render. | 0 extra renders. |
| `flip` | For flowcharts (`flowchart`/`graph`), swap `LR ↔ TB` (and `RL ↔ BT`), re-render once, keep whichever ratio is closer to the target. | 1 extra render when triggered. |
| `elk` | Re-render with a `%%{init:{"layout":"elk","elk":{"aspectRatio":target}}}%%` directive. Requires the optional `@mermaid-js/layout-elk` plugin to be available; otherwise the attempt is caught and the original render is kept. | 1 extra render when triggered. |
| `auto` | Try `flip` first; if still outside the band, also try `elk` (and the combined `flip + elk`). Pick the closest of all attempts. | 1–3 extra renders when triggered. |

**Eligibility:**

- Only `flowchart`/`graph` diagrams are eligible for `flip`/`elk`/`auto` rebalances. Sequence, gantt, journey, state, class, ER, pie, mindmap, sankey, and similar inherently-directional diagrams degrade to `warn`-only behaviour.
- If the source already declares an `%%{init}%%` block that sets `layout`, `elk`, or `flowchart.defaultRenderer`, the `elk` injection is skipped — author intent always wins.
- Failed rebalance attempts are caught and warned about; the original successful render is always preserved.

```json5
{
  // Project-wide opt-in to automatic rebalance.
  mermaidLayout: { mode: 'auto', targetAspectRatio: 4 / 3, tolerance: 2.5 },
}
```

The same options can be passed per render call via `RenderOptions.mermaidLayout`, layered on top of the project config.

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
      "mtimeMs": 1712226600000.123,
      "size": 248,
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
| `mtimeMs` | `number` | Last-seen source file mtime, used for cheap no-op checks before re-hashing |
| `size` | `number` | Last-seen source file size in bytes, paired with `mtimeMs` for fast stale checks |
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
