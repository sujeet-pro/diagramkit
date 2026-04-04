---
title: Draw.io
description: Render Draw.io XML diagrams with automatic light/dark theme color adjustments.
---

# Draw.io

[Draw.io](https://www.drawio.com/) (diagrams.net) produces XML-based diagram files. diagramkit includes a built-in renderer that parses mxGraphModel XML and converts shapes and edges to SVG.

## File Extensions

`.drawio`, `.drawio.xml`, `.dio` -- all treated identically.

## Quick Start

Create a diagram with the [Draw.io editor](https://www.drawio.com/) (web, desktop, or VS Code extension), then render:

```bash
diagramkit render flow.drawio
```

Output:

```
.diagrams/
  flow-light.svg
  flow-dark.svg
```

## XML Format

Draw.io files use mxGraph XML:

```xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Client"
            style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf"
            vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Server"
            style="rounded=1;fillColor=#d5e8d4;strokeColor=#82b366"
            vertex="1" parent="1">
      <mxGeometry x="300" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="4" value="HTTP" style="edgeStyle=orthogonalEdgeStyle"
            edge="1" source="2" target="3" parent="1"/>
  </root>
</mxGraphModel>
```

## Supported Shapes

| Shape | Style Key | Description |
|:------|:----------|:------------|
| Rectangle | (default) | Standard box, `rounded=1` for rounded corners |
| Ellipse | `shape=ellipse` | Circle or oval |
| Rhombus | `shape=rhombus` | Diamond for decisions |
| Cylinder | `shape=cylinder` | Database/storage icon |

### Edges

- Solid and dashed lines (`dashed=1`)
- Arrow markers at endpoints
- Labels at the midpoint
- Custom stroke width and colors

### Style Properties

| Property | Description |
|:---------|:------------|
| `fillColor` | Background color |
| `strokeColor` | Border/line color |
| `fontColor` | Text label color |
| `fontSize` | Text size in pixels |
| `strokeWidth` | Border thickness |
| `rounded` | `1` for rounded corners |
| `dashed` | `1` for dashed edges |
| `shape` | `ellipse`, `rhombus`, `cylinder` |

## Dark Mode

The renderer adjusts colors during SVG generation:

- White backgrounds (`#ffffff`) become dark (`#2d2d2d`)
- Black elements (`#000000`) become light (`#e5e5e5`)
- High-luminance colors (luminance > 0.6) are darkened by a factor of 0.3
- Hue is preserved -- a blue node stays blue, just darker

> [!NOTE]
> The `--no-contrast` flag applies to Mermaid and Graphviz only. Draw.io handles dark mode color adjustments in its own renderer.

## Programmatic Usage

```ts
import { render } from 'diagramkit'
import { readFileSync } from 'fs'

const xml = readFileSync('diagram.drawio', 'utf-8')
const result = await render(xml, 'drawio', { format: 'svg', theme: 'both' })
```

## How It Works

1. Draw.io XML is parsed using the browser's `DOMParser`
2. `mxCell` elements are extracted with geometry and style
3. Cells are classified as vertices (shapes) or edges (connections)
4. SVG is generated: edges first (behind), then vertices
5. Arrow markers are generated as `<defs>` with unique IDs
6. ViewBox is computed from bounding box + 20px padding

This does not use the mxGraph engine. It covers common shapes and produces clean SVGs.

> [!NOTE]
> The renderer targets readable output of common diagram patterns. Complex shapes or custom Draw.io plugins may not render with full fidelity.

## Tips

1. **Use standard shapes** -- rectangles, ellipses, rhombuses, and cylinders render best
2. **Set explicit colors** -- rely on `fillColor` and `strokeColor` rather than theme defaults
3. **Keep layouts simple** -- complex routing is simplified to straight lines
4. **Label edges** -- labels are placed at midpoints with a background
5. **Test both themes** -- verify custom colors work in both light and dark output
