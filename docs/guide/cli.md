# CLI

diagramkit provides a command-line interface for rendering diagrams. No CLI framework is used -- arguments are parsed directly.

## Commands

### `render`

Render one or more diagram files to images.

```bash
diagramkit render <file-or-dir> [options]
```

When given a **file**, renders that single diagram. When given a **directory**, recursively discovers and renders all diagram files.

```bash
# Render all diagrams in current directory
diagramkit render .

# Render a single file
diagramkit render docs/architecture.mermaid

# Render a specific directory
diagramkit render ./content/posts
```

### `warmup`

Pre-install the Playwright Chromium browser binary.

```bash
diagramkit warmup
```

This is equivalent to running `npx playwright install chromium`. Run this once when setting up a new environment.

## Render Options

### `--format <svg|png|jpeg|webp>`

Output format. Default: `svg`.

```bash
diagramkit render . --format png
diagramkit render . --format jpeg
diagramkit render . --format webp
```

::: tip
PNG, JPEG, and WebP output require `sharp`. Install it with `npm add sharp`.
:::

### `--theme <light|dark|both>`

Which theme variants to render. Default: `both`.

```bash
# Only light theme
diagramkit render . --theme light

# Only dark theme
diagramkit render . --theme dark

# Both variants (default)
diagramkit render . --theme both
```

| Value | Output files |
|-------|-------------|
| `both` | `name-light.ext` + `name-dark.ext` |
| `light` | `name-light.ext` |
| `dark` | `name-dark.ext` |

### `--scale <number>`

Scale factor for raster output (PNG, JPEG, WebP). Default: `2`.

Higher values produce sharper images at larger file sizes. Has no effect on SVG output.

```bash
# 3x resolution for high-DPI displays
diagramkit render . --format png --scale 3
```

### `--quality <number>`

JPEG/WebP quality from 1 to 100. Default: `90`.

```bash
diagramkit render . --format jpeg --quality 80
```

### `--force`

Re-render all diagrams, ignoring the manifest cache.

```bash
diagramkit render . --force
```

### `--watch`

Watch for file changes and re-render automatically. See [Watch Mode](/guide/watch-mode).

```bash
diagramkit render . --watch
```

### `--no-contrast`

Disable the automatic dark SVG contrast optimization. By default, dark-mode SVGs are post-processed to fix fill colors with poor contrast against dark backgrounds. Use this flag to get the raw dark theme output.

```bash
diagramkit render . --no-contrast
```

### `--type <mermaid|excalidraw|drawio>`

Filter rendering to a specific diagram type. Only files of the given type are processed.

```bash
diagramkit render . --type mermaid
diagramkit render . --type excalidraw
diagramkit render . --type drawio
```

### `--output <dir>`

Custom output directory for single-file renders. Overrides the default `.diagrams/` sibling folder.

```bash
diagramkit render diagram.mermaid --output ./build/images
```

::: tip
This flag applies to single-file rendering only. For directory renders, output is always placed in `.diagrams/` folders next to the source files (configurable via [configuration](/guide/configuration)).
:::

## Global Flags

### `-h, --help`

Show the help message.

```bash
diagramkit --help
```

### `-v, --version`

Show the installed version.

```bash
diagramkit --version
```

## Examples

```bash
# Render everything, default settings
diagramkit render .

# High-res PNGs for documentation
diagramkit render ./docs --format png --scale 3

# Watch mode during development
diagramkit render . --watch

# Only mermaid diagrams, force re-render
diagramkit render . --type mermaid --force

# JPEG output with custom quality
diagramkit render . --format jpeg --quality 75

# Single file to a custom output folder
diagramkit render flow.mermaid --output ./static/images
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (unknown command, render failure, etc.) |

In watch mode, the process stays running until interrupted with `Ctrl+C` (SIGINT).
