# Draw.io

[Draw.io](https://www.drawio.com/) (also known as diagrams.net) is a widely used diagramming tool that produces XML-based diagram files. diagramkit includes a built-in renderer that parses the mxGraphModel XML and converts shapes and edges to SVG.

## File Extensions

| Extension | Description |
|-----------|-------------|
| `.drawio` | Standard Draw.io file extension |
| `.drawio.xml` | XML variant used by some editors |
| `.dio` | Short alias |

All three extensions are treated identically.

## Installation

No additional dependencies are needed for Draw.io support. The renderer is built into diagramkit.

```bash
npm add diagramkit
npx diagramkit warmup
```

## XML Format

Draw.io files use an XML format based on the mxGraph library:

```xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Client" style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf"
            vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Server" style="rounded=1;fillColor=#d5e8d4;strokeColor=#82b366"
            vertex="1" parent="1">
      <mxGeometry x="300" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="4" value="HTTP" style="edgeStyle=orthogonalEdgeStyle"
            edge="1" source="2" target="3" parent="1"/>
  </root>
</mxGraphModel>
```

The easiest way to create Draw.io files is with the [Draw.io editor](https://www.drawio.com/) (web or desktop app) or the VS Code extension.

## Supported Shapes

The built-in renderer supports common Draw.io shapes:

| Shape | Style Key | Description |
|-------|-----------|-------------|
| Rectangle | (default) | Standard box, supports `rounded=1` for rounded corners |
| Ellipse | `shape=ellipse` | Circle or oval |
| Rhombus | `shape=rhombus` | Diamond shape for decisions |
| Cylinder | `shape=cylinder` | Database or storage icon |

### Edge Features

- Solid and dashed lines (`dashed=1`)
- Arrow markers at edge endpoints
- Edge labels displayed at the midpoint
- Custom stroke width and colors

### Style Properties

Draw.io cell styles support these properties:

| Property | Description |
|----------|-------------|
| `fillColor` | Background color of the shape |
| `strokeColor` | Border/line color |
| `fontColor` | Text label color |
| `fontSize` | Text size in pixels |
| `strokeWidth` | Border thickness |
| `rounded` | `1` for rounded rectangle corners |
| `dashed` | `1` for dashed edges |
| `shape` | Shape type (`ellipse`, `rhombus`, `cylinder`) |

## Example

Create `flow.drawio` with a Draw.io editor, then render:

```bash
diagramkit render flow.drawio
```

Output:

```
.diagrams/
  flow-light.svg
  flow-dark.svg
```

## Dark Mode

The Draw.io renderer handles dark mode by adjusting colors during SVG generation:

- **White backgrounds** (`#ffffff`) become dark (`#2d2d2d`)
- **Black elements** (`#000000`) become light (`#e5e5e5`)
- **High-luminance colors** (luminance > 0.6) are darkened by a factor of 0.3
- **Dark colors** are preserved as-is
- **Text defaults** to `#e5e5e5` in dark mode and `#333333` in light mode
- **Stroke defaults** to `#888888` in dark mode and `#333333` in light mode

The color adjustment preserves the hue of colored shapes, so a blue node stays blue (just darker) in dark mode.

## Architecture

The Draw.io renderer operates differently from Mermaid and Excalidraw:

1. The Draw.io XML is parsed using the browser's built-in `DOMParser`
2. `mxCell` elements are extracted with their geometry and style properties
3. Cells are classified as vertices (shapes) or edges (connections)
4. SVG is generated directly: edges first (behind), then vertices (in front)
5. Arrow markers are generated as SVG `<defs>` with unique IDs per stroke color
6. The viewBox is computed from the bounding box of all vertices plus 20px padding

This approach does not use the mxGraph rendering engine. It covers the most common shapes and produces clean, readable SVGs. Complex shapes or custom plugins from Draw.io may not render with full fidelity.

::: info
The Draw.io renderer aims for readable output of common diagram patterns. For pixel-perfect Draw.io rendering, consider using the official Draw.io export tools and importing the results.
:::

## Programmatic Usage

```typescript
import { render } from 'diagramkit'
import { readFileSync } from 'fs'

const xml = readFileSync('diagram.drawio', 'utf-8')

const result = await render(xml, 'drawio', {
  format: 'svg',
  theme: 'both',
})

// result.light — Buffer containing light theme SVG
// result.dark  — Buffer containing dark theme SVG
```

## Tips for Draw.io Diagrams

1. **Use standard shapes** -- rectangles, ellipses, rhombuses, and cylinders render best
2. **Set explicit colors** -- rely on `fillColor` and `strokeColor` style properties rather than theme-dependent defaults
3. **Keep layouts simple** -- the renderer connects edges between shape centers; complex routing is simplified to straight lines
4. **Label edges** -- edge labels are placed at the midpoint with a background for readability
5. **Test both themes** -- verify that custom colors look acceptable in both light and dark output
