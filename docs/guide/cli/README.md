---
title: CLI
description: Complete guide to the diagramkit command-line interface -- the recommended way to render diagrams.
---

# CLI

The CLI is the recommended way to use diagramkit. It handles file discovery, incremental builds, watch mode, and output naming automatically.

## Commands

### `render`

Render one or more diagram files to images.

```bash
diagramkit render <file-or-dir> [options]
```

A **file** renders that single diagram. A **directory** recursively discovers and renders all diagram files.

```bash
# Render all diagrams in the current directory
diagramkit render .

# Render a single file
diagramkit render docs/architecture.mermaid

# Render a specific directory
diagramkit render ./content/posts
```

### `warmup`

Pre-install the Playwright Chromium browser binary. Run once per environment.

```bash
diagramkit warmup
```

### `init`

Create a config file in the current directory.

```bash
diagramkit init          # diagramkit.config.json5
diagramkit init --ts     # diagramkit.config.ts with defineConfig()
```

## Render Options

### Output Format

```bash
diagramkit render . --format svg      # default
diagramkit render . --format png
diagramkit render . --format jpeg
diagramkit render . --format webp
diagramkit render . --format avif
diagramkit render . --format svg,png  # multiple formats in one pass
```

> [!TIP]
> PNG, JPEG, WebP, and AVIF require `sharp`. Install with `npm add sharp`.

### Theme

```bash
diagramkit render . --theme both      # default -- produces -light and -dark variants
diagramkit render . --theme light     # light only
diagramkit render . --theme dark      # dark only
```

### Scale and Quality (Raster Only)

```bash
diagramkit render . --format png --scale 3       # 3x resolution for HiDPI
diagramkit render . --format jpeg --quality 80    # compression quality 1-100
diagramkit render . --format webp --quality 85 --scale 2
```

### Force Re-render

```bash
diagramkit render . --force      # ignore manifest cache, re-render everything
diagramkit render . -f           # short form
```

### Watch Mode

```bash
diagramkit render . --watch      # watch for changes, re-render on save
diagramkit render . -w           # short form
```

See [Watch Mode](/guide/watch-mode) for details.

### Dark Mode Contrast

```bash
diagramkit render . --no-contrast    # skip WCAG contrast optimization on dark SVGs
```

By default, dark-mode Mermaid and Graphviz SVGs are post-processed to fix fill colors with poor contrast.

### Filter by Type

```bash
diagramkit render . --type mermaid
diagramkit render . --type excalidraw
diagramkit render . --type drawio
diagramkit render . --type graphviz
```

### Custom Output

```bash
# Single file to a custom directory
diagramkit render diagram.mermaid --output ./build/images

# Change the output folder name (default: .diagramkit)
diagramkit render . --output-dir images

# Place outputs next to source files (no subfolder)
diagramkit render . --same-folder
```

### Explicit Config File

```bash
diagramkit render . --config ./custom.config.json5
```

Use `--config` to point at a specific config file instead of auto-discovery. Useful for CI or monorepo setups.

### Manifest Control

```bash
diagramkit render . --no-manifest                        # disable incremental caching
diagramkit render . --manifest-file custom-manifest.json # custom manifest filename
```

### Scripting and CI

```bash
diagramkit render . --dry-run    # preview what would render, without rendering
diagramkit render . --quiet      # suppress info output, errors only
diagramkit render . --json       # machine-readable JSON output
```

## Global Flags

```bash
diagramkit --help       # show help
diagramkit -h
diagramkit --version    # show version
diagramkit -v
```

## Examples

```bash
# Render everything with defaults
diagramkit render .

# High-res PNGs for documentation
diagramkit render ./docs --format png --scale 3

# Watch mode during development
diagramkit render . --watch

# Only mermaid, force re-render
diagramkit render . --type mermaid --force

# Graphviz DOT to dark-only SVG
diagramkit render dependency.dot --theme dark

# Single file to a custom folder
diagramkit render flow.mermaid --output ./static/images

# Explicit config file for CI
diagramkit render . --config ./ci.config.json5

# CI: JSON output, no caching
diagramkit render . --json --no-manifest
```

## Exit Codes

| Code | Meaning |
|:-----|:--------|
| `0`  | Success |
| `1`  | Error (unknown command, render failure, etc.) |

In watch mode, the process stays running until `Ctrl+C` (SIGINT).
