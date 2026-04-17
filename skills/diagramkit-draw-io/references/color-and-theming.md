# Draw.io Color and Theming Reference

## Pastel Palette

Default palette for Draw.io diagrams. These mid-tone colors work well in both light and dark modes.

| Purpose | Fill      | Stroke    |
| ------- | --------- | --------- |
| Blue    | `#dae8fc` | `#6c8ebf` |
| Green   | `#d5e8d4` | `#82b366` |
| Orange  | `#ffe6cc` | `#d6b656` |
| Red     | `#f8cecc` | `#b85450` |
| Purple  | `#e1d5e7` | `#9673a6` |
| Yellow  | `#fff2cc` | `#d6b656` |
| Gray    | `#f5f5f5` | `#666666` |

## Universal Primary Palette

For bolder coloring when pastel fills are too subtle. Use white text (`fontColor=#ffffff`) with these fills.

| Purpose             | Fill      | Stroke    | Text      |
| ------------------- | --------- | --------- | --------- |
| Primary / API       | `#4C78A8` | `#2E5A88` | `#ffffff` |
| Secondary / Service | `#72B7B2` | `#4A9A95` | `#ffffff` |
| Accent / Alert      | `#E45756` | `#C23B3A` | `#ffffff` |
| Storage / Data      | `#E4A847` | `#C08C35` | `#ffffff` |
| Success             | `#54A24B` | `#3D8B3D` | `#ffffff` |
| Neutral             | `#9B9B9B` | `#7B7B7B` | `#ffffff` |

## Default Text Color

Always use `fontColor=#333333` with the pastel palette. This provides good contrast on light fills and gets adapted automatically for dark mode rendering.

Use `fontColor=#ffffff` only with the primary palette fills that are dark enough to support white text.

## Colors To Avoid

- `**#ffffff` or near-white fills\*\* — disappear on light backgrounds and get forcibly darkened in dark mode
- `**#000000` or near-black fills\*\* — disappear on dark backgrounds and get inverted to near-white in dark mode
- **Named colors** (`red`, `blue`, `green`) — behavior varies across renderers; always use hex codes
- **Very saturated neon colors** — poor contrast in both modes, harsh on the eye
- **Very light tints** (`#fafafa`, `#f0f0f0` as standalone fills) — indistinguishable from background

## Dark Mode

diagramkit renders both light and dark variants by default. The Draw.io engine uses browser-side color adjustment with WCAG luminance calculations.

### How It Works

1. **White inversion** — fills matching `#ffffff` are replaced with `#2d2d2d`
2. **Black inversion** — fills matching `#000000` are replaced with `#e5e5e5`
3. **High-luminance darkening** — fills with WCAG relative luminance > 0.4 are darkened by a factor of 0.3 while preserving hue and capping saturation at 0.6
4. **WCAG contrast post-processing** — `postProcessDarkSvg()` runs after the browser-side adjustment, scanning all inline fill colors and darkening any with luminance > 0.4 to a lightness of 0.25

### WCAG Relative Luminance Formula

```
L = 0.2126 × R + 0.7152 × G + 0.0722 × B
```

Where R, G, B are linearized sRGB values:

```
Clinear = C ≤ 0.04045 ? C / 12.92 : ((C + 0.055) / 1.055) ^ 2.4
```

Colors with L > 0.4 are considered "high luminance" and are darkened in dark mode.

### What Happens To Each Palette Color

| Color     | Light Mode | Dark Mode (adjusted)                     |
| --------- | ---------- | ---------------------------------------- |
| `#dae8fc` | As-is      | Darkened (luminance ~0.82)               |
| `#d5e8d4` | As-is      | Darkened (luminance ~0.79)               |
| `#ffe6cc` | As-is      | Darkened (luminance ~0.85)               |
| `#f8cecc` | As-is      | Darkened (luminance ~0.72)               |
| `#e1d5e7` | As-is      | Darkened (luminance ~0.73)               |
| `#fff2cc` | As-is      | Darkened (luminance ~0.89)               |
| `#f5f5f5` | As-is      | Darkened (luminance ~0.91)               |
| `#4C78A8` | As-is      | Passes through (luminance ~0.15)         |
| `#72B7B2` | As-is      | May darken slightly (luminance ~0.40)    |
| `#333333` | As-is      | Adapted to lighter value for readability |

### Best Practices

- **Use the pastel palette** for fills — they're automatically adjusted
- **Use `fontColor=#333333`** — gets adapted to readable values in dark mode
- **Avoid hardcoding dark-mode colors** — let diagramkit handle the conversion
- **Test both variants** after rendering — `npx diagramkit render file.drawio` produces both `-light.svg` and `-dark.svg`
- **Use `--no-contrast`** only when you need raw unprocessed dark output (rare)
- **Stroke colors survive well** — the pastel strokes (`#6c8ebf`, `#82b366`, etc.) are mid-tone and need minimal adjustment

### WCAG Contrast Post-Processing

After the browser-side color adjustment, `postProcessDarkSvg()` applies a final pass:

1. Scans all inline `fill` color attributes in the SVG
2. Computes WCAG 2.0 relative luminance for each fill
3. Colors with luminance > 0.4 are darkened to lightness 0.25 in HSL space, preserving hue and capping saturation at 0.6
4. This ensures readable contrast on dark backgrounds without losing color identity

This two-pass approach (browser-side adjustment + WCAG post-processing) means you never need to manually manage dark mode colors in your Draw.io source files.
