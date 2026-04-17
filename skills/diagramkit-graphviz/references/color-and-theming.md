# Graphviz Color and Theming Reference

## Pastel Palette

Default palette for Graphviz diagrams. These mid-tone colors work well in both light and dark modes.

| Purpose | Fill (`fillcolor`) | Stroke (`color`) |
| ------- | ------------------ | ---------------- |
| Blue    | `#dae8fc`          | `#6c8ebf`        |
| Green   | `#d5e8d4`          | `#82b366`        |
| Orange  | `#ffe6cc`          | `#d6b656`        |
| Red     | `#f8cecc`          | `#b85450`        |
| Purple  | `#e1d5e7`          | `#9673a6`        |
| Yellow  | `#fff2cc`          | `#d6b656`        |
| Gray    | `#f5f5f5`          | `#666666`        |

Usage in DOT:

```dot
node [style="rounded,filled"];
api [fillcolor="#dae8fc", color="#6c8ebf", label="API Server"];
db  [fillcolor="#d5e8d4", color="#82b366", label="Database"];
cache [fillcolor="#ffe6cc", color="#d6b656", label="Cache"];
```

## Universal Primary Palette

For bolder coloring when pastel fills are too subtle. Use white text (`fontcolor="#ffffff"`) with these fills.

| Purpose             | Fill      | Stroke    | Text      |
| ------------------- | --------- | --------- | --------- |
| Primary / API       | `#4C78A8` | `#2E5A88` | `#ffffff` |
| Secondary / Service | `#72B7B2` | `#4A9A95` | `#ffffff` |
| Accent / Alert      | `#E45756` | `#C23B3A` | `#ffffff` |
| Storage / Data      | `#E4A847` | `#C08C35` | `#ffffff` |
| Success             | `#54A24B` | `#3D8B3D` | `#ffffff` |
| Neutral             | `#9B9B9B` | `#7B7B7B` | `#ffffff` |

Usage in DOT:

```dot
api [fillcolor="#4C78A8", color="#2E5A88", fontcolor="#ffffff", label="API"];
alert [fillcolor="#E45756", color="#C23B3A", fontcolor="#ffffff", label="Alert"];
```

## Default Text Color

Use `fontcolor="#333333"` as the default text color in the node and edge defaults:

```dot
node [fontcolor="#333333"];
edge [fontcolor="#666666"];
```

This provides good contrast on pastel fills in light mode and gets adapted automatically for dark mode rendering.

Use `fontcolor="#ffffff"` only with the primary palette fills that are dark enough to support white text.

## Colors To Avoid

- `**#ffffff` or near-white fills\*\* — disappear on light backgrounds and get forcibly darkened in dark mode
- `**#000000` or near-black fills\*\* — disappear on dark backgrounds and get inverted in dark mode
- **Named colors** (`red`, `blue`, `green`, `lightblue`) — behavior varies across renderers; always use hex codes
- **Very saturated neon colors** — poor contrast in both modes
- **Very light or very dark fills** — poor contrast in one or both modes

## Dark Mode

diagramkit renders both light and dark variants by default. The Graphviz engine uses a two-step process for dark mode.

### Step 1 — WCAG Contrast Post-Processing (runs first)

`postProcessDarkSvg()` scans all inline color attributes in the rendered SVG:

1. Computes WCAG 2.0 relative luminance for each fill color
2. Colors with luminance > 0.4 are darkened to lightness 0.25 in HSL space
3. Hue is preserved, saturation is capped at 0.6
4. This ensures readable contrast on dark backgrounds

### Step 2 — Dark Adaptation (runs second)

After WCAG processing, Graphviz-specific dark adaptations are applied:

| Original                | Dark Mode Replacement | Purpose                    |
| ----------------------- | --------------------- | -------------------------- |
| Black strokes `#000000` | `#94a3b8`             | Visible borders on dark bg |
| Black text `#000000`    | `#e5e7eb`             | Readable text on dark bg   |
| Black fills `#000000`   | `#94a3b8`             | Visible shapes on dark bg  |

**Important:** WCAG contrast runs **before** dark adaptation. This order matters because:

- Pastel fills (high luminance) get darkened first by WCAG processing
- Then black elements get lightened by dark adaptation
- The result is a balanced dark diagram without manual color management

### WCAG Relative Luminance Formula

```
L = 0.2126 × R + 0.7152 × G + 0.0722 × B
```

Where R, G, B are linearized sRGB values:

```
Clinear = C ≤ 0.04045 ? C / 12.92 : ((C + 0.055) / 1.055) ^ 2.4
```

Colors with L > 0.4 are considered "high luminance" and are darkened.

### What Happens To Each Palette Color

| Color     | Luminance | Dark Mode Action                   |
| --------- | --------- | ---------------------------------- |
| `#dae8fc` | ~0.82     | Darkened by WCAG (high luminance)  |
| `#d5e8d4` | ~0.79     | Darkened by WCAG (high luminance)  |
| `#ffe6cc` | ~0.85     | Darkened by WCAG (high luminance)  |
| `#f8cecc` | ~0.72     | Darkened by WCAG (high luminance)  |
| `#e1d5e7` | ~0.73     | Darkened by WCAG (high luminance)  |
| `#fff2cc` | ~0.89     | Darkened by WCAG (high luminance)  |
| `#f5f5f5` | ~0.91     | Darkened by WCAG (high luminance)  |
| `#4C78A8` | ~0.15     | Passes through (low luminance)     |
| `#72B7B2` | ~0.40     | Borderline — may darken slightly   |
| `#333333` | ~0.03     | Passes through WCAG, no dark adapt |
| `#000000` | 0.00      | Adapted to `#94a3b8` / `#e5e7eb`   |
| `#666666` | ~0.13     | Passes through (low luminance)     |

### Best Practices

- **Use `bgcolor="transparent"`** — let diagramkit control the background
- **Use `fontcolor="#333333"`** — gets adapted automatically for dark mode
- **Avoid very light fills** — they get heavily darkened, losing visual distinction
- **Avoid very dark fills** — they disappear on dark backgrounds
- **Use the pastel palette** — colors are distinct enough to survive darkening
- **Test both variants** — render and inspect both `-light.svg` and `-dark.svg`
- **Use `--no-contrast`** only when you need raw unprocessed dark output
- **Don't hardcode dark-mode colors** — let diagramkit handle the conversion automatically
