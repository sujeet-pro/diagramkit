# Excalidraw Element Reference

Comprehensive reference for all Excalidraw element types, properties, arrow routing, bindings, label linking, grouping, and layout planning.

## Required element properties

Every element in the `elements` array must include all properties listed below. Missing properties cause rendering failures or visual artifacts.

### Rectangle

```json
{
  "id": "unique-semantic-id",
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 80,
  "angle": 0,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 3 },
  "seed": 1,
  "version": 1,
  "versionNonce": 1,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false
}
```

Property notes:

- `roundness: { "type": 3 }` gives rounded corners. Use `null` for sharp corners.
- `fillStyle`: `"solid"`, `"hachure"`, `"cross-hatch"`, or `"dots"`. Prefer `"solid"` for clarity.
- `roughness`: `0` = clean lines, `1` = hand-drawn (default), `2` = very rough. Use `1` for the standard Excalidraw look.
- `boundElements`: set to an array when this shape has labels or connected arrows. Set to `null` when the shape has no bindings.
- `seed`: any positive integer. Used for consistent hand-drawn rendering. Use unique values per element.

### Ellipse

Same properties as rectangle, with `"type": "ellipse"`. Roundness is ignored for ellipses.

```json
{
  "id": "user-circle",
  "type": "ellipse",
  "x": 100,
  "y": 100,
  "width": 100,
  "height": 100,
  "angle": 0,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 2 },
  "seed": 2,
  "version": 1,
  "versionNonce": 2,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false
}
```

### Text

Text elements are either standalone or contained within a shape (via `containerId`).

```json
{
  "id": "api-box-text",
  "type": "text",
  "x": 105,
  "y": 125,
  "width": 190,
  "height": 25,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": null,
  "seed": 3,
  "version": 1,
  "versionNonce": 3,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false,
  "text": "API Server",
  "fontSize": 20,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "api-box",
  "originalText": "API Server",
  "autoResize": true,
  "lineHeight": 1.25
}
```

Text-specific properties:

- `fontSize`: default `20`. Use `16` for secondary labels, `24` for titles.
- `fontFamily`: `1` = Virgil (hand-drawn), `2` = Helvetica, `3` = Cascadia (monospace), `5` = Excalidraw default. Prefer `5`.
- `textAlign`: `"left"`, `"center"`, or `"right"`.
- `verticalAlign`: `"top"`, `"middle"`, or `"bottom"`.
- `containerId`: the `id` of the parent shape when this text is a label. Set to `null` for standalone text.
- `originalText`: must match `text`. Used for undo history.
- `autoResize`: `true` for contained text so it resizes with its container.
- `lineHeight`: `1.25` is the default.

### Arrow

```json
{
  "id": "api-to-db-arrow",
  "type": "arrow",
  "x": 200,
  "y": 180,
  "width": 0,
  "height": 120,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 2 },
  "seed": 4,
  "version": 1,
  "versionNonce": 4,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1,
  "link": null,
  "locked": false,
  "points": [
    [0, 0],
    [0, 120]
  ],
  "lastCommittedPoint": null,
  "startBinding": {
    "elementId": "api-box",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 1]
  },
  "endBinding": {
    "elementId": "db-box",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 0]
  },
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "elbowed": false
}
```

Arrow-specific properties:

- `points`: array of `[dx, dy]` offsets from the arrow's `x, y` origin. First point is always `[0, 0]`.
- `width` and `height`: MUST equal the bounding box of the `points` array. If points span 200px horizontally and 120px vertically, set `width: 200, height: 120`.
- `startBinding` / `endBinding`: links the arrow to shapes. See Arrow bindings below.
- `startArrowhead`: `null` (no arrowhead), `"arrow"`, `"bar"`, `"dot"`, `"triangle"`.
- `endArrowhead`: same options. Default is `"arrow"`.
- `elbowed`: `true` for orthogonal (right-angle) routing. See Elbow arrows below.

### Line

Same as arrow but with `"type": "line"`. Lines have no arrowheads and no bindings.

```json
{
  "id": "divider-line",
  "type": "line",
  "x": 50,
  "y": 300,
  "width": 900,
  "height": 0,
  "points": [
    [0, 0],
    [900, 0]
  ],
  "strokeColor": "#495057",
  "strokeStyle": "dashed",
  "roughness": 0
}
```

## Arrow routing patterns

Arrow `points` arrays define the path from start to end. All coordinates are relative to the arrow's `x, y` position.

| Pattern      | Points                            | Use case                              |
| ------------ | --------------------------------- | ------------------------------------- |
| Down         | `[[0,0], [0,h]]`                  | Vertical connection below             |
| Up           | `[[0,0], [0,-h]]`                 | Vertical connection above             |
| Right        | `[[0,0], [w,0]]`                  | Horizontal connection right           |
| Left         | `[[0,0], [-w,0]]`                 | Horizontal connection left            |
| L-left-down  | `[[0,0], [-w,0], [-w,h]]`         | Go left then down                     |
| L-right-down | `[[0,0], [w,0], [w,h]]`           | Go right then down                    |
| L-down-right | `[[0,0], [0,h], [w,h]]`           | Go down then right                    |
| L-down-left  | `[[0,0], [0,h], [-w,h]]`          | Go down then left                     |
| S-shape      | `[[0,0], [0,h1], [w,h1], [w,h2]]` | Vertical offset to reach distant node |

For all patterns, `w` and `h` (or `h1`, `h2`) are the actual pixel distances. Compute them from the source and target shape positions.

### Elbow arrows

For clean orthogonal routing, set all three properties:

```json
{
  "type": "arrow",
  "roughness": 0,
  "roundness": null,
  "elbowed": true
}
```

Elbow arrows automatically route with right angles. The `points` array should contain only the start and end points — the routing engine computes intermediate bends.

## Arrow bindings

Bindings anchor an arrow to a shape so the arrow follows the shape if it moves.

### startBinding / endBinding

```json
{
  "startBinding": {
    "elementId": "source-shape-id",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 1]
  },
  "endBinding": {
    "elementId": "target-shape-id",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 0]
  }
}
```

Properties:

- `elementId`: the `id` of the shape this arrow end is attached to.
- `focus`: horizontal offset within the binding. `0` = centered, negative = left, positive = right. Keep at `0` for most diagrams.
- `gap`: pixel gap between arrow tip and shape edge. Use `1`.
- `fixedPoint`: `[x, y]` normalized coordinates on the shape where the arrow attaches. See fixed points below.

### Fixed points reference

Fixed points use normalized coordinates where `[0, 0]` is the top-left corner and `[1, 1]` is the bottom-right corner of the shape.

| Anchor | fixedPoint |
| ------ | ---------- |
| Top    | `[0.5, 0]` |
| Bottom | `[0.5, 1]` |
| Left   | `[0, 0.5]` |
| Right  | `[1, 0.5]` |

For non-centered connections:

| Position          | fixedPoint  |
| ----------------- | ----------- |
| Top-left quarter  | `[0.25, 0]` |
| Top-right quarter | `[0.75, 0]` |
| Left upper third  | `[0, 0.33]` |
| Left lower third  | `[0, 0.67]` |

### Bidirectional binding

When an arrow connects two shapes, both shapes must list the arrow in their `boundElements`:

```json
{
  "id": "api-box",
  "type": "rectangle",
  "boundElements": [
    { "type": "text", "id": "api-box-text" },
    { "type": "arrow", "id": "api-to-db-arrow" }
  ]
}
```

```json
{
  "id": "db-box",
  "type": "rectangle",
  "boundElements": [
    { "type": "text", "id": "db-box-text" },
    { "type": "arrow", "id": "api-to-db-arrow" }
  ]
}
```

The arrow's `startBinding.elementId` and `endBinding.elementId` must match the `id` values of the shapes that list the arrow in their `boundElements`.

## Label linking pattern

Every labeled shape requires two elements with a bidirectional link.

### Shape → Text (boundElements)

The shape's `boundElements` array must include a reference to the text element:

```json
{
  "id": "auth-service",
  "type": "rectangle",
  "x": 300,
  "y": 200,
  "width": 180,
  "height": 80,
  "boundElements": [{ "type": "text", "id": "auth-service-text" }]
}
```

### Text → Shape (containerId)

The text element's `containerId` must point back to the shape:

```json
{
  "id": "auth-service-text",
  "type": "text",
  "containerId": "auth-service",
  "text": "Auth Service",
  "originalText": "Auth Service",
  "textAlign": "center",
  "verticalAlign": "middle",
  "autoResize": true
}
```

### Text positioning formulas

Given a shape at position `(sx, sy)` with size `(sw, sh)` and a text element with height `th`:

| Property     | Formula              |
| ------------ | -------------------- |
| `text.x`     | `sx + 5`             |
| `text.y`     | `sy + (sh - th) / 2` |
| `text.width` | `sw - 10`            |

For `fontSize: 20` with `lineHeight: 1.25`, a single line of text has `height ≈ 25`.

### Combined label example

Complete shape + text pair:

```json
[
  {
    "id": "web-app",
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 180,
    "height": 80,
    "angle": 0,
    "strokeColor": "#1971c2",
    "backgroundColor": "#a5d8ff",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 1,
    "opacity": 100,
    "groupIds": [],
    "frameId": null,
    "roundness": { "type": 3 },
    "seed": 100,
    "version": 1,
    "versionNonce": 100,
    "isDeleted": false,
    "boundElements": [{ "type": "text", "id": "web-app-text" }],
    "updated": 1,
    "link": null,
    "locked": false
  },
  {
    "id": "web-app-text",
    "type": "text",
    "x": 105,
    "y": 127,
    "width": 170,
    "height": 25,
    "angle": 0,
    "strokeColor": "#1e1e1e",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 1,
    "opacity": 100,
    "groupIds": [],
    "frameId": null,
    "roundness": null,
    "seed": 101,
    "version": 1,
    "versionNonce": 101,
    "isDeleted": false,
    "boundElements": null,
    "updated": 1,
    "link": null,
    "locked": false,
    "text": "Web App",
    "fontSize": 20,
    "fontFamily": 5,
    "textAlign": "center",
    "verticalAlign": "middle",
    "containerId": "web-app",
    "originalText": "Web App",
    "autoResize": true,
    "lineHeight": 1.25
  }
]
```

## Grouping with dashed rectangles

Use dashed, transparent rectangles to visually group related components:

```json
{
  "id": "group-data-layer",
  "type": "rectangle",
  "x": 80,
  "y": 180,
  "width": 440,
  "height": 300,
  "strokeColor": "#2f9e44",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "dashed",
  "roughness": 0,
  "roundness": null,
  "opacity": 100,
  "boundElements": [{ "type": "text", "id": "group-data-layer-text" }]
}
```

Rules for grouping rectangles:

- `backgroundColor: "transparent"` so contained elements are visible
- `strokeStyle: "dashed"` to distinguish from component shapes
- `roughness: 0` for clean dashed lines
- `roundness: null` for sharp corners (visually distinct from component shapes)
- Position the group rectangle behind its contents by placing it earlier in the `elements` array
- Add a label using the standard boundElements/containerId pattern
- Use `verticalAlign: "top"` for group labels so they appear at the top edge

## Layout planning grids

### Vertical flow (layered architecture)

Standard positions for a 3-column layered layout:

| Row   | y position | Purpose        |
| ----- | ---------- | -------------- |
| Row 1 | 100        | Client / UI    |
| Row 2 | 250        | API / Gateway  |
| Row 3 | 400        | Services       |
| Row 4 | 550        | Data / Storage |

| Column   | x position |
| -------- | ---------- |
| Column 1 | 100        |
| Column 2 | 300        |
| Column 3 | 500        |
| Column 4 | 700        |
| Column 5 | 900        |

Element dimensions: `width: 180, height: 80`. Spacing between rows: 120 (row height 80 + gap 40 + arrow space 50 ≈ 150 row pitch).

### Horizontal flow (pipeline)

| Stage   | x position |
| ------- | ---------- |
| Stage 1 | 100        |
| Stage 2 | 350        |
| Stage 3 | 600        |
| Stage 4 | 850        |
| Stage 5 | 1100       |

Common y: 200. Element dimensions: `width: 200, height: 80`. Horizontal spacing: 250 (width 200 + gap 50).

### Hub-and-spoke

Center hub at `(500, 350)` with dimensions `width: 200, height: 100`.

Spoke positions (8 directions, radius ≈ 280):

| Direction | x   | y   |
| --------- | --- | --- |
| N         | 500 | 50  |
| NE        | 700 | 120 |
| E         | 800 | 350 |
| SE        | 700 | 580 |
| S         | 500 | 650 |
| SW        | 300 | 580 |
| W         | 200 | 350 |
| NW        | 300 | 120 |

Spoke dimensions: `width: 160, height: 70`.

## Validation checklist

Run through this checklist before rendering:

- **Valid JSON** — the file parses without errors
- **Required top-level fields** — `type`, `version`, `source`, `elements`, `appState`, `files` all present
- **No duplicate IDs** — every element `id` is unique
- **Labels linked** — every shape with text has `boundElements` referencing the text element, and the text has `containerId` pointing back
- **Text positioned** — label text `x`, `y`, `width` follow the positioning formulas
- **Arrow bindings correct** — `startBinding.elementId` and `endBinding.elementId` match shapes that list the arrow in their `boundElements`
- **Arrow width/height** — match the bounding box of the `points` array
- **Elbow arrows complete** — all three properties set: `roughness: 0`, `roundness: null`, `elbowed: true`
- **No diamond shapes** — use rectangles instead
- **Hex colors only** — no named colors
- **Semantic IDs** — descriptive names, not `a`, `n1`, or hashes
- **All required properties present** — every element has all properties listed in the type templates above
