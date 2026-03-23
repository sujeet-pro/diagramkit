# Configuration Reference

## Config File Locations

| Source | Path | Priority |
|--------|------|----------|
| Defaults | Built-in | Lowest |
| Global | `~/.config/diagramkit/config.json` | Low |
| Local | `.diagramkitrc.json` (walks up directory tree) | Medium |
| CLI/API | Flags and `RenderOptions.config` | Highest |

The `XDG_CONFIG_HOME` environment variable overrides the global config base path.

## Schema

```typescript
interface DiagramkitConfig {
  outputDir: string
  manifestFile: string
  useManifest: boolean
  sameFolder: boolean
  defaultFormat: OutputFormat
  defaultTheme: Theme
  extensionMap?: Record<string, DiagramType>
}
```

## Options

### `outputDir`

| | |
|---|---|
| **Type** | `string` |
| **Default** | `'.diagrams'` |

Name of the output folder created next to source files. The folder is created automatically when rendering.

```json
{ "outputDir": ".diagrams" }
```

When `sameFolder` is `true`, this option is ignored.

---

### `manifestFile`

| | |
|---|---|
| **Type** | `string` |
| **Default** | `'diagrams.manifest.json'` |

Filename of the manifest inside the output folder. The manifest stores SHA-256 content hashes and output file lists for incremental builds.

```json
{ "manifestFile": "diagrams.manifest.json" }
```

::: info
diagramkit supports migration from the old `manifest.json` filename. If the new manifest file is not found, it checks for `manifest.json` as a fallback.
:::

---

### `useManifest`

| | |
|---|---|
| **Type** | `boolean` |
| **Default** | `true` |

Whether to use the manifest system for incremental builds. When `false`:
- All diagrams are considered stale on every run
- No manifest file is written or read
- Equivalent to always passing `--force`

```json
{ "useManifest": true }
```

---

### `sameFolder`

| | |
|---|---|
| **Type** | `boolean` |
| **Default** | `false` |

Place output files directly alongside source files instead of in a subdirectory.

```json
{ "sameFolder": false }
```

**When `false` (default):**
```
docs/
  flow.mermaid
  .diagrams/
    flow-light.svg
    flow-dark.svg
```

**When `true`:**
```
docs/
  flow.mermaid
  flow-light.svg
  flow-dark.svg
```

---

### `defaultFormat`

| | |
|---|---|
| **Type** | `'svg' \| 'png' \| 'jpeg' \| 'webp'` |
| **Default** | `'svg'` |

Default output format when not specified by a CLI flag or API option.

```json
{ "defaultFormat": "svg" }
```

---

### `defaultTheme`

| | |
|---|---|
| **Type** | `'light' \| 'dark' \| 'both'` |
| **Default** | `'both'` |

Default theme variant(s) to render.

```json
{ "defaultTheme": "both" }
```

---

### `extensionMap`

| | |
|---|---|
| **Type** | `Record<string, DiagramType>` |
| **Default** | `undefined` (uses built-in map) |

Custom extension-to-type mapping. Merged with the built-in map (overrides take precedence).

```json
{
  "extensionMap": {
    ".custom": "mermaid"
  }
}
```

**Built-in map:**

| Extension | Type |
|-----------|------|
| `.mermaid` | `mermaid` |
| `.mmd` | `mermaid` |
| `.mmdc` | `mermaid` |
| `.excalidraw` | `excalidraw` |
| `.drawio` | `drawio` |
| `.drawio.xml` | `drawio` |
| `.dio` | `drawio` |

Extension matching is longest-first, so `.drawio.xml` is matched before `.xml`.

## Manifest Format

The manifest file (`diagrams.manifest.json`) has this structure:

```json
{
  "version": 1,
  "diagrams": {
    "flow.mermaid": {
      "hash": "sha256:a1b2c3d4e5f67890",
      "generatedAt": "2025-01-15T10:30:00.000Z",
      "outputs": ["flow-light.svg", "flow-dark.svg"],
      "format": "svg"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | `1` | Manifest format version |
| `diagrams` | `Record<string, ManifestEntry>` | Map of source filename to entry |
| `hash` | `string` | SHA-256 hash of source file content (first 16 hex chars) |
| `generatedAt` | `string` | ISO 8601 timestamp of last render |
| `outputs` | `string[]` | List of output filenames |
| `format` | `OutputFormat` | Format used for this render |

## Example Configurations

### Default (no config file needed)

```json
{
  "outputDir": ".diagrams",
  "manifestFile": "diagrams.manifest.json",
  "useManifest": true,
  "sameFolder": false,
  "defaultFormat": "svg",
  "defaultTheme": "both"
}
```

### PNG output, same folder

```json
{
  "defaultFormat": "png",
  "sameFolder": true
}
```

### CI/CD (no caching)

```json
{
  "useManifest": false
}
```

### Custom extensions

```json
{
  "extensionMap": {
    ".flow": "mermaid",
    ".diagram": "drawio"
  }
}
```
