---
name: diagramkit
description: Render .mermaid, .excalidraw, and .drawio diagrams to SVG/PNG/JPEG/WebP with light/dark mode support and color contrast optimization
user_invocable: true
arguments:
  - name: command
    description: 'CLI command: render, warmup, init, install-skills'
    required: true
  - name: target
    description: 'File or directory to render (default: current directory)'
    required: false
  - name: format
    description: 'Output format: svg, png, jpeg, webp (default: svg)'
    required: false
  - name: theme
    description: 'Theme: light, dark, both (default: both)'
    required: false
---

# diagramkit -- Diagram Rendering CLI & Library

You have access to `diagramkit`, a CLI tool and library for rendering `.mermaid`, `.excalidraw`, and `.drawio` files to images with automatic light/dark mode support.

## Quick Reference

```bash
# Render all diagrams in current directory
diagramkit render .

# Render a single file
diagramkit render path/to/diagram.mermaid

# Render raster output for email or Confluence
diagramkit render . --format png --theme light --scale 2

# Render as WebP when a compressed raster image is required
diagramkit render . --format webp --quality 85

# Watch for changes
diagramkit render . --watch

# Force re-render (ignore cache)
diagramkit render . --force

# Filter to specific type
diagramkit render . --type mermaid
diagramkit render . --type excalidraw
diagramkit render . --type drawio

# Custom output directory for a single file
diagramkit render flow.mermaid --output ./rendered

# Disable dark mode contrast optimization
diagramkit render . --no-contrast

# Pre-install Playwright chromium
diagramkit warmup

# Initialize a config file
diagramkit init

# Install Claude Code skills
diagramkit install-skills
diagramkit install-skills --global

# Dry run / quiet / JSON output
diagramkit render . --dry-run
diagramkit render . --quiet
diagramkit render . --json
```

## Supported File Extensions

| Extension     | Diagram Type | Notes                     |
| ------------- | ------------ | ------------------------- |
| `.mermaid`    | Mermaid      | Primary extension         |
| `.mmd`        | Mermaid      | Short alias               |
| `.mmdc`       | Mermaid      | mermaid-cli compatibility |
| `.excalidraw` | Excalidraw   | Excalidraw JSON format    |
| `.drawio`     | Draw.io      | Primary extension         |
| `.drawio.xml` | Draw.io      | Explicit XML format       |
| `.dio`        | Draw.io      | Short alias               |

Custom extension mappings can be added via configuration (see Configuration section).

## Output Convention

Rendered images go to a `.diagrams/` hidden folder next to the source file:

```
content/posts/my-post/
  architecture.mermaid          <- source
  network.drawio                <- source
  system.excalidraw             <- source
  .diagrams/
    architecture-light.svg      <- rendered (auto-generated)
    architecture-dark.svg       <- rendered (auto-generated)
    network-light.svg           <- rendered (auto-generated)
    network-dark.svg            <- rendered (auto-generated)
    system-light.svg            <- rendered (auto-generated)
    system-dark.svg             <- rendered (auto-generated)
    diagrams.manifest.json      <- cache manifest
```

## Supported Output Formats

| Format | Flag                     | Notes                                                 |
| ------ | ------------------------ | ----------------------------------------------------- |
| SVG    | `--format svg` (default) | Vector, preferred default for most workflows          |
| PNG    | `--format png`           | Raster, use when email/Confluence need images         |
| JPEG   | `--format jpeg`          | Raster, white background, use for email embeds        |
| WebP   | `--format webp`          | Raster, modern option when a raster asset is required |

### Format Selection Guide

| Use Case                                | Recommended Format   |
| --------------------------------------- | -------------------- |
| Web / GitHub / markdown                 | SVG                  |
| Docs sites / developer docs             | SVG                  |
| Documentation (Confluence, Google Docs) | PNG or JPEG          |
| Email / newsletters                     | PNG or JPEG          |
| Presentations / slides                  | PNG or JPEG          |
| Maximum compression, modern browsers    | WebP                 |
| Print / high-DPI displays               | PNG with `--scale 3` |

## Theme Options

| Theme      | Flag                     | Output                             |
| ---------- | ------------------------ | ---------------------------------- |
| Both       | `--theme both` (default) | `name-light.ext` + `name-dark.ext` |
| Light only | `--theme light`          | `name-light.ext`                   |
| Dark only  | `--theme dark`           | `name-dark.ext`                    |

## Linking in Markdown

Reference the rendered SVGs in markdown with a `<picture>` element for automatic light/dark switching:

```html
<picture>
  <source srcset=".diagrams/architecture-dark.svg" media="(prefers-color-scheme: dark)" />
  <img src=".diagrams/architecture-light.svg" alt="Architecture diagram" />
</picture>
```

Or use two `<img>` tags with CSS classes:

```html
<img src=".diagrams/architecture-light.svg" alt="Architecture" class="only-light" />
<img src=".diagrams/architecture-dark.svg" alt="Architecture" class="only-dark" />
```

## Configuration

diagramkit supports three configuration layers (highest priority first):

### 1. CLI Flags (highest priority)

```bash
diagramkit render . --theme light --force
```

### 2. Local Config (per-directory)

Create a `.diagramkitrc.json` in your project root:

```json
{
  "outputDir": ".diagrams",
  "defaultFormat": "svg",
  "defaultTheme": "both",
  "useManifest": true,
  "sameFolder": false,
  "extensionMap": {
    ".custom-diagram": "mermaid"
  }
}
```

### 3. Global Config

Global defaults from `~/.config/diagramkit/config.json`.

### Configuration Options

| Option          | Type    | Default                  | Description                                              |
| --------------- | ------- | ------------------------ | -------------------------------------------------------- |
| `outputDir`     | string  | `.diagrams`              | Output folder name, created next to source files         |
| `manifestFile`  | string  | `diagrams.manifest.json` | Manifest filename inside output folder                   |
| `useManifest`   | boolean | `true`                   | Enable incremental builds via SHA-256 hashing            |
| `sameFolder`    | boolean | `false`                  | Place outputs next to source (no subfolder)              |
| `defaultFormat` | string  | `svg`                    | Default output format                                    |
| `defaultTheme`  | string  | `both`                   | Default theme mode                                       |
| `extensionMap`  | object  | `{}`                     | Custom extension-to-type mappings (merged with built-in) |

## Dark Mode Contrast

Dark SVGs are automatically post-processed to fix color contrast:

- Fill colors with high luminance (>0.4 WCAG) are darkened
- Hue is preserved so colored nodes keep their visual identity
- Disable with `--no-contrast` if you want raw dark theme output

## JS/TS API

```typescript
import { render, renderFile, renderAll, warmup, dispose } from 'diagramkit'

// Render from string
const result = await render(mermaidSource, 'mermaid', {
  format: 'svg',
  theme: 'both',
})

// Render from file
const result = await renderFile('./diagram.excalidraw', {
  format: 'svg',
})

// Batch render directory
await renderAll({
  dir: './content',
  format: 'svg',
  force: false,
})

// Browser lifecycle
await warmup() // Pre-install chromium
await dispose() // Clean up browser
```

## Authoring Diagram Source Files

For creating diagram source files, use the dedicated generation skills:

- `/diagram-mermaid` -- Mermaid authoring with syntax for all 20+ diagram types
- `/diagram-excalidraw` -- Excalidraw JSON authoring with layout patterns and color palettes
- `/diagram-drawio` -- Draw.io XML authoring with shape libraries and style reference

This skill (`/diagramkit`) is for **rendering** existing diagram source files to images.

## Manifest & Caching

diagramkit uses SHA-256 content hashing for incremental builds:

- Only re-renders files whose content has changed
- Manifest stored in `.diagrams/diagrams.manifest.json`
- Use `--force` to bypass and re-render everything
- Orphaned outputs (source file deleted) are automatically cleaned up

## Watch Mode

```bash
diagramkit render . --watch
```

Uses chokidar to watch for changes to diagram source files and automatically re-renders on save. Press Ctrl+C to stop.
