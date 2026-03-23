# Image Formats

diagramkit supports four output formats: SVG, PNG, JPEG, and WebP. Each has different characteristics suited to different use cases.

## Format Comparison

| Format | Type | Transparency | Dark Mode | File Size | Best For |
|--------|------|-------------|-----------|-----------|----------|
| SVG | Vector | Yes | Yes | Smallest | Web, documentation, version control |
| PNG | Raster | Yes | Yes | Medium | Documentation, presentations, README files |
| JPEG | Raster | No | Yes | Small | Slides, email, social media |
| WebP | Raster | Yes | Yes | Smallest raster | Modern web, performance-optimized sites |

## SVG (Default)

SVG is the default and recommended format. Diagrams remain crisp at any zoom level, produce the smallest files, and diff cleanly in version control.

```bash
diagramkit render . --format svg
```

SVG output includes parsed width and height attributes in the render result, useful for layout calculations.

::: tip
SVG is the only format that preserves vector quality. Use it whenever possible, especially for web-based documentation.
:::

## PNG

PNG produces raster images with transparency support. Good for contexts where SVG is not supported (e.g., some Markdown renderers, social media previews).

```bash
diagramkit render . --format png
diagramkit render . --format png --scale 3   # High-DPI
```

The `--scale` flag controls the pixel density. Default is `2` (2x resolution). For high-DPI displays or print, use `3` or higher.

## JPEG

JPEG produces compressed raster images with a white background (no transparency). Smaller files than PNG but lossy compression.

```bash
diagramkit render . --format jpeg
diagramkit render . --format jpeg --quality 80
```

The `--quality` flag controls compression quality from 1 (smallest, lowest quality) to 100 (largest, highest quality). Default is `90`.

## WebP

WebP produces modern raster images with transparency support and better compression than PNG or JPEG.

```bash
diagramkit render . --format webp
diagramkit render . --format webp --quality 85
```

Supports both the `--scale` and `--quality` flags.

::: warning
WebP support requires the `sharp` library. If sharp is not installed, WebP conversion will fail with a clear error message. Install it with `npm add sharp`.
:::

## Raster Conversion Pipeline

For raster formats, diagramkit uses two conversion paths:

### Built-in (Playwright Screenshot)

The primary rendering pipeline uses Playwright's built-in screenshot capability:
1. Render the diagram to SVG in headless Chromium
2. Set the viewport to the SVG dimensions multiplied by the scale factor
3. Screenshot the SVG element directly

This path is used by the `render()` and `renderFile()` functions when a raster format is specified.

### External (`convertSvg` with sharp)

For standalone SVG-to-raster conversion, the `convertSvg()` function uses [sharp](https://sharp.pixelplumbing.com/):

```typescript
import { convertSvg } from 'diagramkit/convert'

const png = await convertSvg(svgBuffer, {
  format: 'png',
  density: 2,    // Multiplied by 72 DPI internally
})
```

sharp is dynamically imported and only required when you call this function.

## Scale and Quality Options

### Scale (`--scale`)

Controls the pixel density of raster output. Only affects PNG, JPEG, and WebP.

| Scale | Result | Use Case |
|-------|--------|----------|
| `1` | 1x resolution | Small file size, standard displays |
| `2` | 2x resolution (default) | Retina/HiDPI displays |
| `3` | 3x resolution | High-DPI, print |
| `4` | 4x resolution | Large-format print |

### Quality (`--quality`)

Controls lossy compression for JPEG and WebP. Ignored for SVG and PNG.

| Quality | Result |
|---------|--------|
| `100` | Highest quality, largest file |
| `90` | Default, good balance |
| `75` | Smaller file, slight artifacts |
| `50` | Small file, visible artifacts |

## Choosing a Format

- **Documentation site** -- SVG. It is vector, small, and supports dark mode switching via `<picture>`.
- **GitHub README** -- SVG or PNG. GitHub renders both. SVG gives better quality; PNG works in more contexts.
- **Presentations** -- PNG at `--scale 3` or JPEG for smaller files.
- **Email/chat** -- PNG or JPEG. SVG is often blocked or unsupported.
- **Performance-critical web** -- WebP with `--quality 85` for the best size/quality ratio.
