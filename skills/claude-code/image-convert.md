---
name: image-convert
description: Convert SVG diagrams to raster formats (PNG, JPEG, WebP) using diagramkit's built-in conversion
user_invocable: true
arguments:
  - name: input
    description: 'Input SVG file path or directory'
    required: true
  - name: format
    description: 'Output format: png, jpeg, webp (default: png)'
    required: false
  - name: quality
    description: 'JPEG/WebP quality 1-100 (default: 90)'
    required: false
  - name: scale
    description: 'Scale factor / DPI multiplier (default: 2)'
    required: false
---

# Image Conversion

Convert SVG diagrams to raster formats (PNG, JPEG, WebP) using diagramkit's built-in Playwright-based conversion. Handles both single files and batch conversions.

## CLI Usage

### Rendering directly to raster format

The simplest approach -- render diagram source files directly to your target format:

```bash
# Render mermaid/excalidraw/drawio directly to PNG
diagramkit render diagram.mermaid --format png

# Render to JPEG with custom quality
diagramkit render diagram.excalidraw --format jpeg --quality 95

# Render to WebP with high resolution
diagramkit render diagram.drawio --format webp --scale 3 --quality 85

# Batch render all diagrams as PNG
diagramkit render . --format png --scale 2
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

| Format | Transparency  | File Size       | Quality           | Browser Support | Best For                   |
| ------ | ------------- | --------------- | ----------------- | --------------- | -------------------------- |
| SVG    | Yes           | Smallest        | Infinite (vector) | Universal       | Web, GitHub, markdown      |
| PNG    | Yes           | Medium          | Lossless          | Universal       | Docs, presentations, print |
| JPEG   | No (white bg) | Small           | Lossy             | Universal       | Slides, email, Confluence  |
| WebP   | Yes           | Smallest raster | Lossy/Lossless    | Modern browsers | Modern web, performance    |

## Quality Settings by Use Case

| Use Case               | Format | Quality | Scale | Rationale                            |
| ---------------------- | ------ | ------- | ----- | ------------------------------------ |
| GitHub README          | SVG    | N/A     | N/A   | Vector, dark mode support            |
| Documentation site     | SVG    | N/A     | N/A   | Scales to any resolution             |
| Confluence/Google Docs | JPEG   | 90      | 2     | Wide compatibility, good compression |
| Presentation slides    | PNG    | N/A     | 3     | Crisp on projectors, no artifacts    |
| Email / newsletters    | JPEG   | 85      | 2     | Small file size, universal support   |
| High-DPI print         | PNG    | N/A     | 4     | Maximum detail                       |
| Blog post hero image   | WebP   | 85      | 2     | Best web performance                 |
| Thumbnail / preview    | JPEG   | 75      | 1     | Small and fast                       |
| API documentation      | SVG    | N/A     | N/A   | Scalable, searchable text            |
| Mobile app assets      | WebP   | 80      | 2-3   | Smallest raster with quality         |

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

diagramkit converts SVG to raster formats using Playwright's screenshot API:

1. The SVG is loaded into a headless Chromium page.
2. Playwright takes a screenshot at the specified scale factor.
3. The screenshot is encoded in the target format with the specified quality.

This means:

- Rendering is pixel-perfect (real browser rendering).
- Custom fonts, filters, and CSS are fully supported.
- Scale factor controls the effective DPI (scale=2 means 2x resolution).
- JPEG has a white background (no transparency).
- PNG preserves transparency.
- WebP can preserve transparency.

## Batch Conversion Examples

### Convert all diagrams in a project to PNG

```bash
diagramkit render . --format png --scale 2
```

### Convert only excalidraw files to JPEG for Confluence

```bash
diagramkit render . --type excalidraw --format jpeg --quality 90 --theme light
```

### High-res PNG for a documentation site

```bash
diagramkit render ./docs --format png --scale 3
```

### WebP for a static site generator

```bash
diagramkit render ./content --format webp --quality 85 --scale 2
```

## Composability

This skill is used alongside diagram generation:

1. Generate a diagram with `/diagram-mermaid`, `/diagram-excalidraw`, or `/diagram-drawio`.
2. The generated source file is rendered via `diagramkit render` which handles format conversion.
3. For SVG-first workflows, generate SVG first, then re-render with a different format flag.

diagramkit handles the full pipeline -- you do not need separate conversion tools like `sharp`, `imagemagick`, or `inkscape`.
