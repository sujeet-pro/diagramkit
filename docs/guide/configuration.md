# Configuration

diagramkit uses a layered configuration system. Settings are merged in this order (later sources override earlier ones):

1. **Defaults** -- built-in default values
2. **Global config** -- `~/.config/diagramkit/config.json`
3. **Local config** -- `.diagramkitrc.json` (walks up from the working directory)
4. **CLI flags / API overrides** -- highest priority

## Config File Locations

### Local: `.diagramkitrc.json`

Place a `.diagramkitrc.json` file in your project root (or any parent directory). diagramkit walks up the directory tree until it finds one.

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

### Global: `~/.config/diagramkit/config.json`

For machine-wide defaults, create a config file at `~/.config/diagramkit/config.json` (or `$XDG_CONFIG_HOME/diagramkit/config.json` if `XDG_CONFIG_HOME` is set).

```json
{
  "defaultFormat": "png",
  "defaultTheme": "both"
}
```

## All Options

### `outputDir`

- **Type:** `string`
- **Default:** `'.diagrams'`

Name of the output folder created next to source files. Set to a different name if `.diagrams` conflicts with your project structure.

```json
{
  "outputDir": "_generated"
}
```

### `manifestFile`

- **Type:** `string`
- **Default:** `'diagrams.manifest.json'`

Filename of the manifest inside the output folder. The manifest tracks content hashes for incremental builds.

```json
{
  "manifestFile": "manifest.json"
}
```

### `useManifest`

- **Type:** `boolean`
- **Default:** `true`

Whether to use the manifest for incremental builds. When `false`, all diagrams are re-rendered every time (equivalent to `--force`), and no manifest file is written.

```json
{
  "useManifest": false
}
```

### `sameFolder`

- **Type:** `boolean`
- **Default:** `false`

Place output files in the same folder as the source file instead of creating a subdirectory. When `true`, `outputDir` is ignored.

```json
{
  "sameFolder": true
}
```

This produces:

```
docs/
  architecture.mermaid
  architecture-light.svg    # Same folder, no .diagrams/ subfolder
  architecture-dark.svg
```

### `defaultFormat`

- **Type:** `'svg' | 'png' | 'jpeg' | 'webp'`
- **Default:** `'svg'`

Default output format when not specified via CLI flag or API option.

```json
{
  "defaultFormat": "png"
}
```

### `defaultTheme`

- **Type:** `'light' | 'dark' | 'both'`
- **Default:** `'both'`

Default theme variant(s) to render.

```json
{
  "defaultTheme": "light"
}
```

### `extensionMap`

- **Type:** `Record<string, DiagramType>`
- **Default:** `undefined` (uses built-in map)

Custom extension-to-type mapping, merged with the built-in map. Use this to add new file extensions or override existing ones.

```json
{
  "extensionMap": {
    ".mmd": "mermaid",
    ".custom-diagram": "mermaid"
  }
}
```

The built-in extension map is:

| Extension | Diagram Type |
|-----------|-------------|
| `.mermaid` | `mermaid` |
| `.mmd` | `mermaid` |
| `.mmdc` | `mermaid` |
| `.excalidraw` | `excalidraw` |
| `.drawio` | `drawio` |
| `.drawio.xml` | `drawio` |
| `.dio` | `drawio` |

## Example Configurations

### Minimal (defaults are fine for most projects)

```json
{}
```

### Custom output folder

```json
{
  "outputDir": "generated-images"
}
```

### PNG output, same folder

```json
{
  "defaultFormat": "png",
  "sameFolder": true
}
```

### CI pipeline (no manifest caching)

```json
{
  "useManifest": false,
  "defaultFormat": "png"
}
```

## Precedence Example

Given this setup:

**`~/.config/diagramkit/config.json`:**
```json
{ "defaultFormat": "png" }
```

**`.diagramkitrc.json`:**
```json
{ "defaultFormat": "svg", "outputDir": "_diagrams" }
```

**CLI:**
```bash
diagramkit render . --format jpeg
```

The resolved config is:

| Option | Value | Source |
|--------|-------|--------|
| `defaultFormat` | `jpeg` | CLI flag (highest priority) |
| `outputDir` | `_diagrams` | Local config |
| `manifestFile` | `diagrams.manifest.json` | Default |
| `useManifest` | `true` | Default |
| `sameFolder` | `false` | Default |
| `defaultTheme` | `both` | Default |
