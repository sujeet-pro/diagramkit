# CLI Reference

## Commands

| Command | Description |
|---------|-------------|
| `render <file-or-dir>` | Render diagram file(s) to images |
| `warmup` | Pre-install Playwright Chromium browser |
| `--help`, `-h` | Show help message |
| `--version`, `-v` | Show installed version |

## `render` Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format` | `svg \| png \| jpeg \| webp` | `svg` | Output image format |
| `--theme` | `light \| dark \| both` | `both` | Theme variant(s) to render |
| `--scale` | `number` | `2` | Scale factor for raster output (PNG/JPEG/WebP) |
| `--quality` | `number` | `90` | JPEG/WebP quality, 1-100 |
| `--force` | `boolean` | `false` | Re-render all, ignore manifest cache |
| `--watch` | `boolean` | `false` | Watch for changes and re-render |
| `--no-contrast` | `boolean` | `false` | Disable dark SVG contrast optimization |
| `--type` | `mermaid \| excalidraw \| drawio` | all | Filter to specific diagram type |
| `--output` | `string` | `.diagrams/` sibling | Custom output directory (single-file mode only) |

## Output Naming

Output files follow this pattern:

```
{name}-{theme}.{format}
```

Where:
- `{name}` is the source filename without extension
- `{theme}` is `light` or `dark`
- `{format}` is the output format extension

### Examples

| Source | Theme | Format | Output |
|--------|-------|--------|--------|
| `flow.mermaid` | both | svg | `flow-light.svg`, `flow-dark.svg` |
| `system.excalidraw` | light | png | `system-light.png` |
| `arch.drawio` | dark | jpeg | `arch-dark.jpeg` |

## Output Directory

By default, output goes to a `.diagrams/` hidden folder next to the source file:

```
project/
  docs/
    flow.mermaid
    .diagrams/              # Auto-created
      flow-light.svg
      flow-dark.svg
      diagrams.manifest.json
```

This behavior is configurable via [`.diagramkitrc.json`](/guide/configuration).

## Usage Examples

### Basic

```bash
# Render all diagrams in current directory
diagramkit render .

# Render a single file
diagramkit render flow.mermaid

# Render a subdirectory
diagramkit render ./docs
```

### Format and Quality

```bash
# PNG at 3x scale
diagramkit render . --format png --scale 3

# JPEG with reduced quality
diagramkit render . --format jpeg --quality 75

# WebP output
diagramkit render . --format webp --quality 85
```

### Theme Selection

```bash
# Light theme only
diagramkit render . --theme light

# Dark theme only
diagramkit render . --theme dark
```

### Filtering

```bash
# Only mermaid diagrams
diagramkit render . --type mermaid

# Only excalidraw diagrams
diagramkit render . --type excalidraw

# Only drawio diagrams
diagramkit render . --type drawio
```

### Cache Control

```bash
# Force re-render everything
diagramkit render . --force

# Render without dark mode contrast fix
diagramkit render . --no-contrast
```

### Watch Mode

```bash
# Watch and re-render on changes
diagramkit render . --watch

# Watch with specific format
diagramkit render . --watch --format png --scale 2
```

### Custom Output

```bash
# Single file to custom directory
diagramkit render flow.mermaid --output ./build/images
```

## Supported File Types

| Extension | Diagram Type | Notes |
|-----------|-------------|-------|
| `.mermaid` | Mermaid | Standard extension |
| `.mmd` | Mermaid | Short alias |
| `.mmdc` | Mermaid | Mermaid CLI-compatible alias |
| `.excalidraw` | Excalidraw | JSON format |
| `.drawio` | Draw.io | XML format |
| `.drawio.xml` | Draw.io | XML variant |
| `.dio` | Draw.io | Short alias |

## Discovery Rules

When given a directory, `diagramkit render` recursively scans for supported file extensions. It skips:

- Hidden directories (names starting with `.`)
- `node_modules/`

## Exit Behavior

- Normal render: exits with code `0` on success, `1` on error
- Watch mode: stays running, exits `0` on SIGINT (`Ctrl+C`)
- Unknown command: exits with code `1`
