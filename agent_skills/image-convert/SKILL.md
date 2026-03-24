---
name: image-convert
description: Convert SVG diagrams to raster formats (PNG, JPEG, WebP) when a raster asset is explicitly needed
user_invocable: true
arguments:
  - name: input
    description: 'Input SVG file path or directory'
    required: true
  - name: format
    description: 'Raster output format: png, jpeg, webp (default: png)'
    required: false
  - name: quality
    description: 'JPEG/WebP quality 1-100 (default: 90)'
    required: false
  - name: scale
    description: 'Scale factor / DPI multiplier (default: 2)'
    required: false
---

# Image Conversion

Prefer SVG by default. Use this skill when you explicitly need raster output, especially for destinations like email or Confluence. diagramkit handles both single files and batch conversions.

## CLI Usage

### Rendering directly to raster format

When a destination requires raster output, render diagram source files directly to the target format:

```bash
# Render mermaid/excalidraw/drawio directly to PNG for email or Confluence
diagramkit render diagram.mermaid --format png --theme light

# Render to JPEG with custom quality for email embeds
diagramkit render diagram.excalidraw --format jpeg --quality 95 --theme light

# Render to WebP with high resolution
diagramkit render diagram.drawio --format webp --scale 3 --quality 85

# Batch render all diagrams as PNG for email or Confluence
diagramkit render . --format png --theme light --scale 2
```

### Scale and Quality Options

```bash
# High-res PNG for print (3x scale)
diagramkit render . --format png --scale 3

# Optimized JPEG for slides
diagramkit render . --format jpeg --quality 90

# Compressed WebP for web
diagramkit render . --format webp --quality 80

# Maximum quality JPEG
diagramkit render . --format jpeg --quality 100 --scale 2
```

## JS/TS API Usage

### Using render() for format conversion

```typescript
import { render, renderFile } from 'diagramkit'

// Render from source string directly to PNG
const result = await render(mermaidSource, 'mermaid', {
  format: 'png',
  scale: 2,
  theme: 'light',
})
// result.light is a Buffer containing PNG data

// Render file to JPEG
const jpegResult = await renderFile('./diagram.mermaid', {
  format: 'jpeg',
  quality: 90,
  scale: 2,
})

// Render to WebP
const webpResult = await renderFile('./diagram.excalidraw', {
  format: 'webp',
  quality: 85,
  scale: 2,
})
```

### Batch conversion

```typescript
import { renderAll } from 'diagramkit'

// Render all diagrams in a directory as PNG
await renderAll({
  dir: './content',
  format: 'png',
  scale: 2,
})

// Render only mermaid diagrams as JPEG
await renderAll({
  dir: './docs',
  format: 'jpeg',
  quality: 90,
  type: 'mermaid',
})
```

## Format Comparison

| Format | Transparency  | File Size       | Quality           | Browser Support | Best For                                |
| ------ | ------------- | --------------- | ----------------- | --------------- | --------------------------------------- |
| SVG    | Yes           | Smallest        | Infinite (vector) | Universal       | Default choice for docs and markdown    |
| PNG    | Yes           | Medium          | Lossless          | Universal       | Email/Confluence when you need raster   |
| JPEG   | No (white bg) | Small           | Lossy             | Universal       | Email/Confluence when file size matters |
| WebP   | Yes           | Smallest raster | Lossy/Lossless    | Modern browsers | Raster-only web workflows               |

## Quality Settings by Use Case

| Use Case               | Format | Quality | Scale | Rationale                          |
| ---------------------- | ------ | ------- | ----- | ---------------------------------- |
| GitHub README          | SVG    | N/A     | N/A   | Vector, dark mode support          |
| Documentation site     | SVG    | N/A     | N/A   | Scales to any resolution           |
| Confluence/Google Docs | PNG    | N/A     | 2     | Reliable raster output for embeds  |
| Presentation slides    | PNG    | N/A     | 3     | Crisp on projectors, no artifacts  |
| Email / newsletters    | JPEG   | 85      | 2     | Small file size, universal support |
| High-DPI print         | PNG    | N/A     | 4     | Maximum detail                     |
| Blog post hero image   | WebP   | 85      | 2     | Best web performance               |
| Thumbnail / preview    | JPEG   | 75      | 1     | Small and fast                     |
| API documentation      | SVG    | N/A     | N/A   | Scalable, searchable text          |
| Mobile app assets      | WebP   | 80      | 2-3   | Smallest raster with quality       |

## Output Naming

diagramkit names output files based on the source filename, theme variant, and format:

```
source: architecture.mermaid

SVG output:
  .diagrams/architecture-light.svg
  .diagrams/architecture-dark.svg

PNG output:
  .diagrams/architecture-light.png
  .diagrams/architecture-dark.png

JPEG output:
  .diagrams/architecture-light.jpeg
  .diagrams/architecture-dark.jpeg

WebP output:
  .diagrams/architecture-light.webp
  .diagrams/architecture-dark.webp
```

## How Conversion Works

diagramkit converts SVG to raster formats using `sharp` (which uses librsvg internally):

1. diagramkit renders diagrams to SVG first using headless Chromium (Playwright).
2. The SVG is then passed to `sharp` with the requested density (scale \* 72 DPI).
3. `sharp` rasterizes the SVG and encodes it in the target format with the specified quality.

This means:

- SVG rendering is pixel-perfect (real browser rendering via Playwright).
- Rasterization is handled by sharp's librsvg backend, not the browser.
- Scale factor controls the effective DPI (scale=2 means 2x resolution).
- JPEG has a white background (no transparency).
- PNG preserves transparency.
- WebP can preserve transparency.

## Batch Conversion Examples

### Convert all diagrams in a project to PNG for email or Confluence

```bash
diagramkit render . --format png --scale 2
```

### Convert only excalidraw files to JPEG for Confluence

```bash
diagramkit render . --type excalidraw --format jpeg --quality 90 --theme light
```

### Keep SVG for a documentation site

```bash
diagramkit render ./docs
```

### WebP for a static site generator

```bash
diagramkit render ./content --format webp --quality 85 --scale 2
```

## Composability

This skill is used alongside diagram generation:

1. Generate a diagram with `/diagram-mermaid`, `/diagram-excalidraw`, or `/diagram-drawio`.
2. The generated source file is rendered via `diagramkit render` which handles format conversion.
3. Stay on SVG by default, then re-render with a raster format only for email/Confluence-style destinations.

diagramkit handles the full pipeline -- you do not need separate conversion tools like `sharp`, `imagemagick`, or `inkscape`.
