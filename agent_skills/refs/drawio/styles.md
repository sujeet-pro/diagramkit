# Draw.io Style Reference

Complete reference for mxGraph style properties used in `.drawio` XML files. Style strings are semicolon-separated `key=value` pairs applied to `mxCell` elements via the `style` attribute.

---

## Style String Syntax

```xml
<mxCell style="key1=value1;key2=value2;key3=value3;" .../>
```

Rules:

- Each property is a `key=value` pair separated by semicolons
- No spaces around `=` or `;`
- Boolean properties: `0` = false, `1` = true
- Colors use hex format: `#rrggbb`
- Shape names are standalone keywords (e.g., `ellipse;` or `rounded=1;`)
- Order does not matter, but convention is: shape, layout, fill, stroke, font
- A trailing semicolon is conventional but optional

```
# Good
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;

# Also valid (no trailing semicolon)
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333
```

---

## Fill Properties

| Property            | Values                           | Description                        |
| ------------------- | -------------------------------- | ---------------------------------- |
| `fillColor`         | `#rrggbb`, `none`                | Shape fill color                   |
| `gradientColor`     | `#rrggbb`, `none`                | Gradient end color (fill is start) |
| `gradientDirection` | `south`, `north`, `east`, `west` | Direction of gradient              |
| `opacity`           | 0-100                            | Overall opacity (fill + stroke)    |
| `fillOpacity`       | 0-100                            | Fill opacity only                  |

### Fill Patterns

```
# Solid fill (default)
fillColor=#dae8fc;

# No fill (transparent)
fillColor=none;

# Gradient fill
fillColor=#dae8fc;gradientColor=#ffffff;gradientDirection=south;

# Semi-transparent fill
fillColor=#dae8fc;fillOpacity=50;

# Completely transparent
fillColor=none;opacity=100;
```

### Standard Color Palette

| Purpose               | Fill      | Stroke    | Font      |
| --------------------- | --------- | --------- | --------- |
| Blue (default)        | `#dae8fc` | `#6c8ebf` | `#333333` |
| Green (success/data)  | `#d5e8d4` | `#82b366` | `#333333` |
| Orange (warning)      | `#ffe6cc` | `#d6b656` | `#333333` |
| Red (error/external)  | `#f8cecc` | `#b85450` | `#333333` |
| Purple (services)     | `#e1d5e7` | `#9673a6` | `#333333` |
| Yellow (highlight)    | `#fff2cc` | `#d6b656` | `#333333` |
| Gray (infrastructure) | `#f5f5f5` | `#666666` | `#333333` |
| Dark blue (headers)   | `#1ba1e2` | `#006EAF` | `#ffffff` |
| White                 | `#ffffff` | `#000000` | `#333333` |

These colors are designed to work with diagramkit's dark mode contrast optimization. Prefer them over custom colors.

---

## Stroke Properties

| Property        | Values                    | Description                     |
| --------------- | ------------------------- | ------------------------------- |
| `strokeColor`   | `#rrggbb`, `none`         | Border/line color               |
| `strokeWidth`   | number (1, 2, 3, ...)     | Border/line thickness in pixels |
| `dashed`        | 0, 1                      | Enable dashed stroke            |
| `dashPattern`   | `"n1 n2"` (e.g., `"5 5"`) | Dash and gap lengths            |
| `strokeOpacity` | 0-100                     | Stroke opacity only             |

### Stroke Patterns

```
# Solid stroke (default)
strokeColor=#6c8ebf;strokeWidth=2;

# Dashed stroke
strokeColor=#6c8ebf;strokeWidth=2;dashed=1;

# Custom dash pattern (long dash)
strokeColor=#6c8ebf;strokeWidth=2;dashed=1;dashPattern=10 5;

# Dotted stroke
strokeColor=#6c8ebf;strokeWidth=2;dashed=1;dashPattern=2 2;

# Dash-dot pattern
strokeColor=#6c8ebf;strokeWidth=2;dashed=1;dashPattern=8 3 2 3;

# No stroke
strokeColor=none;

# Thick stroke
strokeColor=#6c8ebf;strokeWidth=4;

# Semi-transparent stroke
strokeColor=#6c8ebf;strokeOpacity=50;
```

### Common Dash Patterns

| Name         | Pattern   | Visual          |
| ------------ | --------- | --------------- |
| Default dash | `5 5`     | `--- --- ---`   |
| Long dash    | `10 5`    | `------ ------` |
| Short dash   | `3 3`     | `-- -- -- --`   |
| Dotted       | `2 2`     | `. . . . . .`   |
| Dash-dot     | `8 3 2 3` | `---- . ----`   |
| Long gap     | `5 10`    | `---      ---`  |

---

## Font Properties

| Property                | Values                               | Description                      |
| ----------------------- | ------------------------------------ | -------------------------------- |
| `fontColor`             | `#rrggbb`                            | Text color                       |
| `fontSize`              | number (8, 10, 12, 14, 16, ...)      | Font size in pixels              |
| `fontFamily`            | font name (e.g., `Helvetica`)        | Font family                      |
| `fontStyle`             | bitmask (0-7)                        | Bold/italic/underline flags      |
| `align`                 | `left`, `center`, `right`            | Horizontal text alignment        |
| `verticalAlign`         | `top`, `middle`, `bottom`            | Vertical text alignment          |
| `whiteSpace`            | `wrap`                               | Enable text wrapping             |
| `overflow`              | `hidden`, `visible`, `fill`, `width` | Text overflow behavior           |
| `spacing`               | number                               | General padding (all sides)      |
| `spacingTop`            | number                               | Top padding                      |
| `spacingBottom`         | number                               | Bottom padding                   |
| `spacingLeft`           | number                               | Left padding                     |
| `spacingRight`          | number                               | Right padding                    |
| `labelPosition`         | `left`, `center`, `right`            | Horizontal label offset position |
| `verticalLabelPosition` | `top`, `middle`, `bottom`            | Vertical label offset position   |

### Font Style Bitmask

The `fontStyle` property uses a bitmask:

| Value | Style                       | Combination |
| ----- | --------------------------- | ----------- |
| `0`   | Normal                      |             |
| `1`   | **Bold**                    |             |
| `2`   | _Italic_                    |             |
| `3`   | **_Bold+Italic_**           | 1 + 2       |
| `4`   | Underline                   |             |
| `5`   | **Bold+Underline**          | 1 + 4       |
| `6`   | _Italic+Underline_          | 2 + 4       |
| `7`   | **_Bold+Italic+Underline_** | 1 + 2 + 4   |

### Font Examples

```
# Bold title
fontSize=16;fontStyle=1;fontColor=#333333;align=center;

# Italic subtitle
fontSize=11;fontStyle=2;fontColor=#666666;align=center;

# Left-aligned body text
fontSize=12;fontStyle=0;fontColor=#333333;align=left;whiteSpace=wrap;

# Large centered header with padding
fontSize=20;fontStyle=1;fontColor=#1e1e1e;align=center;verticalAlign=middle;spacing=10;

# Code-style text
fontFamily=Courier New;fontSize=11;fontColor=#333333;align=left;
```

### Text-Only Cells

For standalone labels, annotations, and titles:

```xml
<mxCell id="title" value="System Architecture"
        style="text;fontSize=20;fontStyle=1;align=center;fontColor=#333333;"
        vertex="1" parent="1">
  <mxGeometry x="300" y="10" width="200" height="30" as="geometry"/>
</mxCell>

<mxCell id="annotation" value="Note: Dashed lines indicate optional connections"
        style="text;fontSize=10;fontStyle=2;align=left;fontColor=#999999;"
        vertex="1" parent="1">
  <mxGeometry x="40" y="500" width="300" height="20" as="geometry"/>
</mxCell>
```

### HTML Labels

For multi-line or formatted text within a single cell, use HTML:

```xml
<mxCell id="html-label" value="&lt;b&gt;Service A&lt;/b&gt;&lt;br&gt;&lt;i&gt;v2.1.0&lt;/i&gt;"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

When using HTML in labels, add `html=1;` to the style string and HTML-escape the `value` attribute (`<` becomes `&lt;`, `>` becomes `&gt;`).

---

## Shape Properties

| Property    | Values         | Description                             |
| ----------- | -------------- | --------------------------------------- |
| `rounded`   | 0, 1           | Round corners on rectangle              |
| `arcSize`   | 0-50           | Corner radius percentage (with rounded) |
| `shape`     | shape name     | Override default shape                  |
| `aspect`    | `fixed`        | Lock aspect ratio                       |
| `perimeter` | perimeter name | Custom perimeter for connections        |
| `rotation`  | 0-360          | Rotation angle in degrees               |
| `flipH`     | 0, 1           | Flip horizontally                       |
| `flipV`     | 0, 1           | Flip vertically                         |
| `shadow`    | 0, 1           | Drop shadow                             |
| `glass`     | 0, 1           | Glass/glossy effect                     |
| `sketch`    | 0, 1           | Hand-drawn/sketch style                 |
| `comic`     | 0, 1           | Comic book style                        |

### Rounded Corner Examples

```
# Slightly rounded
rounded=1;arcSize=10;

# Very rounded (pill shape)
rounded=1;arcSize=50;

# Sharp corners
rounded=0;
```

### Glass and Shadow Effects

```
# Professional card style
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;shadow=1;

# Glass button style
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;glass=1;

# Sketch/hand-drawn style
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;sketch=1;
```

---

## Edge (Arrow/Connection) Properties

### Routing

| Property    | Values                                                                                   | Description                         |
| ----------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| `edgeStyle` | `orthogonalEdgeStyle`, `elbowEdgeStyle`, `entityRelationEdgeStyle`, `isometricEdgeStyle` | Routing algorithm                   |
| `curved`    | 0, 1                                                                                     | Curved line (when no edgeStyle)     |
| `rounded`   | 0, 1                                                                                     | Round corners on orthogonal routing |
| `jettySize` | `auto`, number                                                                           | Length of edge stub before routing  |

### Edge Style Comparison

| Style                               | Description                   | Best For                          |
| ----------------------------------- | ----------------------------- | --------------------------------- |
| `edgeStyle=orthogonalEdgeStyle`     | 90-degree elbow routing       | Architecture diagrams, flowcharts |
| `edgeStyle=elbowEdgeStyle`          | Single elbow/bend point       | Simple connections                |
| `edgeStyle=entityRelationEdgeStyle` | ER-style routing              | Database diagrams                 |
| `edgeStyle=isometricEdgeStyle`      | Isometric perspective routing | 3D-style diagrams                 |
| `curved=1` (no edgeStyle)           | Smooth bezier curve           | Organic/flowing connections       |
| (none)                              | Straight line                 | Direct connections                |

### Arrow Heads

| Property     | Values            | Description            |
| ------------ | ----------------- | ---------------------- |
| `endArrow`   | arrow type string | Target end arrowhead   |
| `startArrow` | arrow type string | Source end arrowhead   |
| `endFill`    | 0, 1              | Fill the end arrowhead |
| `startFill`  | 0, 1              | Fill the start arrow   |
| `endSize`    | number            | End arrowhead size     |
| `startSize`  | number            | Start arrowhead size   |

### Arrow Type Values

| Value         | Visual | Description                |
| ------------- | ------ | -------------------------- | ------------------------ |
| `classic`     | `-->`  | Standard filled arrow      |
| `classicThin` | `-->`  | Thinner standard arrow     |
| `block`       | `--    | >`                         | Filled block/triangle    |
| `blockThin`   | `--    | >`                         | Thinner block arrow      |
| `open`        | `-->`  | Open (unfilled) arrow      |
| `openThin`    | `-->`  | Thinner open arrow         |
| `oval`        | `--o`  | Circle endpoint            |
| `diamond`     | `--<>` | Diamond (UML composition)  |
| `diamondThin` | `--<>` | Thin diamond (aggregation) |
| `dash`        | `--    | `                          | Short perpendicular line |
| `cross`       | `--x`  | X mark                     |
| `circlePlus`  | `--+`  | Circle with plus           |
| `none`        | `---`  | No arrowhead               |

### ER Diagram Arrow Types

| Value          | Notation | Meaning      |
| -------------- | -------- | ------------ | ----------- | ----------- |
| `ERmandOne`    | `--      |              | `           | Exactly one |
| `ERmany`       | `-->>`   | Many         |
| `ERoneToMany`  | `--      |              | >>`         | One to many |
| `ERzeroToMany` | `--o>>`  | Zero to many |
| `ERzeroToOne`  | `--o     | `            | Zero to one |

### Edge Examples

```xml
<!-- Standard arrow with orthogonal routing -->
<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;endArrow=classic;"
        edge="1" source="a" target="b" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>

<!-- Bidirectional arrow -->
<mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;startArrow=classic;endArrow=classic;"
        edge="1" source="a" target="b" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>

<!-- Dashed dependency arrow -->
<mxCell id="e3" style="edgeStyle=orthogonalEdgeStyle;dashed=1;endArrow=open;endFill=0;"
        edge="1" source="a" target="b" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>

<!-- UML composition (filled diamond) -->
<mxCell id="e4" style="endArrow=diamond;endFill=1;startArrow=none;"
        edge="1" source="a" target="b" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>

<!-- UML aggregation (open diamond) -->
<mxCell id="e5" style="endArrow=diamondThin;endFill=0;startArrow=none;"
        edge="1" source="a" target="b" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>

<!-- Curved connection -->
<mxCell id="e6" style="curved=1;endArrow=classic;"
        edge="1" source="a" target="b" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>

<!-- ER relationship (one-to-many) -->
<mxCell id="e7" style="edgeStyle=entityRelationEdgeStyle;startArrow=ERmandOne;endArrow=ERoneToMany;startFill=0;endFill=0;"
        edge="1" source="a" target="b" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

---

## Container Styling

| Property      | Values                       | Description                             |
| ------------- | ---------------------------- | --------------------------------------- |
| `swimlane`    | (key presence)               | Marks cell as a container               |
| `startSize`   | number (20-40)               | Height of the title/header bar          |
| `collapsible` | 0, 1                         | Allow collapse in interactive editors   |
| `container`   | 0, 1                         | Non-swimlane container (no title bar)   |
| `childLayout` | `stackLayout`, `tableLayout` | Auto-layout for children                |
| `horizontal`  | 0, 1                         | Swimlane orientation (0=vertical title) |

### Container Style Patterns

```
# Standard container with title bar
swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;

# Dashed boundary (zone, VPC, namespace)
swimlane;startSize=25;fillColor=none;strokeColor=#666666;dashed=1;fontStyle=1;

# Colored container header
swimlane;startSize=30;fillColor=#1ba1e2;strokeColor=#006EAF;fontColor=#ffffff;fontStyle=1;

# Non-collapsible container
swimlane;startSize=30;collapsible=0;fillColor=#f5f5f5;strokeColor=#666666;

# Horizontal swimlane (title on left side)
swimlane;horizontal=0;startSize=30;fillColor=#e1d5e7;strokeColor=#9673a6;
```

---

## Dark Mode Considerations

diagramkit renders both light and dark variants automatically. The dark mode post-processor adjusts colors with high luminance. Follow these guidelines for best results.

### Colors That Work Well in Both Modes

Use the standard color palette from the Fill Properties section. These colors have been tested with diagramkit's `postProcessDarkSvg()` contrast optimization.

### Colors to Avoid

| Problem               | Why                                                   |
| --------------------- | ----------------------------------------------------- |
| Very light fills      | Close to `#ffffff`, lose distinction when darkened    |
| Very dark fills       | Close to `#000000`, may become invisible on dark bg   |
| Pure white background | Fine for shapes (gets inverted), but avoid for groups |
| Neon/fluorescent      | Produce harsh results after luminance adjustment      |
| Very light stroke     | May disappear against dark background                 |

### Recommended Approach

```
# GOOD -- mid-tone fill, darker stroke, dark font
fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;

# GOOD -- transparent container with colored border
fillColor=none;strokeColor=#6c8ebf;fontColor=#333333;

# BAD -- white fill loses contrast in dark mode
fillColor=#ffffff;strokeColor=#cccccc;fontColor=#333333;

# BAD -- very dark fill invisible on dark backgrounds
fillColor=#1a1a1a;strokeColor=#333333;fontColor=#ffffff;
```

### Font Colors

Use `fontColor=#333333` as the default. diagramkit will adjust text colors for dark mode readability. Avoid:

- `fontColor=#000000` (too harsh)
- `fontColor=#ffffff` (only works on dark fills, invisible on light)
- Very light font colors on light fills (low contrast in light mode)

---

## Complete Style Reference by Element Type

### Vertices (Shapes)

```
# Minimal
rounded=1;whiteSpace=wrap;

# Standard
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;

# Full featured
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontColor=#333333;
fontSize=12;fontStyle=1;align=center;verticalAlign=middle;shadow=0;
strokeWidth=2;arcSize=10;
```

### Edges (Connections)

```
# Minimal
edgeStyle=orthogonalEdgeStyle;

# Standard
edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#666666;

# Full featured
edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#666666;strokeWidth=2;
endArrow=classic;startArrow=none;endFill=1;fontSize=11;fontColor=#333333;
```

### Containers

```
# Minimal
swimlane;startSize=30;

# Standard
swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;

# Full featured
swimlane;startSize=30;fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;
fontColor=#333333;fontSize=14;align=left;spacingLeft=10;collapsible=0;
```

### Text Labels

```
# Title
text;fontSize=20;fontStyle=1;align=center;fontColor=#333333;

# Annotation
text;fontSize=10;fontStyle=2;align=left;fontColor=#999999;

# Badge/tag
text;fontSize=9;fontStyle=1;align=center;fontColor=#ffffff;
fillColor=#333333;rounded=1;arcSize=50;spacing=4;
```

---

## Style Composition Patterns

### Combining Styles

Build complex styles by combining property groups:

```
# Shape base:
rounded=1;whiteSpace=wrap;

# + Color:
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;

# + Typography:
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;fontStyle=1;fontColor=#333333;

# + Border:
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;fontStyle=1;fontColor=#333333;strokeWidth=2;

# + Effects:
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;fontStyle=1;fontColor=#333333;strokeWidth=2;shadow=1;
```

### Semantic Style Templates

Reusable style patterns for common diagram elements:

```
# Primary service
rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;

# Secondary service
rounded=1;whiteSpace=wrap;fillColor=#e1d5e7;strokeColor=#9673a6;

# Database
shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;

# Cache / ephemeral store
shape=cylinder3;whiteSpace=wrap;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#ffe6cc;strokeColor=#d6b656;

# External system
rounded=1;whiteSpace=wrap;fillColor=#f8cecc;strokeColor=#b85450;dashed=1;

# Queue / message broker
rounded=1;whiteSpace=wrap;fillColor=#fff2cc;strokeColor=#d6b656;

# Container boundary
swimlane;startSize=25;fillColor=none;strokeColor=#666666;dashed=1;fontStyle=1;

# Standard connection
edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#666666;

# Optional/async connection
edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#666666;dashed=1;

# Data flow label
edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#666666;fontSize=10;fontColor=#666666;
```
