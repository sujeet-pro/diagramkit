# Excalidraw Color and Theming Reference

Color palettes, dark mode handling, WCAG contrast optimization, and grouping visual patterns for Excalidraw diagrams rendered with diagramkit.

## Excalidraw-specific color palette

These colors are tuned for Excalidraw's rendering engine and survive both light and dark mode after diagramkit's WCAG contrast post-processing.

| Component          | Background | Stroke    |
| ------------------ | ---------- | --------- |
| Frontend / UI      | `#a5d8ff`  | `#1971c2` |
| Backend / API      | `#d0bfff`  | `#7048e8` |
| Database           | `#b2f2bb`  | `#2f9e44` |
| Storage            | `#ffec99`  | `#f08c00` |
| AI / ML            | `#e599f7`  | `#9c36b5` |
| External API       | `#ffc9c9`  | `#e03131` |
| Orchestration      | `#ffa8a8`  | `#c92a2a` |
| Network / Security | `#dee2e6`  | `#495057` |

Usage:

- `backgroundColor` on the shape element gets the Background column value
- `strokeColor` on the shape element gets the Stroke column value
- Text inside shapes uses `strokeColor: "#1e1e1e"` (near-black for light mode readability; dark mode contrast optimizer adjusts automatically)

## Universal primary palette

These colors work across all four diagramkit engines (Mermaid, Excalidraw, Draw.io, Graphviz):

| Purpose             | Fill      | Stroke    | Text      |
| ------------------- | --------- | --------- | --------- |
| Primary / API       | `#4C78A8` | `#2E5A88` | `#ffffff` |
| Secondary / Service | `#72B7B2` | `#4A9A95` | `#ffffff` |
| Accent / Alert      | `#E45756` | `#C23B3A` | `#ffffff` |
| Storage / Data      | `#E4A847` | `#C08C35` | `#ffffff` |
| Success             | `#54A24B` | `#3D8B3D` | `#ffffff` |
| Neutral             | `#9B9B9B` | `#7B7B7B` | `#ffffff` |

Use the universal palette when diagrams must look consistent with Mermaid or other engine outputs in the same document. The Excalidraw-specific palette above is preferred for standalone Excalidraw diagrams.

## Pastel palette

Lighter fills for softer visual weight:

| Purpose | Fill      | Stroke    |
| ------- | --------- | --------- |
| Blue    | `#dae8fc` | `#6c8ebf` |
| Green   | `#d5e8d4` | `#82b366` |
| Orange  | `#ffe6cc` | `#d6b656` |
| Red     | `#f8cecc` | `#b85450` |
| Purple  | `#e1d5e7` | `#9673a6` |
| Yellow  | `#fff2cc` | `#d6b656` |
| Gray    | `#f5f5f5` | `#666666` |

Pastel fills have higher luminance and will be darkened more aggressively by the WCAG contrast optimizer in dark mode. This is expected behavior — the hue is preserved but lightness is reduced.

## Colors to avoid

| Color            | Reason                                                 |
| ---------------- | ------------------------------------------------------ |
| `#ffffff`        | Disappears on light backgrounds                        |
| Near-white fills | Invisible in light mode, heavily darkened in dark      |
| `#000000`        | Disappears on dark backgrounds                         |
| Near-black fills | Invisible in dark mode                                 |
| Named colors     | `red`, `blue`, etc. — behavior varies across renderers |
| Saturated neons  | Poor contrast ratio in both modes                      |
| Very light grays | `#f9f9f9`, `#fafafa` — too close to white background   |

Rule of thumb: use mid-tone fills (luminance between 0.15 and 0.7). These survive both light and dark rendering without extreme adjustment.

## Dark mode

### How diagramkit handles Excalidraw dark mode

Excalidraw has native dark mode support via the `exportWithDarkMode` flag. diagramkit uses this flag automatically when rendering the dark theme variant.

| Property             | Light mode | Dark mode |
| -------------------- | ---------- | --------- |
| Background color     | `#ffffff`  | `#111111` |
| `exportWithDarkMode` | `false`    | `true`    |

Excalidraw's dark mode inverts the canvas background and adjusts element rendering. The source `.excalidraw` file is the same for both variants — diagramkit passes the dark mode flag at render time.

### WCAG contrast post-processing

After Excalidraw renders the dark SVG, diagramkit applies `postProcessDarkSvg()` to ensure readability:

1. Scans all inline `fill` color attributes in the SVG
2. Computes WCAG 2.0 relative luminance for each fill
3. Colors with luminance > 0.4 are darkened:

- Lightness is reduced to 0.25
- Hue is preserved
- Saturation is capped at 0.6

4. This ensures sufficient contrast against the `#111111` dark background

The contrast optimizer is enabled by default. Disable it with `--no-contrast` if you need raw Excalidraw dark output (rare).

### What this means for color selection

- Mid-tone fills (`#a5d8ff`, `#d0bfff`, `#b2f2bb`) work well — they're readable in light mode and get appropriately darkened for dark mode
- Very light fills (`#f5f5f5`, `#ffffff`) will be aggressively darkened, which may change their visual character
- Stroke colors and text colors are also adjusted — use medium-darkness strokes for best results
- The Excalidraw-specific palette in this document is pre-tuned for this behavior

### Source file considerations

Do NOT add dark mode styling to the `.excalidraw` source file. The source file should always use light-mode colors. diagramkit handles:

- Dark mode canvas background via `exportWithDarkMode`
- Color adjustment via WCAG post-processing
- Separate output files for each theme (`-light.svg` and `-dark.svg`)

## Grouping visual patterns

### Dashed rectangles for logical groups

Use transparent dashed rectangles to group related components:

```json
{
  "id": "group-backend",
  "type": "rectangle",
  "strokeColor": "#7048e8",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "dashed",
  "roughness": 0,
  "roundness": null
}
```

Key properties:

- `backgroundColor: "transparent"` — contained elements remain visible
- `strokeStyle: "dashed"` — visually distinct from component shapes
- `roughness: 0` — clean dashed lines (hand-drawn roughness makes dashes look messy)
- `roundness: null` — sharp corners distinguish groups from rounded component shapes

### Group label positioning

Add a label to the group rectangle using the standard boundElements/containerId pattern, but with `verticalAlign: "top"` so the label sits at the top edge:

```json
{
  "id": "group-backend-text",
  "type": "text",
  "containerId": "group-backend",
  "text": "Backend Services",
  "originalText": "Backend Services",
  "textAlign": "center",
  "verticalAlign": "top",
  "fontSize": 16
}
```

### Z-ordering

Elements earlier in the `elements` array render behind later elements. Place group rectangles before the components they contain:

```
elements: [
  group rectangle,      ← renders first (behind)
  group label text,
  component 1,          ← renders on top
  component 1 text,
  component 2,
  component 2 text,
  arrows                ← render last (on top of everything)
]
```

### Color coding groups

Use stroke colors from the palette to indicate group type:

| Group type     | Stroke color | Meaning              |
| -------------- | ------------ | -------------------- |
| Frontend layer | `#1971c2`    | UI / client zone     |
| Backend layer  | `#7048e8`    | API / service zone   |
| Data layer     | `#2f9e44`    | Database / storage   |
| External       | `#e03131`    | Third-party services |
| Infrastructure | `#495057`    | Network / platform   |

### Nested groups

For complex architectures, groups can be nested. Ensure the outer group rectangle comes first in the `elements` array, followed by inner group rectangles, then components:

```
elements: [
  outer group rectangle,
  outer group label,
  inner group 1 rectangle,
  inner group 1 label,
  components in inner group 1...,
  inner group 2 rectangle,
  inner group 2 label,
  components in inner group 2...,
  arrows...
]
```

Size the outer group to contain all inner groups with 20–40px padding on each side.
