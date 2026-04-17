---
title: diagramkit/color
description: Dark SVG contrast utilities exported from the diagramkit/color subpath.
---

# diagramkit/color

`diagramkit/color` exposes the WCAG-aware post-processor that diagramkit applies to dark-theme SVGs.

```ts
import { postProcessDarkSvg } from 'diagramkit/color'

const darkSvg = postProcessDarkSvg(sourceSvg)
```

## `postProcessDarkSvg(svg): string`

Walks every `fill`, `stroke`, and `color` value in the input SVG and, when a color would fail the WCAG 1.4.11 non-text contrast guideline against a dark background, nudges luminance while preserving hue. The output is still a valid SVG string.

Called by the main pipeline before writing dark outputs. You only need to call it directly when:

- You are composing your own pipeline that bypasses `renderAll` / `renderFile`.
- You received an SVG from another tool and want diagramkit's dark-mode correction applied.

Pass `--no-contrast` to the CLI or `contrast: false` in render options to skip this step globally.
