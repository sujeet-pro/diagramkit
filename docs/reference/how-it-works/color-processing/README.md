---
title: Color processing
description: How diagramkit adjusts dark-theme SVG colors for WCAG contrast while preserving hue.
---

# Color processing

diagramkit's dark-mode SVGs go through a post-processing step that nudges any low-contrast colors away from the dark background. See `src/color/` for the implementation.

## Pipeline

```text
Dark-theme SVG (from the engine)
      │
      ▼
Parse fill / stroke / color attributes (and inline style)
      │
      ▼
Convert each color to HSL via src/color/convert.ts
      │
      ▼
Compute WCAG relative luminance (src/color/luminance.ts)
      │
      ▼
If contrast against dark BG < threshold → raise L while preserving H and S
      │
      ▼
Write adjusted color back into the SVG
      │
      ▼
Post-processed dark SVG
```

## What gets adjusted

- Inline `fill="…"`, `stroke="…"`, and `color="…"` attributes.
- Inline `style="…"` declarations (`fill:`, `stroke:`, `color:`).
- Hex, `rgb()`, `rgba()`, and CSS named color inputs.

What does **not** get adjusted:

- `<stop>` elements inside gradients. The gradient itself carries intent; we leave it alone.
- Raster images embedded via `<image href>`.
- External stylesheets referenced by URL.

## Preserving hue

Adjustment happens in HSL space. Only the L (lightness) channel is modified; H and S are preserved. This avoids turning a brand red into a brand pink just to satisfy contrast.

## Disabling

- CLI: `--no-contrast`
- API: pass `contrastOptimize: false` in `RenderOptions`.
- Per-file: set `contrastOptimize: false` inside a matching `overrides` entry in `diagramkit.config.json5`.

Light-theme SVGs are never post-processed — they are assumed to be authored with a white background in mind.

## Direct API

`postProcessDarkSvg(svg)` is exported from both `diagramkit/color` and `diagramkit/utils` for consumers who want to apply the same adjustment to SVGs produced by other tools. See [diagramkit/color](../../diagramkit/color/README.md) and [diagramkit/utils](../../diagramkit/utils/README.md).
