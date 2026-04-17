---
title: diagramkit/convert
description: SVG-to-raster conversion exported from the diagramkit/convert subpath.
---

# diagramkit/convert

`diagramkit/convert` exposes the SVG → PNG/JPEG/WebP/AVIF conversion used by raster renders.

```ts
import { convertSvg } from 'diagramkit/convert'

const png = await convertSvg(svgString, { format: 'png', scale: 2 })
```

## `convertSvg(svg, options): Promise<Buffer>`

Converts an SVG string to a raster `Buffer` via `sharp`. `sharp` is an optional peer dependency — install it with `npm add sharp` before calling this function, or the call will reject with a clear error.

### Options

| Option    | Type                                          | Default | Description                                                |
| --------- | --------------------------------------------- | ------- | ---------------------------------------------------------- |
| `format`  | `'png' \| 'jpeg' \| 'webp' \| 'avif'`         | `'png'` | Target raster format.                                      |
| `scale`   | `number`                                      | `2`     | Rasterization density. `3` yields retina-ready output.     |
| `quality` | `number` (1-100)                              | `90`    | Quality for lossy formats (JPEG/WebP/AVIF). Ignored for PNG.|

### Errors

- `DiagramkitError` with code `SHARP_NOT_INSTALLED` when `sharp` cannot be resolved at runtime.
- `DiagramkitError` with code `CONVERT_FAILED` for any sharp-level failure (invalid SVG, dimensions missing, etc.). The underlying error is attached as `cause`.

### When to use directly

The main pipeline calls `convertSvg` automatically for any non-SVG format. Call it yourself when you are composing a custom pipeline — for example, rendering once with `render()` and then converting the same SVG string to multiple raster formats without rendering again.
