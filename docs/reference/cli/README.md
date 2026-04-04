---
title: CLI Reference
description: Complete command and option reference for the diagramkit CLI.
---

# CLI Reference

## Commands

| Command | Description |
|:--------|:------------|
| `render <file-or-dir>` | Render diagram file(s) to images |
| `warmup` | Pre-install Playwright Chromium browser |
| `init [--ts]` | Create config file |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

## `render` Options

| Flag | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `--format` | `svg`, `png`, `jpeg`, `webp`, `avif` | `svg` | Output format (comma-separated for multiple) |
| `--theme` | `light`, `dark`, `both` | `both` | Theme variant(s) |
| `--scale` | `number` | `2` | Raster scale factor |
| `--quality` | `number` | `90` | JPEG/WebP quality (1--100) |
| `--force`, `-f` | `boolean` | `false` | Re-render all, ignore cache |
| `--watch`, `-w` | `boolean` | `false` | Watch for changes |
| `--no-contrast` | `boolean` | `false` | Disable dark SVG contrast optimization |
| `--type` | `mermaid`, `excalidraw`, `drawio`, `graphviz` | all | Filter by type |
| `--output` | `string` | `.diagramkit/` sibling | Custom output dir (single-file only) |
| `--output-dir` | `string` | `.diagramkit` | Output folder name |
| `--manifest-file` | `string` | `manifest.json` | Manifest filename |
| `--no-manifest` | `boolean` | `false` | Disable manifest tracking |
| `--same-folder` | `boolean` | `false` | Output next to source files |
| `--dry-run` | `boolean` | `false` | Preview without rendering |
| `--quiet` | `boolean` | `false` | Errors only |
| `--config` | `string` | — | Path to config file (skip auto-discovery) |
| `--json` | `boolean` | `false` | JSON output for CI |

## Output Naming

Pattern: `{name}-{theme}.{format}`

| Source | Theme | Format | Output |
|:-------|:------|:-------|:-------|
| `flow.mermaid` | both | svg | `flow-light.svg`, `flow-dark.svg` |
| `system.excalidraw` | light | png | `system-light.png` |
| `arch.drawio` | dark | jpeg | `arch-dark.jpeg` |
| `dependency.dot` | dark | svg | `dependency-dark.svg` |

With `outputPrefix` / `outputSuffix` config:

```
${outputPrefix}${name}${outputSuffix}-${theme}.${format}
```

## Output Directory

By default, output goes to `.diagramkit/` next to the source:

```
project/
  docs/
    flow.mermaid
    .diagramkit/
      flow-light.svg
      flow-dark.svg
      manifest.json
```

Configurable via [`diagramkit.config.json5`](/guide/configuration).

## Supported File Types

| Extension | Type |
|:----------|:-----|
| `.mermaid`, `.mmd`, `.mmdc` | Mermaid |
| `.excalidraw` | Excalidraw |
| `.drawio`, `.drawio.xml`, `.dio` | Draw.io |
| `.dot`, `.gv`, `.graphviz` | Graphviz |

## Discovery Rules

When given a directory, `diagramkit render` recursively scans for supported extensions, skipping:

- Hidden directories (`.` prefix)
- `node_modules/`
- Symlinks
- Configured output directory

## Exit Codes

| Code | Meaning |
|:-----|:--------|
| `0` | Success |
| `1` | Error |

Watch mode stays running until `Ctrl+C`.
